import asyncio
import base64
import hashlib

from fastapi import HTTPException
from app.schemas import TtsPreviewRequest, TtsPreviewResponse, VoiceInfo
from app.services.cache import cache_service


FALLBACK_VOICES = [
    VoiceInfo(id="vi-VN-HoaiMyNeural", name="Hoai My", locale="vi-VN", gender="Female", description="Vietnamese female neural voice"),
    VoiceInfo(id="vi-VN-NamMinhNeural", name="Nam Minh", locale="vi-VN", gender="Male", description="Vietnamese male neural voice"),
    VoiceInfo(id="en-US-JennyNeural", name="Jenny", locale="en-US", gender="Female", description="English female neural voice"),
    VoiceInfo(id="en-US-GuyNeural", name="Guy", locale="en-US", gender="Male", description="English male neural voice"),
    VoiceInfo(id="zh-CN-XiaoxiaoNeural", name="Xiaoxiao", locale="zh-CN", gender="Female", description="Chinese female neural voice"),
    VoiceInfo(id="zh-CN-YunxiNeural", name="Yunxi", locale="zh-CN", gender="Male", description="Chinese male neural voice"),
]

TTS_PREVIEW_RETRY_ATTEMPTS = 3
TTS_PREVIEW_RETRY_DELAY_SECONDS = 0.35


async def list_voices(language: str) -> list[VoiceInfo]:
    cache_key = f"voice:list:{language}"
    cached = await cache_service.get_json(cache_key)
    if cached:
        return [VoiceInfo(**item) for item in cached]

    voices: list[VoiceInfo] = []
    try:
        import edge_tts

        raw_voices = await edge_tts.list_voices()
        for voice in raw_voices:
            short_name = voice.get("ShortName", "")
            locale = voice.get("Locale", short_name[:5])
            if locale != language:
                continue
            personalities = voice.get("VoiceTag", {}).get("VoicePersonalities", [])
            voices.append(
                VoiceInfo(
                    id=short_name,
                    name=voice.get("FriendlyName") or short_name,
                    locale=locale,
                    gender=voice.get("Gender"),
                    description=", ".join(personalities) if personalities else None,
                )
            )
    except Exception:
        voices = []

    if not voices:
        voices = [voice for voice in FALLBACK_VOICES if voice.locale == language]

    await cache_service.set_json(cache_key, [voice.model_dump() for voice in voices], ttl_seconds=24 * 3600)
    return voices


async def _synthesize_edge_tts(text: str, voice_id: str) -> str:
    try:
        import edge_tts
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="TTS engine is not available on the AI backend.",
        ) from exc

    last_error: Exception | None = None
    for attempt in range(TTS_PREVIEW_RETRY_ATTEMPTS):
        try:
            communicate = edge_tts.Communicate(text, voice_id)
            chunks: list[bytes] = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])

            if chunks:
                return base64.b64encode(b"".join(chunks)).decode("ascii")

            last_error = RuntimeError("Edge TTS returned no audio chunks.")
        except Exception as exc:
            last_error = exc

        if attempt < TTS_PREVIEW_RETRY_ATTEMPTS - 1:
            await asyncio.sleep(TTS_PREVIEW_RETRY_DELAY_SECONDS * (attempt + 1))

    raise HTTPException(
        status_code=503,
        detail="TTS service did not return audio. Please try again.",
    ) from last_error


async def synthesize_preview(payload: TtsPreviewRequest) -> TtsPreviewResponse:
    digest = hashlib.sha256(
        f"{payload.language}:{payload.voice_id}:{payload.text}".encode("utf-8")
    ).hexdigest()
    cache_key = f"tts:preview:{digest}"
    cached = await cache_service.get_json(cache_key)
    if cached and cached.get("audio_base64"):
        return TtsPreviewResponse(**{**cached, "cached": True})

    audio_base64 = await _synthesize_edge_tts(payload.text, payload.voice_id)
    response = TtsPreviewResponse(audio_base64=audio_base64)
    await cache_service.set_json(cache_key, response.model_dump(), ttl_seconds=7 * 24 * 3600)
    return response
