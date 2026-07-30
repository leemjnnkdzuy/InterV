import asyncio
import base64
import hashlib

from fastapi import HTTPException
from app.schemas import TtsPreviewRequest, TtsPreviewResponse, VoiceInfo
from app.services.cache import cache_service


TTS_PREVIEW_RETRY_ATTEMPTS = 3
TTS_PREVIEW_RETRY_DELAY_SECONDS = 0.35


async def list_voices(language: str) -> list[VoiceInfo]:
    cache_key = f"voice:list:{language}"
    cached = await cache_service.get_json(cache_key)
    if cached:
        return [VoiceInfo(**item) for item in cached]

    try:
        import edge_tts

        raw_voices = await edge_tts.list_voices()
        voices: list[VoiceInfo] = []
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
    except Exception as error:
        raise RuntimeError(f"Could not load Edge TTS voices: {error}") from error

    if not voices:
        raise RuntimeError(f"Edge TTS returned no voices for locale {language}")

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
    voices = await list_voices(payload.language)
    if payload.voice_id not in {voice.id for voice in voices}:
        raise HTTPException(
            status_code=400,
            detail="Voice does not belong to the selected language",
        )
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
