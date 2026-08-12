import asyncio
import tempfile
import threading
from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings
from app.schemas import TranscribeResponse


_model = None
_model_lock = threading.Lock()
_transcribe_lock = threading.Lock()


def _language_code(language: str | None) -> str | None:
    return {
        "vi-VN": "vi",
        "en-US": "en",
        "zh-CN": "zh",
    }.get(language or "")


def _get_model():
    global _model
    if _model is not None:
        return _model
    with _model_lock:
        if _model is None:
            from faster_whisper import WhisperModel

            _model = WhisperModel(
                get_settings().whisper_model,
                device="cpu",
                compute_type="int8",
                cpu_threads=max(1, get_settings().whisper_cpu_threads),
                num_workers=1,
            )
    return _model


def _transcribe_path(path: Path, language: str | None) -> TranscribeResponse:
    model = _get_model()
    with _transcribe_lock:
        segments, info = model.transcribe(
            str(path),
            language=_language_code(language),
            beam_size=1,
            best_of=1,
            condition_on_previous_text=False,
            vad_filter=True,
        )
        transcript = " ".join(
            segment.text.strip() for segment in segments
        ).strip()
    return TranscribeResponse(
        transcript=transcript,
        language=getattr(info, "language", None),
        duration_sec=getattr(info, "duration", None),
        provider="faster-whisper",
    )


async def transcribe_audio(
    file: UploadFile,
    language: str | None = None,
) -> TranscribeResponse:
    suffix = Path(file.filename or "answer.webm").suffix or ".webm"
    data = await file.read()
    if not data:
        raise ValueError("No audio received")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(data)
        temp_path = Path(temp_file.name)

    try:
        return await asyncio.to_thread(_transcribe_path, temp_path, language)
    finally:
        temp_path.unlink(missing_ok=True)
