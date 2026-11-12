import asyncio
from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app import realtime
from app.config import CORS_ORIGINS, ENV
from app.database import Base, SessionLocal, engine
from app.routers import admin, auth, cases, doctor, hospital, hospitals, messages, rfid, voice
from app.seed import seed_demo


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    case_columns = {
        column["name"] for column in inspect(engine).get_columns("emergency_cases")
    }
    if "ambulance_status" not in case_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE emergency_cases ADD COLUMN ambulance_status "
                    "VARCHAR(24) NOT NULL DEFAULT 'en_route'"
                )
            )
    if "emergency_category" not in case_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE emergency_cases ADD COLUMN emergency_category "
                    "VARCHAR(24) NOT NULL DEFAULT 'unknown'"
                )
            )
    if ENV == "dev":
        with SessionLocal() as db:
            seed_demo(db)
    realtime._loop = asyncio.get_running_loop()
    try:
        yield
    finally:
        realtime._loop = None


app = FastAPI(title="AYU-LINK API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(rfid.router)
app.include_router(hospitals.router)
app.include_router(cases.router)
app.include_router(messages.router)
app.include_router(voice.router)
app.include_router(hospital.router)
app.include_router(doctor.router)
app.include_router(admin.router)

# socketio_path=None: the mount already strips "/socket.io", so route the
# remaining scope to Socket.IO and let it dispatch on the Engine.IO query.
app.mount("/socket.io", socketio.ASGIApp(realtime.sio, socketio_path=None))


@app.get("/api/health")
def health():
    return {"status": "ok"}
