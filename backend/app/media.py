from fastapi import HTTPException

ALLOWED_AUDIO = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mp4": ".mp4",
    "audio/wav": ".wav",
}
MAX_AUDIO_BYTES = 10 * 1024 * 1024
MAX_AUDIO_SECONDS = 120


def normalize_mime(content_type: str | None) -> str:
    return (content_type or "").split(";")[0].strip().lower()


def validate_audio(content_type: str | None, size: int, duration_seconds: int) -> str:
    mime = normalize_mime(content_type)
    if mime not in ALLOWED_AUDIO:
        raise HTTPException(status_code=415, detail="Unsupported audio type")
    if size > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file is too large")
    if duration_seconds <= 0 or duration_seconds > MAX_AUDIO_SECONDS:
        raise HTTPException(status_code=400, detail="Invalid audio duration")
    return ALLOWED_AUDIO[mime]
