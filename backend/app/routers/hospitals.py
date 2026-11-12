from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Hospital
from app.security import require_roles
from app.serializers import hospital_public

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


@router.get("")
def list_hospitals(
    db: Session = Depends(get_db),
    user=Depends(require_roles("ambulance_driver", "ambulance_staff")),
):
    hospitals = db.query(Hospital).filter(Hospital.is_active.is_(True)).order_by(Hospital.name)
    return [hospital_public(hospital) for hospital in hospitals]
