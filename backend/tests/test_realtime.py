import asyncio
import json
from types import SimpleNamespace

import pytest
import socketio

import app.realtime as realtime


def token_for(email):
    from app.database import SessionLocal
    from app.models import User
    from app.security import create_token

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).one()
        return create_token(user)


def case(**overrides):
    data = dict(
        id=1,
        patient_id=1,
        ambulance_id=1,
        hospital_id=1,
        priority="high",
        status="open",
        prep_status="pending",
        created_at=None,
        acknowledged_at=None,
    )
    data.update(overrides)
    return SimpleNamespace(**data)


def message(**overrides):
    data = dict(
        id=7,
        case_id=1,
        sender_id=1,
        sender_role="ambulance_driver",
        kind="text",
        text="Arriving in 5 minutes.",
        duration_seconds=None,
        ack_status="sent",
        created_at=None,
    )
    data.update(overrides)
    return SimpleNamespace(**data)


def test_room_names():
    assert realtime.room_for_case(5) == "case:5"
    assert realtime.room_for_hospital(2) == "hospital:2"
    assert realtime.room_for_ambulance(1) == "ambulance:1"


def test_connect_rejects_bad_token(client):
    with pytest.raises(socketio.exceptions.ConnectionRefusedError):
        asyncio.run(realtime.connect(None, {}, {"token": "not-a-jwt"}))


@pytest.mark.parametrize(
    "email,expected",
    [
        ("driver@ayu.test", ["ambulance:1"]),
        ("hospital@ayu.test", ["hospital:1"]),
        ("doctor@ayu.test", ["hospital:1"]),
        ("admin@ayu.test", []),
    ],
)
def test_connect_joins_role_rooms(client, monkeypatch, email, expected):
    joined = []

    async def fake_enter_room(sid, room, namespace=None):
        joined.append(room)

    monkeypatch.setattr(realtime.sio, "enter_room", fake_enter_room)

    asyncio.run(realtime.connect("sid-1", {}, {"token": token_for(email)}))

    assert joined == expected


def test_emit_case_records_event_payload_and_rooms(client, monkeypatch):
    recorded = []

    async def fake_emit(event, data=None, room=None, **kwargs):
        recorded.append((event, data, room))

    monkeypatch.setattr(realtime.sio, "emit", fake_emit)

    realtime.emit_case("case:updated", case())

    assert len(recorded) == 1
    event, data, rooms = recorded[0]
    assert event == "case:updated"
    assert data["case"]["id"] == 1
    assert set(rooms) == {"ambulance:1", "hospital:1", "case:1"}
    json.dumps(data)


def test_emit_case_passes_extra_payload(client, monkeypatch):
    recorded = []

    async def fake_emit(event, data=None, room=None, **kwargs):
        recorded.append(data)

    monkeypatch.setattr(realtime.sio, "emit", fake_emit)

    realtime.emit_case("case:created", case(), extra={"patient": {"name": "Ravi Kumar"}})

    assert recorded[0]["patient"]["name"] == "Ravi Kumar"


def test_emit_case_without_hospital_skips_hospital_room(client, monkeypatch):
    recorded = []

    async def fake_emit(event, data=None, room=None, **kwargs):
        recorded.append(room)

    monkeypatch.setattr(realtime.sio, "emit", fake_emit)

    realtime.emit_case("case:updated", case(hospital_id=None))

    assert set(recorded[0]) == {"ambulance:1", "case:1"}


def test_emit_message_records_message_payload(client, monkeypatch):
    recorded = []

    async def fake_emit(event, data=None, room=None, **kwargs):
        recorded.append((event, data, room))

    monkeypatch.setattr(realtime.sio, "emit", fake_emit)

    realtime.emit_message("message:new", case(), message())

    event, data, rooms = recorded[0]
    assert event == "message:new"
    assert data["message"]["id"] == 7
    assert data["case"]["id"] == 1
    assert set(rooms) == {"ambulance:1", "hospital:1", "case:1"}
