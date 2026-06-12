from fastapi import Header, HTTPException, status

from app.config import get_settings


def verify_internal_key(x_internal_api_key: str | None = Header(default=None)) -> None:
    expected = get_settings().ai_backend_internal_key
    if not x_internal_api_key or x_internal_api_key != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
