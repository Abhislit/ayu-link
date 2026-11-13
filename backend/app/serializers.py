from app.models import Ambulance, EmergencyCase, Hospital, MedicalRecord, Message, Patient


def timestamp(value):
    return value.isoformat() if value else None


def ambulance_public(ambulance: Ambulance | None) -> dict | None:
    if ambulance is None:
        return None
    return {
        "id": ambulance.id,
        "vehicle_number": ambulance.vehicle_number,
        "hospital_id": ambulance.hospital_id,
    }


def hospital_public(hospital: Hospital | None) -> dict | None:
    if hospital is None:
        return None
    return {
        "id": hospital.id,
        "name": hospital.name,
        "address": hospital.address,
        "phone": hospital.phone,
    }


def patient_public(patient: Patient) -> dict:
    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "sex": patient.sex,
        "blood_group": patient.blood_group,
        "conditions": patient.conditions,
        "allergies": patient.allergies,
        "aadhaar": patient.aadhaar,
        "phone": patient.phone,
        "address": patient.address,
        "emergency_contact": patient.emergency_contact,
    }


def record_public(record: MedicalRecord | None) -> dict | None:
    if record is None:
        return None
    return {
        "id": record.id,
        "summary": record.summary,
        "medications": record.medications,
        "notes": record.notes,
        "created_at": timestamp(record.created_at),
    }


def case_public(case: EmergencyCase) -> dict:
    return {
        "id": case.id,
        "patient_id": case.patient_id,
        "ambulance_id": case.ambulance_id,
        "hospital_id": case.hospital_id,
        "priority": case.priority,
        "emergency_category": getattr(case, "emergency_category", "unknown"),
        "status": case.status,
        "ambulance_status": getattr(case, "ambulance_status", "en_route"),
        "prep_status": case.prep_status,
        "created_at": timestamp(case.created_at),
        "acknowledged_at": timestamp(case.acknowledged_at),
    }


def message_public(message: Message) -> dict:
    sender = getattr(message, "sender", None)
    return {
        "id": message.id,
        "case_id": message.case_id,
        "sender_id": message.sender_id,
        "sender_role": message.sender_role,
        "sender_name": sender.name if sender else (
            "AYU-LINK Emergency Assistant"
            if message.sender_role == "assistant"
            else message.sender_role.replace("_", " ").title()
        ),
        "kind": message.kind,
        "text": message.text,
        "duration_seconds": message.duration_seconds,
        "ack_status": message.ack_status,
        "delivered_at": timestamp(getattr(message, "delivered_at", None)),
        "created_at": timestamp(message.created_at),
    }
