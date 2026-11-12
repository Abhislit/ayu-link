from sqlalchemy.orm import Session

from app.models import Ambulance, Hospital, MedicalRecord, Patient, RfidCard, User
from app.security import hash_password


def seed_demo(db: Session) -> None:
    if db.query(User).count():
        return

    city = Hospital(name="City General", address="12 Ring Road", phone="555-0100")
    mary = Hospital(name="St. Mary", address="88 Hill Street", phone="555-0200")
    db.add_all([city, mary])
    db.flush()

    amb1 = Ambulance(vehicle_number="AMB-01", device_key="dev-device-key-1", hospital_id=city.id)
    amb2 = Ambulance(vehicle_number="AMB-02", device_key="dev-device-key-2", hospital_id=mary.id)
    db.add_all([amb1, amb2])
    db.flush()

    patient = Patient(
        name="Ravi Kumar",
        age=54,
        sex="M",
        blood_group="O+",
        conditions="Hypertension",
        allergies="Penicillin",
    )
    db.add(patient)
    db.flush()
    db.add(
        MedicalRecord(
            patient_id=patient.id,
            summary="Known hypertensive on amlodipine. Previous angioplasty 2021.",
            medications="Amlodipine 5mg",
        )
    )
    db.add(RfidCard(uid="CARD-1001", patient_id=patient.id))

    db.add_all(
        [
            User(
                name="Admin",
                email="admin@ayu.test",
                password_hash=hash_password("ayu12345"),
                role="admin",
            ),
            User(
                name="Driver One",
                email="driver@ayu.test",
                password_hash=hash_password("ayu12345"),
                role="ambulance_driver",
                ambulance_id=amb1.id,
            ),
            User(
                name="Ambulance Staff",
                email="staff@ayu.test",
                password_hash=hash_password("ayu12345"),
                role="ambulance_staff",
                ambulance_id=amb1.id,
            ),
            User(
                name="City ER",
                email="hospital@ayu.test",
                password_hash=hash_password("ayu12345"),
                role="hospital_staff",
                hospital_id=city.id,
            ),
            User(
                name="Dr. Meera",
                email="doctor@ayu.test",
                password_hash=hash_password("ayu12345"),
                role="doctor",
                hospital_id=city.id,
            ),
        ]
    )
    db.commit()
