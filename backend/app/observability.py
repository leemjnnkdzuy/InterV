import json
import logging
import re
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Iterator


REQUEST_ID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-"
    r"[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_request_id: ContextVar[str | None] = ContextVar(
    "interv_request_id",
    default=None,
)
logger = logging.getLogger("interv.api")


def valid_request_id(value: str | None) -> str:
    candidate = (value or "").strip()
    return candidate if REQUEST_ID_PATTERN.fullmatch(candidate) else str(uuid.uuid4())


def get_request_id() -> str | None:
    return _request_id.get()


@contextmanager
def request_context(request_id: str) -> Iterator[None]:
    token = _request_id.set(request_id)
    try:
        yield
    finally:
        _request_id.reset(token)


def elapsed_ms(started_at: float) -> float:
    return round(max(0.0, (time.perf_counter() - started_at) * 1000), 2)


def log_api_event(**fields: object) -> None:
    logger.info(
        json.dumps(
            fields,
            ensure_ascii=True,
            separators=(",", ":"),
            sort_keys=True,
        )
    )
