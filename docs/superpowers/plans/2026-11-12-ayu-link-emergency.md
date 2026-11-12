# AYU-LINK Emergency Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working prototype where an RFID scan opens a patient case, the ambulance chats with an Emergency Assistant and uploads voice notes, and the selected hospital receives, plays, and acknowledges them in real time.

**Architecture:** FastAPI/SQLite backend enforcing all access; React SPA for ambulance, hospital, doctor, admin; Socket.IO rooms for live updates; ESP32 sketch for card UID input.

**Tech Stack:** Python 3.14, FastAPI, SQLAlchemy 2, python-socketio, PyJWT, pytest, httpx; React 19, Vite 7, Tailwind 4, socket.io-client; Arduino ESP32 + MFRC522.

**Spec:** `docs/superpowers/specs/2026-11-12-ayu-link-emergency-design.md`

## Global Constraints

- Roles: `admin | ambulance_driver | ambulance_staff | hospital_staff | doctor`.
- Audio: allowlist `audio/webm, audio/ogg, audio/mp4, audio/wav`, max 10 MB, max 120 s, stored outside static web root, served only by authenticated endpoint.
- RFID cards store UID only; device auth via `X-Device-Key` with `secrets.compare_digest`.
- Passwords: stdlib PBKDF2-HMAC-SHA256, 200k iterations, per-user salt; JWT HS256 12 h.
- Every case/message/audio read re-checks role and hospital/ambulance ownership.
- No diagnosis: assistant replies include a "not a diagnosis / clinical judgment" sentence.
- Timestamps: UTC ISO 8601; messages append-only.

## Review Focus

- Stranger's UID is scanned → 404, no case, no patient leak.
- Hospital B opens Hospital A's case or audio → 403/404, never data.
- Upload with `audio/x-ms-wma` or 11 MB or 121 s → 415/413/400 before disk write.
- Unauthenticated audio URL → 401; authenticated but wrong hospital → 403.
- Recorder denial / no mic → UI explains and offers text fallback, no crash.

---

### Task 1: Backend foundation

**Files:** `backend/requirements.txt`, `backend/app/{__init__,config,database,models,main}.py`, `backend/tests/conftest.py`, `backend/tests/test_health.py`, `.gitignore`, `README.md`

**Interfaces:**
- Produces: `app.config.settings` (env: `AYU_DB_URL`, `AYU_SECRET`, `AYU_ENV`, `AYU_STORAGE_DIR`, `AYU_CORS_ORIGIN`), `app.database.Base`, `SessionLocal`, `get_db()`, all ORM models per spec, `app` FastAPI instance.
- `GET /api/health -> {"status":"ok"}`.

- [ ] Write `test_health.py` asserting 200 and body; write `conftest.py` with file-SQLite fixture and `TestClient`.
- [ ] Run `pytest -q`; expect import failure.
- [ ] Create requirements, config, engine/models, `main.py` with CORS + health; `pip install -r requirements.txt`.
- [ ] Run `pytest -q`; expect pass. Commit.

### Task 2: Auth, roles, seed

**Files:** `backend/app/{security,seed}.py`, `backend/app/routers/auth.py`, `backend/tests/test_auth.py`

**Interfaces:**
- Produces: `hash_password(str)->str`, `verify_password(str,str)->bool`, `create_token(user)->str`, `decode_token(str)->dict`, `current_user` dependency (401 on bad token), `require_roles(*roles)` dependency factory. Login returns `{token, user:{id,name,email,role,hospital_id,ambulance_id}}`.
- Seed: hospitals "City General" and "St. Mary", ambulances `AMB-01` (key `dev-device-key-1`), `AMB-02`; patients with cards `CARD-1001` (allergy: penicillin), `CARD-1002`; users `admin@ayu.test`, `driver@ayu.test`, `hospital@ayu.test`, `doctor@ayu.test`, password `ayu12345`.

- [ ] Tests: valid login returns token; wrong password 401; `/api/auth/me` with token returns role; no token 401; `require_roles` rejects wrong role 403.
- [ ] Run; expect fail. Implement security, auth router, seed called on startup when `AYU_ENV=dev` and DB empty. Run; pass. Commit.

### Task 3: RFID scan → case

**Files:** `backend/app/routers/rfid.py`, `backend/tests/test_rfid.py`

**Interfaces:**
- `POST /api/rfid/scans` (`X-Device-Key`): `{uid}` → `{patient, medical_record, case, card_uid}` 200; unknown UID 404; bad key 401; inactive card 404. Reuses the ambulance's open case for that patient; otherwise creates `priority="high"`, `status="open"`.
- Produces helper `latest_record(db, patient_id)`.

- [ ] Tests for known UID (returns penicillin allergy and a case id), unknown, inactive, bad key, rescan reuses case id.
- [ ] Run; fail. Implement; run; pass. Commit.

### Task 4: Case access, hospital selection

**Files:** `backend/app/{access.py,routers/cases.py,routers/hospitals.py,routers/ambulance.py}`, `backend/tests/test_case_access.py`

**Interfaces:**
- `get_case_for_user(db, case_id, user) -> EmergencyCase` raising 404 for missing/foreign.
- `GET /api/hospitals` (ambulance roles) → list.
- `GET /api/ambulance/case` → current open case or 404.
- `GET /api/cases/{id}` → `{case, patient, medical_record, ambulance, hospital}`.
- `POST /api/cases/{id}/hospital {hospital_id}` → assigns, status `hospital_selected`, writes `case_events`, emits `case:updated` via `realtime.emit_case`.
- Produces: `app.realtime.emit_case(event, case, extra=None)` and `sio` object (no-op when no clients).

- [ ] Tests: driver sees own case; hospital user gets 404 on unassigned case and 200 after assignment; wrong-role 403; selection sets status and event row.
- [ ] Run; fail. Implement access + routers + `realtime.py` stub; run; pass. Commit.

### Task 5: Text messages and acknowledgement

**Files:** `backend/app/routers/messages.py`, `backend/tests/test_messages.py`

**Interfaces:**
- `POST /api/cases/{id}/messages {text}` → message `kind=text`, `sender_role` from user.
- `GET /api/cases/{id}/messages` ordered by `created_at, id`.
- `POST /api/cases/{id}/acknowledge` (hospital roles, own hospital) → message `ack_status` updated to `acknowledged` for all non-acknowledged, case `acknowledged`, `acknowledged_at/by`; emits `message:ack`, `case:acknowledged`.
- `PATCH /api/cases/{id}/prep-status {status}` validates enum; emits `prep:updated`.
- Assistant: `POST` text messages to a case with no prior assistant reply triggers `respond_to_message(db, case, text) -> Message`, which includes allergy awareness when known, a complaint checklist, and the no-diagnosis sentence.

- [ ] Tests: text message persisted/listed; empty text 400; assistant reply mentions "penicillin" and "not a diagnosis"; hospital ack flips statuses and case; driver ack 403; invalid prep status 422.
- [ ] Run; fail. Implement; run; pass. Commit.

### Task 6: Voice upload and playback

**Files:** `backend/app/media.py`, `backend/app/routers/voice.py`, `backend/tests/test_voice.py`

**Interfaces:**
- `validate_audio(filename, content_type, size, duration) -> ext` raises `HTTPException` 415/413/400.
- `POST /api/cases/{id}/messages/voice` multipart (`file`, `duration_seconds`) → message `kind=voice` with `audio_path`, `audio_mime`.
- `GET /api/cases/{id}/messages/{mid}/audio` → `StreamingResponse` with stored MIME; 401/403/404 enforced.

- [ ] Tests: valid webm 200; wrong MIME 415; 11 MB 413; duration 121 400; stream returns bytes + content-type; unauth 401; other hospital 403.
- [ ] Run; fail. Implement temp-file-safe validation and streaming; run; pass. Commit.

### Task 7: Socket.IO wiring

**Files:** `backend/app/realtime.py`, `backend/app/main.py`, `backend/tests/test_realtime.py`

**Interfaces:**
- `sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=...)`; `emit_case(event, case, extra=None)`, `emit_message(event, case, message)`, `room_for_case(case_id)`, `room_for_hospital(id)`, `room_for_ambulance(id)`; connect parses `auth.token`, joins rooms, rejects invalid token.
- Mount as `socketio.ASGIApp(sio, app)` at `/socket.io`.

- [ ] Test room names and that connect rejects a bad token via `sio.handlers` call; test emits are recorded by monkeypatched `sio.emit`.
- [ ] Run; fail. Implement; run; pass. Commit.

### Task 8: Hospital, doctor, admin APIs

**Files:** `backend/app/routers/{hospital,doctor,admin}.py`, `backend/tests/test_dashboards.py`

**Interfaces:**
- `GET /api/hospital/cases` → own hospital, newest first, includes patient name.
- `GET /api/doctor/cases` → same shape read-only.
- `GET /api/admin/overview` counts; `/api/admin/{users,hospitals,ambulances,patients}` lists without password/clinical fields.
- Produces response schemas used by frontend.

- [ ] Tests: hospital list excludes other hospital and includes assigned; doctor list same; admin list has no `password_hash`; admin overview counts match seed.
- [ ] Run; fail. Implement; run; pass. Commit.

### Task 9: Frontend foundation

**Files:** `frontend/package.json`, `vite.config.js`, `index.html`, `src/{main.jsx,App.jsx,index.css,api.js,auth.jsx,routes.jsx}`, `src/pages/Login.jsx`, `src/components/Shell.jsx`

**Interfaces:**
- `api(path, {method, body, form})` attaches bearer token, throws `Error(detail)`.
- `AuthProvider`/`useAuth()` with `{user, token, login, logout}` persisted in localStorage.
- Routes: `/login`, `/ambulance`, `/hospital`, `/doctor`, `/admin`, guarded by role.

- [ ] `npm create vite@latest . -- --template react`, add deps `react-router-dom socket.io-client`, Tailwind 4 via `@tailwindcss/vite`, `@import "tailwindcss";`.
- [ ] Implement login (demo fill buttons), shell nav, guards; `npm run build` passes. Commit.

### Task 10: Ambulance dashboard

**Files:** `src/pages/Ambulance.jsx`, `src/components/{PatientCard,SimulateScan,HospitalPicker}.jsx`

**Interfaces:**
- Simulate scan posts `{uid}` to `/api/rfid/scans` with `X-Device-Key: dev-device-key-1` (dev only) and loads payload.
- Shows patient identity, allergies/conditions prominent, priority, current case, hospital picker → `POST /hospital`, status/prep chips.
- Produces `case` state passed to chat.

- [ ] Build UI, wire fetch, handle 404 "unknown card" inline; `npm run build`. Commit.

### Task 11: Assistant chat + voice notes

**Files:** `src/components/AssistantChat.jsx`, `src/hooks/useRecorder.js`, `src/components/VoiceRecorder.jsx`

**Interfaces:**
- `useRecorder()` → `{supported, permission, error, recording, seconds, blob, start, stop, discard}` using `MediaRecorder`; permission request on first start.
- Chat lists messages, sends text, uploads voice form (`file`, `duration_seconds`), shows sent/delivered/acknowledged badges, renders `<audio controls src={api url?token=...}>` via authenticated blob fetch.
- Socket `message:new` / `message:ack` appends/updates.

- [ ] Add mic button → permission error text + text fallback; preview & discard; send; verify build. Commit.

### Task 12: Hospital dashboard

**Files:** `src/pages/Hospital.jsx`, `src/components/{CaseQueue,CaseDetail,AudioPlayer}.jsx`

**Interfaces:**
- Queue from `/api/hospital/cases`; detail from `/api/cases/{id}`; audio via authenticated fetch → object URL; text/voice reply; acknowledge; prep status select; socket updates.

- [ ] Implement, build. Commit.

### Task 13: Doctor and admin dashboards

**Files:** `src/pages/{Doctor,Admin}.jsx`

**Interfaces:** doctor reuses case list/detail read-only; admin renders overview counts and directory tables.

- [ ] Implement, build. Commit.

### Task 14: Firmware + docs + end-to-end verification

**Files:** `firmware/rfid_esp32/rfid_esp32.ino`, `firmware/rfid_esp32/README.md`, root `README.md`

**Interfaces:** ESP32 reads MFRC522 UID, hex-encodes, `HTTPClient` POST `/api/rfid/scans` with `X-Device-Key`, retries once, logs HTTP code.

- [ ] Write sketch with configurable WiFi/API host/key; document wiring and flashing.
- [ ] Run `pytest -q` and `npm run build`; write seed/demo steps in README. Commit.
