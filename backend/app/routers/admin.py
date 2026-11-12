from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ambulance, EmergencyCase, Hospital, Patient, User
from app.security import require_roles
from app.serializers import ambulance_public, hospital_public

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_only = require_roles("admin")


@router.get("/overview")
def overview(db: Session = Depends(get_db), user=Depends(admin_only)):
    return {
        "users": db.query(User).count(),
        "hospitals": db.query(Hospital).count(),
        "ambulances": db.query(Ambulance).count(),
        "patients": db.query(Patient).count(),
        "cases": db.query(EmergencyCase).count(),
    }


@router.get("/users")
def list_users(db: Session = Depends(get_db), user=Depends(admin_only)):
    return [
        {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "role": row.role,
            "hospital_id": row.hospital_id,
            "ambulance_id": row.ambulance_id,
            "is_active": row.is_active,
        }
        for row in db.query(User).order_by(User.id)
    ]


@router.get("/hospitals")
def list_hospitals(db: Session = Depends(get_db), user=Depends(admin_only)):
    return [hospital_public(row) for row in db.query(Hospital).order_by(Hospital.id)]


@router.get("/ambulances")
def list_ambulances(db: Session = Depends(get_db), user=Depends(admin_only)):
    return [ambulance_public(row) for row in db.query(Ambulance).order_by(Ambulance.id)]


@router.get("/patients")
def list_patients(db: Session = Depends(get_db), user=Depends(admin_only)):
    return [
        {
            "id": row.id,
            "name": row.name,
            "age": row.age,
            "sex": row.sex,
            "blood_group": row.blood_group,
        }
        for row in db.query(Patient).order_by(Patient.id)
    ]
