# AYU-LINK prototype architecture

AYU-LINK is a presentation prototype for coordinating an ambulance-to-hospital
emergency handoff. This diagram reflects the current implementation: React/Vite
role dashboards, a FastAPI REST API, Socket.IO live events, SQLite-backed
records, and audio files stored outside the frontend's public directory.

## System architecture

```mermaid
flowchart LR
    subgraph PEOPLE["People and devices"]
        AMB["Ambulance driver / staff"]
        PHONE["Mobile ambulance dashboard<br/>React · Vite · Tailwind<br/>MediaRecorder"]
        RFID["ESP32 + MFRC522<br/>hardware scan"]
        DEMO["Dashboard demo UID<br/>development / test only"]
        HOSP["Hospital staff dashboard"]
        DOC["Doctor dashboard<br/>read-only"]
        ADMIN["Admin dashboard"]
    end

    subgraph APP["AYU-LINK application"]
        AUTH["Authentication and access control<br/>JWT · role and case authorization"]
        API["FastAPI REST API"]
        RFIDAPI["RFID lookup<br/>UID → patient"]
        CASES["Emergency case coordination<br/>patient · ambulance · hospital · status"]
        MESSAGES["Case messaging<br/>text · delivery · acknowledgement"]
        AUDIO["Voice service<br/>validate · store · authorized playback"]
        LIVE["Socket.IO live events<br/>case · hospital · ambulance rooms"]
    end

    subgraph DATA["Prototype storage"]
        DB[("SQLite<br/>users · patients · records<br/>cases · messages · events")]
        FILES[("Private audio files<br/>outside public frontend")]
    end

    AMB --> PHONE
    RFID -->|"UID + device key"| API
    PHONE -->|"HTTPS-ready REST + JWT"| AUTH
    PHONE -.->|"scan simulation"| DEMO
    DEMO -->|"JWT-authenticated demo request"| API
    AUTH --> API
    API --> RFIDAPI
    API --> CASES
    API --> MESSAGES
    API --> AUDIO
    RFIDAPI -->|"patient + latest record"| DB
    RFIDAPI --> CASES
    CASES <--> DB
    MESSAGES <--> DB
    AUDIO -->|"message metadata"| DB
    AUDIO -->|"audio bytes"| FILES
    PHONE <-->|"authorized upload / playback"| AUDIO

    HOSP <-->|"REST + JWT"| API
    DOC -->|"read-only REST + JWT"| API
    ADMIN -->|"authorized REST + JWT"| API
    HOSP <-->|"Socket.IO live updates"| LIVE
    PHONE <-->|"Socket.IO live updates"| LIVE
    LIVE -->|"case-scoped events"| CASES

    classDef client fill:#eaf4f5,stroke:#278a91,color:#122b3a,stroke-width:1.5px
    classDef service fill:#edf1fb,stroke:#5267aa,color:#17284d,stroke-width:1.5px
    classDef storage fill:#fff4e7,stroke:#ce8733,color:#442b13,stroke-width:1.5px
    class AMB,PHONE,RFID,DEMO,HOSP,DOC,ADMIN client
    class AUTH,API,RFIDAPI,CASES,MESSAGES,AUDIO,LIVE service
    class DB,FILES storage
```

## Emergency handoff sequence

```mermaid
sequenceDiagram
    autonumber
    actor Crew as Ambulance crew
    participant UI as Ambulance dashboard
    participant API as FastAPI REST API
    participant Store as SQLite + private audio storage
    participant RT as Socket.IO
    actor Hospital as Assigned hospital staff

    Crew->>UI: Sign in with an ambulance account
    Crew->>UI: Scan patient RFID (or use demo UID)
    UI->>API: Send UID with authenticated request
    API->>Store: Resolve UID to patient and latest record
    API->>Store: Create or reopen active emergency case
    API-->>UI: Return authorized patient and case summary
    Crew->>UI: Select hospital and record voice note
    UI->>API: Upload validated audio or send text
    API->>Store: Save message metadata and private audio file
    API->>RT: Emit case/message event to authorized rooms
    RT-->>Hospital: Notify assigned hospital dashboard
    Hospital->>API: Fetch case and play authorized audio
    Hospital->>API: Reply, acknowledge, or update preparation
    API->>Store: Record message and timestamped case event
    API->>RT: Emit status/reply update
    RT-->>UI: Refresh ambulance communication and case status
```

## Access and prototype boundaries

- Ambulance drivers and authorized ambulance staff use the ambulance dashboard
  and case communication tools.
- Hospital staff can respond to cases assigned to their hospital. Doctors have
  read-only case access; admins use their separate authorized dashboard.
- The development/test RFID simulator is not the hardware interface. The
  ESP32-compatible scan endpoint authenticates with a device key.
- RFID cards carry a UID only; patient details are looked up on the backend.
- Voice recording requires browser microphone permission. Audio is validated
  and served only through an authorized case request.
- This is a presentation prototype, not a clinically validated or
  production-ready patient-care system.

## Presentation slide

The one-page, 16:9 workflow graphic is available as
[ayu-link-emergency-flow.svg](./ayu-link-emergency-flow.svg). SVG stays sharp
when resized and can be inserted directly into slides or exported to PNG.