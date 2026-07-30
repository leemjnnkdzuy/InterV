import asyncio
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from app.config import get_settings
from app.grpc_server import start_grpc_server
from app.observability import (
    elapsed_ms,
    log_api_event,
    request_context,
    valid_request_id,
)
from app.services.cache import cache_service
from app.services.events import event_publisher
from app.services.audio_analysis import warmup_sensevoice
from app.services.assemblyai import validate_assemblyai_configuration
from app.services.deepseek import validate_deepseek_configuration
from app.services.tts import list_voices
from app.rag import get_rag_agent
from app.rules import get_rule_catalog


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_settings()
    get_rule_catalog().validate()
    rag_agent = get_rag_agent()
    await rag_agent.initialize()
    validate_deepseek_configuration()
    validate_assemblyai_configuration()
    await warmup_sensevoice()
    await list_voices("vi-VN")
    await cache_service.connect()
    await event_publisher.connect()
    grpc_server = await start_grpc_server()
    try:
        yield
    finally:
        await grpc_server.stop(grace=3)
        await event_publisher.close()
        await cache_service.close()
        await asyncio.to_thread(rag_agent.store.close)


app = FastAPI(
    title="InterV AI Backend",
    version="0.2.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.middleware("http")
async def api_logging_middleware(request: Request, call_next):
    started_at = time.perf_counter()
    request_id = valid_request_id(request.headers.get("x-request-id"))
    status_code = 500
    try:
        with request_context(request_id):
            response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-Id"] = request_id
        return response
    finally:
        log_api_event(
            event="http_request_completed",
            request_id=request_id,
            method=request.method[:12],
            path=request.url.path[:500],
            status_code=status_code,
            duration_ms=elapsed_ms(started_at),
            peer=request.client.host[:160] if request.client else "unknown",
        )


@app.get("/health")
async def health():
    rag_health = await get_rag_agent().health()
    return {
        "success": rag_health.ready,
        "service": "interv-ai-backend",
    }
