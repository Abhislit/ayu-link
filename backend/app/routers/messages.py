from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access import AMBULANCE_ROLES, HOSPITAL_ROLES, get_case_for_user
from app.database import get_db
from app.models import CaseEvent, EmergencyCase, Message, User, now
from app.realtime import emit_case, emit_message
from app.security import get_current_user, require_roles
from app.serializers import case_public, message_public

router = APIRouter(prefix="/api/cases", tags=["messages"])

DISCLAIMER = "This is not a diagnosis and does not replace professional medical judgment."

CHECKLISTS = {
    "trauma": [
        "Control bleeding with firm direct pressure and keep the patient still.",
        "Check airway, breathing and circulation every few minutes.",
        "Note the time of injury and any loss of consciousness.",
    ],
    "cardiac": [
        "Keep the patient seated and calm; avoid exertion.",
        "Monitor pulse, blood pressure and oxygen saturation if available.",
        "Ask about onset time and current medications.",
    ],
    "respiratory": [
        "Sit the patient upright and keep the airway clear.",
        "Monitor breathing rate and oxygen saturation continuously.",
        "Ask when the breathlessness started and whether it is worsening.",
    ],
    "obstetric": [
        "Note contraction frequency, duration and any fluid loss.",
        "Check for bleeding and keep the patient lying on her left side.",
        "Record the gestational age if known.",
    ],
    "unknown": [
        "Record vital signs: pulse, blood pressure, breathing rate and temperature.",
        "Ask about the main complaint, onset time and current medications.",
        "Keep monitoring and update the hospital as the picture changes.",
    ],
}

COMPLAINT_WORDS = {
    "trauma": ("accident", "bleed", "fracture", "wound", "injury", "fall", "burn"),
    "cardiac": ("chest", "heart", "cardiac", "palpitation"),
    "respiratory": ("breath", "asthma", "breathing", "oxygen", "cough"),
    "obstetric": ("pregnan", "contraction", "labour", "labor", "obstetric"),
}


class TextBody(BaseModel):
    text: str


class PrepBody(BaseModel):
    status: Literal["pending", "requested", "preparing", "ready"]


def checklist_for(text: str) -> list[str]:
    lowered = text.lower()
    for name, words in COMPLAINT_WORDS.items():
        if any(word in lowered for word in words):
            return CHECKLISTS[name]
    return CHECKLISTS["unknown"]


def respond_to_message(db: Session, case: EmergencyCase, text: str) -> Message:
    patient = case.patient
    parts = [f"Emergency Assistant: noted for {patient.name}."]
    if patient.allergies.strip():
        parts.append(f"Allergy alert: {patient.allergies.strip()}. Avoid these medicines.")
    if patient.conditions.strip():
        parts.append(f"Known conditions: {patient.conditions.strip()}.")
    parts.append("Suggested next steps:")
    parts.extend(f"- {step}" for step in checklist_for(text))
    parts.append(DISCLAIMER)
    reply = Message(
        case_id=case.id,
        sender_id=None,
        sender_role="assistant",
        kind="text",
        text="\n".join(parts),
        ack_status="sent",
    )
    db.add(reply)
    return reply


def has_assistant_reply(db: Session, case_id: int) -> bool:
    return (
        db.scalars(
            select(Message.id).where(Message.case_id == case_id, Message.sender_role == "assistant")
        ).first()
        is not None
    )


@router.post("/{case_id}/messages")
def post_message(
    case_id: int,
    body: TextBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = get_case_for_user(db, case_id, user)
    if user.role == "doctor":
        raise HTTPException(status_code=403, detail="Doctors have read-only case access")
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message text is required")
    ask_assistant = user.role in AMBULANCE_ROLES and not has_assistant_reply(db, case.id)
    message = Message(
        case_id=case.id,
        sender_id=user.id,
        sender_role=user.role,
        kind="text",
        text=text,
        ack_status="sent",
    )
    db.add(message)
    db.flush()
    reply = None
    if ask_assistant:
        reply = respond_to_message(db, case, text)
        db.flush()
    db.commit()
    db.refresh(message)
    emit_message("message:new", case, message)
    if reply is not None:
        db.refresh(reply)
        emit_message("message:new", case, reply)
    return message_public(message)


@router.get("/{case_id}/messages")
def list_messages(
    case_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = get_case_for_user(db, case_id, user)
    messages = db.scalars(
        select(Message)
        .where(Message.case_id == case.id)
        .order_by(Message.created_at, Message.id)
    ).all()
    if user.role == "hospital_staff":
        recipient_roles = AMBULANCE_ROLES
    elif user.role in AMBULANCE_ROLES:
        recipient_roles = ("hospital_staff",)
    else:
        recipient_roles = ()
    delivered = []
    if recipient_roles:
        timestamp = now()
        for message in messages:
            if message.sender_role in recipient_roles and message.ack_status == "sent":
                message.ack_status = "delivered"
                message.delivered_at = timestamp
                delivered.append(message)
        if delivered:
            db.add(
                CaseEvent(
                    case_id=case.id,
                    kind="messages_delivered",
                    detail=f"{len(delivered)} message(s) delivered to {user.role}",
                    actor_id=user.id,
                )
            )
            db.commit()
            for message in delivered:
                emit_message("message:delivered", case, message)
    return [message_public(m) for m in messages]


@router.post("/{case_id}/acknowledge")
def acknowledge(
    case_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*HOSPITAL_ROLES)),
):
    case = get_case_for_user(db, case_id, user)
    pending = db.scalars(
        select(Message).where(
            Message.case_id == case.id,
            Message.sender_role.in_(AMBULANCE_ROLES),
            Message.ack_status != "acknowledged",
        )
    ).all()
    for message in pending:
        message.ack_status = "acknowledged"
    case.status = "acknowledged"
    case.acknowledged_at = now()
    case.acknowledged_by_id = user.id
    db.add(CaseEvent(case_id=case.id, kind="acknowledged", detail="Hospital acknowledged case", actor_id=user.id))
    db.flush()
    for message in pending:
        emit_message("message:ack", case, message)
    emit_case("case:acknowledged", case)
    db.commit()
    db.refresh(case)
    return case_public(case)


@router.patch("/{case_id}/prep-status")
def update_prep_status(
    case_id: int,
    body: PrepBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("hospital_staff")),
):
    case = get_case_for_user(db, case_id, user)
    case.prep_status = body.status
    db.add(CaseEvent(case_id=case.id, kind="prep_status", detail=body.status, actor_id=user.id))
    db.flush()
    emit_case("prep:updated", case)
    db.commit()
    db.refresh(case)
    return case_public(case)
