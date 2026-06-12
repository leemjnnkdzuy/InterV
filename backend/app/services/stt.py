import tempfile
from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings
from app.schemas import TranscribeResponse


_model = None


def _language_code(language: str | None) -> str | None:
    return {
        "vi-VN": "vi",
        "en-US": "en",
        "zh-CN": "zh",
    }.get(language or "")


async def transcribe_audio(file: UploadFile, language: str | None = None) -> TranscribeResponse:
    global _model
    suffix = Path(file.filename or "answer.webm").suffix or ".webm"
    data = await file.read()
    if not data:
        return TranscribeResponse(transcript="", message="No audio received")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        try:
            from faster_whisper import WhisperModel

            if _model is None:
                _model = WhisperModel(get_settings().whisper_model, device="cpu", compute_type="int8")
            segments, info = _model.transcribe(str(tmp_path), language=_language_code(language))
            transcript = " ".join(segment.text.strip() for segment in segments).strip()
            return TranscribeResponse(
                transcript=transcript,
                language=getattr(info, "language", None),
                duration_sec=getattr(info, "duration", None),
                provider="faster-whisper",
            )
        except Exception as exc:
            return TranscribeResponse(
                transcript="",
                provider="fallback",
                message=f"Speech recognition is unavailable: {exc}",
            )
    finally:
        tmp_path.unlink(missing_ok=True)
