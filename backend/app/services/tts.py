import base64
import hashlib
import asyncio

import httpx
from fastapi import HTTPException

from app.config import get_settings
from app.lib.vbee_pronunciation import prepare_vbee_tts_text
from app.schemas import TtsPreviewRequest, TtsPreviewResponse, VoiceInfo
from app.services.cache import cache_service


VBEE_VOICES_URL = "https://vbee.vn/api/public/v1/voices"
VBEE_TTS_URL = "https://api.vbee.vn/v1/tts"
VBEE_DEFAULT_VOICE = "hn_female_ngochuyen_full_48k-fhg"
VBEE_POLL_INTERVAL_SECONDS = 1.0
VBEE_POLL_ATTEMPTS = 70


def _vbee_headers() -> dict[str, str]:
    settings = get_settings()
    app_id = settings.vbee_app_id.strip()
    token = settings.vbee_token.strip()
    if not app_id or not token:
        raise HTTPException(
            status_code=503,
            detail="Vbee TTS credentials are not configured.",
        )
    return {"Authorization": f"Bearer {token}", "App-Id": app_id}


def _vbee_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return f"Vbee TTS returned HTTP {response.status_code}."
    error = payload.get("error") if isinstance(payload, dict) else None
    if isinstance(error, dict) and isinstance(error.get("message"), str):
        return error["message"][:500]
    return f"Vbee TTS returned HTTP {response.status_code}."


async def list_voices(language: str) -> list[VoiceInfo]:
    if language != "vi-VN":
        return []
    cache_key = f"voice:list:vbee:v2:{language}"
    cached = await cache_service.get_json(cache_key)
    if cached:
        return [VoiceInfo(**item) for item in cached]

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20, connect=8)) as client:
            response = await client.get(
                VBEE_VOICES_URL,
                headers=_vbee_headers(),
                params={
                    "voiceOwnership": "VBEE",
                    "languageCode": language,
                    "limit": 100,
                },
            )
    except httpx.HTTPError as error:
        raise RuntimeError("Could not connect to the Vbee voices API.") from error
    if response.is_error:
        raise RuntimeError(_vbee_error_message(response))

    payload = response.json()
    raw_voices = payload.get("result", {}).get("voices", [])
    voices = [
        VoiceInfo(
            id=voice["code"],
            name=voice.get("name") or voice["code"],
            locale=voice.get("language_code") or language,
            gender=voice.get("gender"),
            description="Vbee",
            demo_url=voice.get("demo"),
        )
        for voice in raw_voices
        if isinstance(voice, dict)
        and isinstance(voice.get("code"), str)
        and voice.get("code")
    ]
    if not voices:
        raise RuntimeError("Vbee returned no Vietnamese voices.")

    await cache_service.set_json(
        cache_key,
        [voice.model_dump() for voice in voices],
        ttl_seconds=6 * 3600,
    )
    return voices


async def _synthesize_vbee_tts(text: str, voice_id: str) -> bytes:
    settings = get_settings()
    headers = {**_vbee_headers(), "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(35, connect=8),
            follow_redirects=True,
        ) as client:
            response = await client.post(
                VBEE_TTS_URL,
                headers=headers,
                json={
                    "text": text.strip(),
                    "voiceCode": voice_id,
                    "mode": "async",
                    "webhookUrl": settings.vbee_webhook_url,
                    "outputFormat": "mp3",
                    "bitrate": 128,
                    "speed": 1.0,
                },
            )
            if response.is_error:
                raise HTTPException(
                    status_code=502,
                    detail=_vbee_error_message(response),
                )
            request_id = response.json().get("requestId")
            if not isinstance(request_id, str) or not request_id:
                raise HTTPException(
                    status_code=502,
                    detail="Vbee TTS did not return a request ID.",
                )

            for _ in range(VBEE_POLL_ATTEMPTS):
                await asyncio.sleep(VBEE_POLL_INTERVAL_SECONDS)
                try:
                    status_response = await client.get(
                        f"{VBEE_TTS_URL}/requests/{request_id}",
                        headers=headers,
                    )
                except httpx.HTTPError:
                    continue

                if status_response.is_error:
                    raise HTTPException(
                        status_code=502,
                        detail=_vbee_error_message(status_response),
                    )
                status_payload = status_response.json()
                status = status_payload.get("status")
                if status in ("FAILED", "ERROR", "CANCELLED"):
                    raise HTTPException(
                        status_code=502,
                        detail="Vbee TTS could not synthesize this text.",
                    )
                if status not in ("COMPLETED", "SUCCESS"):
                    continue
                audio_link = status_payload.get("audioLink")
                if not isinstance(audio_link, str) or not audio_link:
                    raise HTTPException(
                        status_code=502,
                        detail="Vbee TTS completed without an audio link.",
                    )
                try:
                    audio_response = await client.get(audio_link)
                except httpx.HTTPError as error:
                    raise HTTPException(
                        status_code=502,
                        detail="Could not download the Vbee audio result.",
                    ) from error
                if audio_response.is_error or not audio_response.content:
                    raise HTTPException(
                        status_code=502,
                        detail="Could not download the Vbee audio result.",
                    )
                return audio_response.content
            raise HTTPException(
                status_code=504,
                detail="Vbee TTS processing timed out.",
            )
    except HTTPException:
        raise
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Vbee TTS.",
        ) from error
    raise HTTPException(status_code=502, detail="Vbee TTS returned no audio.")


async def synthesize_preview(payload: TtsPreviewRequest) -> TtsPreviewResponse:
    if payload.language != "vi-VN":
        raise HTTPException(
            status_code=400,
            detail="Vbee TTS is currently configured for Vietnamese only.",
        )
    voices = await list_voices(payload.language)
    if payload.voice_id not in {voice.id for voice in voices}:
        raise HTTPException(
            status_code=400,
            detail="Voice is not available in Vbee TTS.",
        )
    spoken_text = prepare_vbee_tts_text(payload.text)
    digest = hashlib.sha256(
        f"vbee:batch:v3:{payload.language}:{payload.voice_id}:{spoken_text}".encode(
            "utf-8"
        )
    ).hexdigest()
    cache_key = f"tts:preview:{digest}"
    cached = await cache_service.get_json(cache_key)
    if cached and cached.get("audio_base64"):
        return TtsPreviewResponse(**{**cached, "cached": True})

    audio = await _synthesize_vbee_tts(spoken_text, payload.voice_id)
    response = TtsPreviewResponse(audio_base64=base64.b64encode(audio).decode("ascii"))
    await cache_service.set_json(
        cache_key,
        response.model_dump(),
        ttl_seconds=7 * 24 * 3600,
    )
    return response
