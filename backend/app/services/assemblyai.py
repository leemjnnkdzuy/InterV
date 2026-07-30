import httpx

from app.config import get_settings


ASSEMBLYAI_TOKEN_URL = "https://streaming.assemblyai.com/v3/token"


def validate_assemblyai_configuration() -> None:
    if not get_settings().assembly_ai_api_key:
        raise RuntimeError("ASSEMBLY_AI_API_KEY is required")


async def create_streaming_token(
    expires_in_seconds: int = 60,
    max_session_duration_seconds: int = 900,
) -> dict[str, str | int]:
    settings = get_settings()
    validate_assemblyai_configuration()

    expires_in_seconds = max(1, min(expires_in_seconds, 600))
    max_session_duration_seconds = max(60, min(max_session_duration_seconds, 10_800))

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            ASSEMBLYAI_TOKEN_URL,
            headers={"Authorization": settings.assembly_ai_api_key},
            params={
                "expires_in_seconds": expires_in_seconds,
                "max_session_duration_seconds": max_session_duration_seconds,
            },
        )
        response.raise_for_status()
        payload = response.json()

    token = payload.get("token")
    if not isinstance(token, str) or not token:
        raise RuntimeError("AssemblyAI did not return a streaming token")

    return {
        "token": token,
        "expires_in_seconds": int(payload.get("expires_in_seconds", expires_in_seconds)),
        "websocket_url": settings.assembly_ai_streaming_url,
        "speech_model": settings.assembly_ai_speech_model,
    }
