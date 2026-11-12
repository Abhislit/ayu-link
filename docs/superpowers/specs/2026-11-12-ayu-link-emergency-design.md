# AYU-LINK Emergency Module — Design

**Goal:** An ambulance crew scans an RFID card, sees the patient's identity and medical
summary, talks to an Emergency Assistant, records voice notes, and notifies a hospital in
real time — where staff play the notes and acknowledge the case.

**Scope:** Prototype build of all four modules (Admin, Ambulance, Hospital, Doctor), with the
Ambulance ↔ Hospital emergency path fully functional.

## Architecture

Monorepo, three deployables:

```
ayu-link/
  backend/    FastAPI + SQLAlchemy + SQLite + python-socketio (ASGI, Uvicorn)
  frontend/   React 19 + Vite + Tailwind v4, react-router-dom, socket.io-client
  firmware/   ESP32 + MFRC522 sketch (posts card UID)
```

The backend is the only authority: every read and write is scoped by the caller's role and
hospital/ambulance assignment. Audio is stored outside the web root and streamed only through
an authenticated endpoint. Socket.IO rooms deliver live updates; the database is the source of
truth and reconnect re-fetches state.

## Roles

`admin`, `ambulance_driver`, `ambulance_staff`, `hospital_staff`, `doctor`.

- Ambulance users belong to one ambulance. They can open and read only that ambulance's case.
- Hospital and doctor users belong to one hospital. They can read only that hospital's cases.
- Admin can read aggregate and directory data; no patient clinical data in the admin UI.
- RFID devices authenticate with a per-ambulance `device_key` header, no user session.

## Data Model

| Table | Key fields |
|---|---|
| `hospitals` | id, name, address, phone |
| `ambulances` | id, vehicle_number unique, device_key unique, label |
| `users` | id, name, email unique, password_hash, role, hospital_id, ambulance_id, is_active |
| `patients` | id, name, age, gender, blood_group, allergies, conditions, emergency_contact, created_at |
| `medical_records` | id, patient_id, summary, medications, notes, updated_at |
| `rfid_cards` | uid unique, patient_id, active |
| `emergency_cases` | id, patient_id, ambulance_id, hospital_id, priority, status, prep_status, created_at, acknowledged_at, acknowledged_by_id |
| `messages` | id, case_id, sender_id, sender_role, kind, text, audio_path, audio_mime, duration_seconds, created_at, ack_status, delivered_at |
| `case_events` | id, case_id, event_type, detail, actor_id, created_at |

`emergency_cases.status`: `open | hospital_selected | acknowledged | closed`.
`emergency_cases.prep_status`: `pending | requested | preparing | ready`.
`messages.ack_status`: `sent | delivered | acknowledged`.

## API

All JSON endpoints require `Authorization: Bearer <jwt>` unless noted. Errors use FastAPI's
`{"detail": "..."}` shape.

```
POST /api/auth/login                    {email,password} -> {token,user}
GET  /api/auth/me

POST /api/rfid/scans                    X-Device-Key header, {uid}
                                        -> {patient, medical_record, case, card_uid}

GET  /api/hospitals                     ambulances only
GET  /api/ambulance/case                current open case for caller's ambulance
GET  /api/cases/{id}                    role-scoped case detail
POST /api/cases/{id}/hospital           {hospital_id} (ambulance) -> assigns + notifies
GET  /api/cases/{id}/messages
POST /api/cases/{id}/messages           {text}
POST /api/cases/{id}/messages/voice     multipart file, duration_seconds
GET  /api/cases/{id}/messages/{mid}/audio   authenticated audio stream
POST /api/cases/{id}/acknowledge        hospital/ER staff -> sets status acknowledged
PATCH /api/cases/{id}/prep-status       {prep_status} hospital

GET  /api/hospital/cases                queue for caller's hospital
GET  /api/doctor/cases                  read-only cases for caller's hospital
GET  /api/admin/overview                counts
GET  /api/admin/users | /hospitals | /ambulances | /patients
```

RFID scan behavior: resolve active card → load patient, newest medical record → find the
ambulance's existing open case for that patient (reuse) or create one → emit `case:created`.
Unknown or inactive UID returns `404` and creates nothing.

## Voice Notes

- Browser `MediaRecorder` with `navigator.mediaDevices.getUserMedia({audio:true})`; the UI
  hides the recorder behind an explicit mic-permission button and shows the failure reason.
- Preview before send; discard is local.
- Server accepts `audio/webm`, `audio/ogg`, `audio/mp4`, `audio/wav` (also `audio/webm;codecs=opus`
  via the media-type prefix), max 10 MB, max 120 s declared duration.
- Stored at `backend/storage/cases/<case_id>/<uuid>.<ext>`; never mounted statically.
- Playback streams with `Content-Type` from the stored MIME after an access check.
- Messages are append-only; acknowledgement is a status update plus a `case_events` row.

## Realtime

Socket.IO handshake carries the JWT in `auth.token`. On connect the server joins
`ambulance:<id>` / `hospital:<id>` / `case:<id>` rooms as applicable.

| Event | Emitted to | Payload |
|---|---|---|
| `case:created` | ambulance room | case + patient card |
| `case:updated` | case room + hospital room | case summary |
| `message:new` | case room + hospital room | message |
| `message:ack` | case room + hospital room | message_id, ack_status |
| `case:acknowledged` | case room + hospital room | case |
| `prep:updated` | case room + hospital room | case |

## Screens

- **Login** — email/password; demo buttons fill seeded credentials.
- **Ambulance** (mobile-first): RFID status, "Simulate scan", patient card (name, age, blood
  group, allergies, conditions), priority, hospital picker, Emergency Assistant chat
  (mic → preview → send, text fallback), message log with sent/delivered/acknowledged badges,
  case status and prep status.
- **Hospital**: incoming queue (most recent first), case detail with patient, emergency,
  ambulance, priority, audio players, text reply, optional voice reply, acknowledge button,
  prep-status control.
- **Doctor**: same case list and detail, read-only.
- **Admin**: counts and directories (hospitals, ambulances, users, patients), no clinical data.

## Emergency Assistant

A deterministic server-side responder: acknowledges the message, reflects the patient's known
allergies/conditions, offers a short checklist for the stated complaint (trauma, cardiac,
respiratory, obstetric, unknown), and explicitly states it does not diagnose and that clinical
judgment leads. It reads `messages` for the case so replies are contextual and persisted like
any other message with `sender_role = assistant`. Replies are generated, not canned single
strings; tests assert the reply mentions the patient's allergy when present and the no-diagnosis
disclaimer.

## Security

- PBKDF2-HMAC-SHA256 (stdlib `hashlib`), 200k iterations, per-user salt.
- JWT HS256, 12 h expiry, secret from env (`AYU_SECRET`), dev fallback only when
  `AYU_ENV=dev`.
- Every case/message/audio access re-checks role + hospital/ambulance ownership.
- Device key compared with `secrets.compare_digest`; RFID cards carry UID only.
- Upload validation happens before touching disk; filenames are server-generated.
- CORS limited to configured frontend origin; HTTPS terminated by the deployment proxy.
- Audit: every clinical mutation writes `case_events`.

## Prototype trade-offs (one-line swaps)

- SQLite file DB → PostgreSQL via `DATABASE_URL`.
- In-process Socket.IO → Redis message queue for multi-worker.
- Local audio directory → S3-compatible object storage.
- Seeded demo data → real admin CRUD.

## Testing

- `pytest`: login/roles, RFID scan (known/unknown/inactive), cross-hospital and cross-ambulance
  denial, hospital assignment + notification event, text message, voice MIME/size/duration
  rejection and successful upload + authenticated stream + unauth denial, acknowledgement
  round-trip, assistant disclaimer and allergy awareness.
- Frontend: `npm run build` must pass; recorder logic kept in one hook with a browser check.
