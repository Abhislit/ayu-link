from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access import AMBULANCE_ROLES, get_case_for_user
from app.config import STORAGE_DIR
from app.database import get_db
from app.media import MAX_AUDIO_BYTES, normalize_mime, validate_audio
from app.models import Message, User
from app.realtime import emit_message
from app.security import get_current_user
from app.serializers import message_public

router = APIRouter(prefix="/api/cases", tags=["voice"])


@router.post("/{case_id}/messages/voice")
async def upload_voice(
    case_id: int,
    file: UploadFile = File(...),
    duration_seconds: int = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = get_case_for_user(db, case_id, user)
    if user.role not in AMBULANCE_ROLES and user.role != "hospital_staff":
        raise HTTPException(status_code=403, detail="Doctors have read-only case access")
    data = await file.read(MAX_AUDIO_BYTES + 1)
    ext = validate_audio(file.content_type, len(data), duration_seconds)

    relative = Path("cases") / str(case.id) / f"{uuid4().hex}{ext}"
    target = STORAGE_DIR / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)

    message = Message(
        case_id=case.id,
        sender_id=user.id,
        sender_role=user.role,
        kind="voice",
        text="",
        audio_path=relative.as_posix(),
        audio_mime=normalize_mime(file.content_type),
        duration_seconds=duration_seconds,
        ack_status="sent",
    )
    db.add(message)
    db.flush()
    emit_message("message:new", case, message)
    db.commit()
    db.refresh(message)
    return message_public(message)


@router.get("/{case_id}/messages/{message_id}/audio")
def get_voice_audio(
    case_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    case = get_case_for_user(db, case_id, user)
    message = db.scalars(
        select(Message).where(Message.id == message_id, Message.case_id == case.id)
    ).first()
    if message is None or not message.audio_path:
        raise HTTPException(status_code=404, detail="Audio not found")
    path = STORAGE_DIR / message.audio_path
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(path, media_type=message.audio_mime or "application/octet-stream")
