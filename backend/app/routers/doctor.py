from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.access import HOSPITAL_ROLES
from app.database import get_db
from app.routers.hospital import hospital_case_list
from app.security import require_roles

router = APIRouter(prefix="/api", tags=["doctor"])


@router.get("/doctor/cases")
def list_doctor_cases(
    db: Session = Depends(get_db),
    user=Depends(require_roles(*HOSPITAL_ROLES)),
):
    return hospital_case_list(db, user)
