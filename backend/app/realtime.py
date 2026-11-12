import asyncio

import jwt
import socketio

from app.access import AMBULANCE_ROLES, HOSPITAL_ROLES
from app.config import CORS_ORIGINS, SECRET
from app.database import SessionLocal
from app.models import User
from app.serializers import case_public, message_public

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=CORS_ORIGINS)

_loop: asyncio.AbstractEventLoop | None = None


def room_for_case(case_id: int) -> str:
    return f"case:{case_id}"


def room_for_hospital(hospital_id: int) -> str:
    return f"hospital:{hospital_id}"


def room_for_ambulance(ambulance_id: int) -> str:
    return f"ambulance:{ambulance_id}"


def _rooms(case) -> list[str]:
    rooms = [room_for_ambulance(case.ambulance_id), room_for_case(case.id)]
    if case.hospital_id is not None:
        rooms.append(room_for_hospital(case.hospital_id))
    return rooms


# ponytail: emit blocks the calling worker thread until delivery; make it
# fire-and-forget if emit throughput ever matters.
def _dispatch(event: str, payload: dict, rooms: list[str]) -> None:
    async def send():
        await sio.emit(event, payload, room=rooms)

    try:
        running = asyncio.get_running_loop()
    except RuntimeError:
        running = None
    if running is not None:
        running.create_task(send())
    elif _loop is not None and _loop.is_running():
        asyncio.run_coroutine_threadsafe(send(), _loop).result(timeout=5)
    else:
        asyncio.run(send())


@sio.event
async def connect(sid, environ, auth):
    token = (auth or {}).get("token")
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise socketio.exceptions.ConnectionRefusedError("Invalid token")
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if not user or not user.is_active:
            raise socketio.exceptions.ConnectionRefusedError("Invalid token")
        if user.role in AMBULANCE_ROLES and user.ambulance_id:
            await sio.enter_room(sid, room_for_ambulance(user.ambulance_id))
        if user.role in HOSPITAL_ROLES and user.hospital_id:
            await sio.enter_room(sid, room_for_hospital(user.hospital_id))
    return True


def emit_case(event: str, case, extra: dict | None = None) -> None:
    _dispatch(event, {"case": case_public(case), **(extra or {})}, _rooms(case))


def emit_message(event: str, case, message) -> None:
    payload = {"case": case_public(case), "message": message_public(message)}
    _dispatch(event, payload, _rooms(case))
