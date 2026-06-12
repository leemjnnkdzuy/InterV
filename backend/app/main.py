from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import (
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewEvaluateRequest,
    InterviewEvaluateResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    TtsPreviewRequest,
    TtsPreviewResponse,
    VoicesResponse,
)
from app.security import verify_internal_key
from app.services.cache import cache_service
from app.services.deepseek import evaluate_interview, generate_questions, new_run_id
from app.services.document import extract_jd
from app.services.events import event_publisher
from app.services.stt import transcribe_audio
from app.services.tts import list_voices, synthesize_preview


@asynccontextmanager
async def lifespan(app: FastAPI):
    await cache_service.connect()
    await event_publisher.connect()
    yield
    await event_publisher.close()


app = FastAPI(title="InterV AI Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    settings = get_settings()
    return {
        "success": True,
        "service": "interv-ai-backend",
        "port": settings.port,
        "deepseekConfigured": bool(settings.deepseek_api_key),
    }


@app.post("/internal/jd/extract", dependencies=[Depends(verify_internal_key)])
async def jd_extract(file: UploadFile = File(...)):
    return await extract_jd(file)


@app.get("/internal/voices", response_model=VoicesResponse, dependencies=[Depends(verify_internal_key)])
async def voices(language: str = "vi-VN"):
    return VoicesResponse(voices=await list_voices(language))


@app.post(
    "/internal/tts/preview",
    response_model=TtsPreviewResponse,
    dependencies=[Depends(verify_internal_key)],
)
async def tts_preview(payload: TtsPreviewRequest):
    return await synthesize_preview(payload)


@app.post(
    "/internal/interview/start",
    response_model=InterviewStartResponse,
    dependencies=[Depends(verify_internal_key)],
)
async def interview_start(payload: InterviewStartRequest):
    questions, provider = await generate_questions(payload)
    run_id = new_run_id()
    await event_publisher.publish(
        "interview.event",
        {
            "type": "INTERVIEW_STARTED",
            "runId": run_id,
            "sessionId": payload.session_id,
            "provider": provider,
            "questionCount": len(questions),
        },
    )
    return InterviewStartResponse(run_id=run_id, questions=questions, provider=provider)


@app.post("/internal/interview/transcribe", dependencies=[Depends(verify_internal_key)])
async def interview_transcribe(
    file: UploadFile = File(...),
    language: str = Form(default="vi-VN"),
):
    return await transcribe_audio(file, language)


@app.post(
    "/internal/interview/answer",
    response_model=InterviewAnswerResponse,
    dependencies=[Depends(verify_internal_key)],
)
async def interview_answer(payload: InterviewAnswerRequest):
    return InterviewAnswerResponse(feedback_hint="Answer received")


@app.post(
    "/internal/interview/evaluate",
    response_model=InterviewEvaluateResponse,
    dependencies=[Depends(verify_internal_key)],
)
async def interview_evaluate(payload: InterviewEvaluateRequest):
    evaluation, provider = await evaluate_interview(payload)
    await event_publisher.publish(
        "interview.event",
        {"type": "INTERVIEW_EVALUATED", "runId": payload.run_id, "provider": provider},
    )
    return InterviewEvaluateResponse(evaluation=evaluation, provider=provider)
