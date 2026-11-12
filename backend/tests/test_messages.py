DEVICE_KEY = {"X-Device-Key": "dev-device-key-1"}


def login(client, email, password="ayu12345"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['token']}"}


def make_case(client, hospital_id=None):
    case_id = client.post("/api/rfid/scans", json={"uid": "CARD-1001"}, headers=DEVICE_KEY).json()[
        "case"
    ]["id"]
    if hospital_id is not None:
        res = client.post(
            f"/api/cases/{case_id}/hospital",
            json={"hospital_id": hospital_id},
            headers=login(client, "driver@ayu.test"),
        )
        assert res.status_code == 200
    return case_id


def test_text_message_persisted_and_listed(client):
    case_id = make_case(client)
    res = client.post(
        f"/api/cases/{case_id}/messages",
        json={"text": "Patient conscious, BP 140/90."},
        headers=login(client, "driver@ayu.test"),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["kind"] == "text"
    assert body["sender_role"] == "ambulance_driver"
    assert body["ack_status"] == "sent"

    listed = client.get(f"/api/cases/{case_id}/messages", headers=login(client, "driver@ayu.test"))
    assert listed.status_code == 200
    texts = [m["text"] for m in listed.json()]
    assert "Patient conscious, BP 140/90." in texts
    ids = [m["id"] for m in listed.json()]
    assert ids == sorted(ids)


def test_empty_text_rejected(client):
    case_id = make_case(client)
    res = client.post(
        f"/api/cases/{case_id}/messages",
        json={"text": "   "},
        headers=login(client, "driver@ayu.test"),
    )
    assert res.status_code == 400


def test_assistant_reply_is_allergy_aware_and_disclaims_diagnosis(client):
    case_id = make_case(client)
    client.post(
        f"/api/cases/{case_id}/messages",
        json={"text": "Road accident, heavy bleeding from the leg."},
        headers=login(client, "driver@ayu.test"),
    )
    listed = client.get(f"/api/cases/{case_id}/messages", headers=login(client, "driver@ayu.test"))
    replies = [m for m in listed.json() if m["sender_role"] == "assistant"]
    assert len(replies) == 1
    text = replies[0]["text"].lower()
    assert "penicillin" in text
    assert "not a diagnosis" in text


def test_hospital_acknowledge_flips_messages_and_case(client):
    case_id = make_case(client, hospital_id=1)
    client.post(
        f"/api/cases/{case_id}/messages",
        json={"text": "Arriving in 6 minutes."},
        headers=login(client, "driver@ayu.test"),
    )
    headers = login(client, "hospital@ayu.test")

    res = client.post(f"/api/cases/{case_id}/acknowledge", headers=headers)
    assert res.status_code == 200

    messages = client.get(f"/api/cases/{case_id}/messages", headers=headers).json()
    assert messages
    ambulance_messages = [m for m in messages if m["sender_role"] == "ambulance_driver"]
    assert ambulance_messages
    assert all(m["ack_status"] == "acknowledged" for m in ambulance_messages)

    case = client.get(f"/api/cases/{case_id}", headers=headers).json()["case"]
    assert case["status"] == "acknowledged"
    assert case["acknowledged_at"] is not None


def test_driver_cannot_acknowledge(client):
    case_id = make_case(client, hospital_id=1)
    res = client.post(f"/api/cases/{case_id}/acknowledge", headers=login(client, "driver@ayu.test"))
    assert res.status_code == 403


def test_invalid_prep_status_rejected(client):
    case_id = make_case(client, hospital_id=1)
    res = client.patch(
        f"/api/cases/{case_id}/prep-status",
        json={"status": "banana"},
        headers=login(client, "hospital@ayu.test"),
    )
    assert res.status_code == 422


def test_prep_status_updated(client):
    case_id = make_case(client, hospital_id=1)
    res = client.patch(
        f"/api/cases/{case_id}/prep-status",
        json={"status": "preparing"},
        headers=login(client, "hospital@ayu.test"),
    )
    assert res.status_code == 200
    assert res.json()["prep_status"] == "preparing"


def test_hospital_message_read_marks_ambulance_update_delivered(client):
    case_id = make_case(client, hospital_id=1)
    driver_headers = login(client, "driver@ayu.test")
    client.post(
        f"/api/cases/{case_id}/messages",
        json={"text": "Patient is stable."},
        headers=driver_headers,
    )

    messages = client.get(
        f"/api/cases/{case_id}/messages",
        headers=login(client, "hospital@ayu.test"),
    ).json()
    patient_update = next(m for m in messages if m["text"] == "Patient is stable.")
    assert patient_update["ack_status"] == "delivered"
    assert patient_update["delivered_at"] is not None
    assert patient_update["sender_name"] == "Driver One"


def test_doctor_cannot_send_case_messages_or_update_preparation(client):
    case_id = make_case(client, hospital_id=1)
    doctor_headers = login(client, "doctor@ayu.test")
    message = client.post(
        f"/api/cases/{case_id}/messages",
        json={"text": "Doctor reply"},
        headers=doctor_headers,
    )
    prep = client.patch(
        f"/api/cases/{case_id}/prep-status",
        json={"status": "ready"},
        headers=doctor_headers,
    )
    assert message.status_code == 403
    assert prep.status_code == 403
