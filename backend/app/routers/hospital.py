from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.access import HOSPITAL_ROLES
from app.database import get_db
from app.models import EmergencyCase
from app.security import require_roles
from app.serializers import case_public, patient_public

router = APIRouter(prefix="/api", tags=["hospital"])


def hospital_case_list(db: Session, user) -> list[dict]:
    rows = (
        db.query(EmergencyCase)
        .filter(EmergencyCase.hospital_id == user.hospital_id)
        .order_by(EmergencyCase.created_at.desc(), EmergencyCase.id.desc())
        .all()
    )
    return [{**case_public(case), "patient": patient_public(case.patient)} for case in rows]


@router.get("/hospital/cases")
def list_hospital_cases(
    db: Session = Depends(get_db),
    user=Depends(require_roles(*HOSPITAL_ROLES)),
):
    return hospital_case_list(db, user)
