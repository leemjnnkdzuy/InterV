import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.grpc_server import start_grpc_server
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


@app.get("/health")
async def health():
    rag_health = await get_rag_agent().health()
    return {
        "success": rag_health.ready,
        "service": "interv-ai-backend",
    }
