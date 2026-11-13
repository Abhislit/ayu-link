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


RFID_PATIENTS = [
    ("D6A3F706", "Ananya Sharma", 34, "F", "B+", "Asthma", "Sulfa drugs",
     "4821 7730 9156", "9876501234", "22 Lake View Road, Bengaluru", "Rohit Sharma · 9876501299",
     "Moderate persistent asthma, on inhalers.", "Budesonide-formoterol inhaler"),
    ("B408F806", "Vikram Nair", 47, "M", "O-", "Type 2 diabetes", "None recorded",
     "7391 0458 2266", "9820445511", "14 Marine Drive, Kochi", "Latha Nair · 9820445522",
     "Type 2 diabetes on oral therapy, HbA1c 7.8%.", "Metformin 500mg"),
    ("6221965D", "Priya Desai", 29, "F", "A+", "Migraine", "Ibuprofen",
     "5610 8234 7790", "9765332210", "7 Ashram Road, Ahmedabad", "Mehul Desai · 9765332211",
     "Recurrent migraine with aura, no structural cause.", "Sumatriptan as needed"),
    ("F33D1407", "Arjun Reddy", 62, "M", "AB+", "Coronary artery disease", "Aspirin",
     "9033 4871 2645", "9948112233", "3 Jubilee Hills, Hyderabad", "Sneha Reddy · 9948112244",
     "CAD with stent to LAD in 2022, stable angina.", "Atorvastatin 20mg, Clopidogrel 75mg"),
    ("6D18FD06", "Kavya Iyer", 41, "F", "B-", "Hypothyroidism", "Shellfish",
     "6172 9058 4431", "9880556677", "9 T Nagar, Chennai", "Ramesh Iyer · 9880556688",
     "Primary hypothyroidism, well controlled.", "Levothyroxine 75mcg"),
    ("9CDBFE04", "Imran Sheikh", 55, "M", "O+", "COPD", "Dust, pollen",
     "8451 2367 9002", "9930224455", "21 Bandra West, Mumbai", "Farah Sheikh · 9930224466",
     "COPD GOLD II, former smoker.", "Tiotropium inhaler"),
    ("19B52A07", "Neha Gupta", 26, "F", "A-", "None recorded", "Penicillin",
     "4720 9831 5564", "9811778899", "5 Civil Lines, Delhi", "Anil Gupta · 9811778800",
     "No known chronic illness.", "None"),
    ("D4A6FC04", "Sanjay Patil", 38, "M", "B+", "Hypertension", "None recorded",
     "3297 8456 1200", "9890112244", "18 FC Road, Pune", "Meena Patil · 9890112255",
     "Stage 1 hypertension, lifestyle managed.", "Telmisartan 40mg"),
    ("2B022B07", "Ritu Banerjee", 50, "F", "AB-", "Rheumatoid arthritis", "NSAIDs",
     "6984 5201 3377", "9831667788", "11 Salt Lake, Kolkata", "Sourav Banerjee · 9831667799",
     "Seropositive RA on disease-modifying therapy.", "Methotrexate weekly"),
    ("03F52B07", "Manoj Verma", 44, "M", "O+", "Chronic kidney disease", "Contrast dye",
     "5183 4072 9961", "9415223311", "27 MG Road, Jaipur", "Sunita Verma · 9415223322",
     "CKD stage 3, under nephrology follow-up.", "Sodium bicarbonate"),
]


def seed_rfid_patients(db: Session) -> None:
    if db.query(RfidCard).filter(RfidCard.uid == RFID_PATIENTS[0][0]).count():
        return
    for uid, name, age, sex, blood, conditions, allergies, aadhaar, phone, address, contact, summary, meds in RFID_PATIENTS:
        patient = Patient(
            name=name, age=age, sex=sex, blood_group=blood, conditions=conditions,
            allergies=allergies, aadhaar=aadhaar, phone=phone, address=address,
            emergency_contact=contact,
        )
        db.add(patient)
        db.flush()
        db.add(MedicalRecord(patient_id=patient.id, summary=summary, medications=meds))
        reversed_uid = "".join(reversed([uid[i:i + 2] for i in range(0, len(uid), 2)]))
        db.add_all([
            RfidCard(uid=uid, patient_id=patient.id),
            RfidCard(uid=reversed_uid, patient_id=patient.id),
        ])
    db.commit()
