import base64
import asyncio
import hmac
import json
import logging
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import NoReturn

import grpc
from fastapi import HTTPException, UploadFile

import interv_ai_pb2
import interv_ai_pb2_grpc
from app.config import get_settings
from app.schemas import (
    InterviewEvaluateRequest,
    InterviewFollowUpRequest,
    InterviewStartRequest,
    TtsPreviewRequest,
)
from app.rag import InterviewKnowledgeRecord, RetrievalQuery, get_rag_agent
from app.rules import resolve_profile
from app.services.assemblyai import create_streaming_token
from app.services.audio_analysis import AudioSample, analyze_audio_behavior
from app.services.deepseek import (
    DeepSeekUsage,
    begin_deepseek_usage,
    end_deepseek_usage,
    evaluate_interview,
    generate_follow_up,
    generate_questions,
    get_deepseek_balance,
    new_run_id,
)
from app.services.document import extract_jd
from app.services.stt import transcribe_audio
from app.services.tts import list_voices, synthesize_preview


MAX_GRPC_MESSAGE_BYTES = 32 * 1024 * 1024
MAX_AUDIO_ANALYSIS_BYTES = 150 * 1024 * 1024
MAX_AUDIO_ANALYSIS_CHUNKS = 25
logger = logging.getLogger(__name__)


def _metadata(context: grpc.aio.ServicerContext) -> dict[str, str]:
    return {item.key.lower(): item.value for item in context.invocation_metadata()}


async def _authorize(context: grpc.aio.ServicerContext) -> None:
    provided = _metadata(context).get("x-internal-api-key", "")
    expected = get_settings().ai_backend_internal_key
    if not provided or not expected or not hmac.compare_digest(provided, expected):
        await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid internal API key")


async def _abort_for_error(context: grpc.aio.ServicerContext, error: Exception) -> NoReturn:
    if isinstance(error, HTTPException):
        status_code = (
            grpc.StatusCode.INVALID_ARGUMENT
            if error.status_code < 500
            else grpc.StatusCode.UNAVAILABLE
        )
        await context.abort(status_code, str(error.detail))
    if isinstance(error, ValueError):
        await context.abort(grpc.StatusCode.INVALID_ARGUMENT, str(error))
    logger.exception("Unhandled gRPC service error", exc_info=error)
    await context.abort(
        grpc.StatusCode.UNAVAILABLE,
        "AI backend is temporarily unavailable",
    )
    raise RuntimeError("gRPC abort did not terminate the request")


def _question_message(question) -> interv_ai_pb2.InterviewQuestion:
    return interv_ai_pb2.InterviewQuestion(
        id=question.id,
        text=question.text,
        competency=question.competency,
        difficulty=question.difficulty or "",
        expected_signals=question.expected_signals,
        grounding_ids=question.grounding_ids,
    )


def _deepseek_usage_message(usage: DeepSeekUsage) -> interv_ai_pb2.DeepSeekUsage:
    return interv_ai_pb2.DeepSeekUsage(
        operation=usage.operation,
        model=usage.model,
        request_count=usage.request_count,
        successful_request_count=usage.successful_request_count,
        failed_request_count=usage.failed_request_count,
        prompt_tokens=usage.prompt_tokens,
        completion_tokens=usage.completion_tokens,
        total_tokens=usage.total_tokens,
        cache_hit_tokens=usage.cache_hit_tokens,
        cache_miss_tokens=usage.cache_miss_tokens,
        reasoning_tokens=usage.reasoning_tokens,
        latency_ms=usage.latency_ms,
        request_ids=usage.request_ids,
    )


def _set_usage_metadata(
    context: grpc.aio.ServicerContext,
    usage: DeepSeekUsage,
) -> None:
    context.set_trailing_metadata(
        (
            (
                "x-deepseek-usage",
                json.dumps(
                    usage.as_dict(),
                    ensure_ascii=True,
                    separators=(",", ":"),
                ),
            ),
        )
    )


def _context_kwargs(context) -> dict[str, object]:
    return {
        "session_id": context.session_id,
        "title": context.title,
        "industry": context.industry,
        "job_description": context.job_description,
        "topic": context.topic,
        "difficulty": context.difficulty or "Middle",
        "language": context.language or "vi-VN",
        "voice_id": context.voice_id or "vi-VN-HoaiMyNeural",
    }


def _rating(ratings: dict[str, int], camel: str, snake: str) -> int:
    return int(ratings.get(camel, ratings.get(snake, 0)))


def _question_count(value: int) -> int:
    return max(5, min(25, int(value or 5)))


def _knowledge_record(
    *,
    source,
    run_id: str,
    qa_history: list[dict[str, object]] | None = None,
    evaluation: dict[str, object] | None = None,
    audio_analysis: dict[str, object] | None = None,
) -> InterviewKnowledgeRecord:
    profile = resolve_profile(source.industry, source.difficulty or "Middle")
    return InterviewKnowledgeRecord(
        run_id=run_id,
        session_id=source.session_id,
        title=source.title,
        industry=profile.industry.name,
        level=profile.level,
        tier=profile.tier.index,
        language=source.language or "vi-VN",
        job_description=source.job_description,
        topic=source.topic,
        qa_history=tuple(qa_history or ()),
        evaluation=evaluation,
        audio_analysis=audio_analysis,
    )


def _qa_dict(item) -> dict[str, object]:
    if not item.question_id or len(item.question_id) > 64:
        raise ValueError("question_id must contain between 1 and 64 characters")
    if not item.question or len(item.question) > 1_500:
        raise ValueError("question must contain between 1 and 1500 characters")
    if not item.answer or len(item.answer) > 20_000:
        raise ValueError("answer must contain between 1 and 20000 characters")
    if len(item.grounding_ids) > 30:
        raise ValueError("grounding_ids exceeds the allowed count")
    return {
        "questionId": item.question_id,
        "question": item.question,
        "answer": item.answer,
        "groundingIds": list(item.grounding_ids),
    }


class IntervAiService(interv_ai_pb2_grpc.IntervAiServicer):
    async def Health(self, request, context):
        await _authorize(context)
        settings = get_settings()
        rag_health = await get_rag_agent().health()
        return interv_ai_pb2.HealthResponse(
            success=True,
            service="interv-ai-backend",
            deepseek_configured=bool(settings.deepseek_api_key),
            assemblyai_configured=bool(settings.assembly_ai_api_key),
            sensevoice_ready=True,
            transport="grpc",
            rag_ready=rag_health.ready,
            rag_backend=rag_health.backend,
            rag_document_count=rag_health.document_count,
        )

    async def ExtractJd(self, request, context):
        await _authorize(context)
        if len(request.content) > get_settings().max_upload_mb * 1024 * 1024:
            await context.abort(
                grpc.StatusCode.RESOURCE_EXHAUSTED,
                "Document exceeds the configured upload limit",
            )
        upload = UploadFile(
            file=BytesIO(request.content),
            filename=request.filename or "job-description.txt",
        )
        try:
            result = await extract_jd(upload)
        except Exception as error:
            await _abort_for_error(context, error)

        normalized = result.normalized
        return interv_ai_pb2.JdExtractResponse(
            success=True,
            markdown=result.markdown,
            normalized=interv_ai_pb2.NormalizedJd(
                title=normalized.title or "",
                company=normalized.company or "",
                responsibilities=normalized.responsibilities,
                requirements=normalized.requirements,
                skills=normalized.skills,
                seniority=normalized.seniority or "",
                language=normalized.language or "",
            ),
        )

    async def ListVoices(self, request, context):
        await _authorize(context)
        try:
            voices = await list_voices(request.language or "vi-VN")
        except Exception as error:
            await _abort_for_error(context, error)
        return interv_ai_pb2.ListVoicesResponse(
            success=True,
            voices=[
                interv_ai_pb2.Voice(
                    id=voice.id,
                    name=voice.name,
                    locale=voice.locale,
                    gender=voice.gender or "",
                    description=voice.description or "",
                )
                for voice in voices
            ],
        )

    async def SynthesizeTts(self, request, context):
        await _authorize(context)
        try:
            result = await synthesize_preview(
                TtsPreviewRequest(
                    text=request.text,
                    language=request.language or "vi-VN",
                    voice_id=request.voice_id,
                )
            )
        except Exception as error:
            await _abort_for_error(context, error)
        return interv_ai_pb2.TtsResponse(
            success=True,
            audio=base64.b64decode(result.audio_base64),
            content_type=result.content_type,
            cached=result.cached,
        )

    async def StartInterview(self, request, context):
        await _authorize(context)
        source = request.context
        run_id = new_run_id()
        usage_token = begin_deepseek_usage("interview_start")
        try:
            payload = InterviewStartRequest(
                **_context_kwargs(source),
                requested_questions=_question_count(source.question_count),
                question_count=_question_count(source.question_count),
            )
            questions, provider = await generate_questions(payload)
            for index, question in enumerate(questions, start=1):
                question.id = f"q_{index}"

            semaphore = asyncio.Semaphore(2)

            async def warm_audio(question):
                async with semaphore:
                    return await synthesize_preview(
                        TtsPreviewRequest(
                            text=question.text[:500],
                            language=payload.language,
                            voice_id=payload.voice_id,
                        )
                    )

            warm_results = await asyncio.gather(
                *(warm_audio(question) for question in questions),
                return_exceptions=True,
            )
            if warm_results and isinstance(warm_results[0], Exception):
                raise warm_results[0]
            await get_rag_agent().index_session_context(
                _knowledge_record(source=source, run_id=run_id)
            )
        except Exception as error:
            usage = end_deepseek_usage(usage_token)
            _set_usage_metadata(context, usage)
            await _abort_for_error(context, error)
        usage = end_deepseek_usage(usage_token)

        return interv_ai_pb2.InterviewStartResponse(
            success=True,
            run_id=run_id,
            questions=[_question_message(question) for question in questions],
            provider=provider,
            usage=_deepseek_usage_message(usage),
        )

    async def TranscribeAudio(self, request, context):
        await _authorize(context)
        if len(request.audio) > 12 * 1024 * 1024:
            await context.abort(
                grpc.StatusCode.RESOURCE_EXHAUSTED,
                "Audio exceeds the 12 MB limit",
            )
        upload = UploadFile(
            file=BytesIO(request.audio),
            filename=request.filename or "answer.webm",
        )
        try:
            result = await transcribe_audio(upload, request.language or "vi-VN")
        except Exception as error:
            await _abort_for_error(context, error)
        return interv_ai_pb2.TranscribeAudioResponse(
            success=True,
            transcript=result.transcript,
            language=result.language or "",
            duration_sec=result.duration_sec or 0,
            provider=result.provider,
            message=result.message or "",
        )

    async def SubmitAnswer(self, request, context):
        await _authorize(context)
        source = request.context
        question_count = _question_count(source.question_count)
        qa_history = [_qa_dict(item) for item in request.qa_history]
        current_qa = _qa_dict(request.current)
        if len(qa_history) > 25:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "qa_history exceeds 25 answers",
            )
        indexed_history = qa_history
        if (
            not indexed_history
            or indexed_history[-1]["questionId"] != current_qa["questionId"]
        ):
            indexed_history = [*indexed_history, current_qa]
        current_index = next(
            (
                index
                for index, item in enumerate(indexed_history)
                if item["questionId"] == current_qa["questionId"]
            ),
            max(0, len(indexed_history) - 1),
        )
        try:
            await get_rag_agent().index_turn(
                _knowledge_record(
                    source=source,
                    run_id=request.run_id,
                    qa_history=indexed_history,
                ),
                current_qa,
                current_index,
            )
        except Exception as error:
            await _abort_for_error(context, error)

        if request.next_question_index >= question_count:
            return interv_ai_pb2.InterviewAnswerResponse(
                success=True,
                feedback_hint="Answer received",
                has_next_question=False,
            )

        usage_token = begin_deepseek_usage("interview_follow_up")
        try:
            payload = InterviewFollowUpRequest(
                run_id=request.run_id,
                session_id=source.session_id,
                question_id=request.current.question_id,
                question=request.current.question,
                answer=request.current.answer,
                title=source.title,
                industry=source.industry,
                job_description=source.job_description,
                topic=source.topic,
                difficulty=source.difficulty or "Middle",
                question_count=question_count,
                next_question_index=request.next_question_index,
                language=source.language or "vi-VN",
                qa_history=qa_history,
            )
            question, provider = await generate_follow_up(payload)
        except Exception as error:
            usage = end_deepseek_usage(usage_token)
            _set_usage_metadata(context, usage)
            await _abort_for_error(context, error)
        usage = end_deepseek_usage(usage_token)

        return interv_ai_pb2.InterviewAnswerResponse(
            success=True,
            feedback_hint="Answer received",
            has_next_question=True,
            next_question=_question_message(question),
            provider=provider,
            usage=_deepseek_usage_message(usage),
        )

    async def EvaluateInterview(self, request, context):
        await _authorize(context)
        source = request.context
        audio = request.audio_analysis
        audio_analysis = None
        if audio.provider:
            audio_analysis = {
                "confidence": audio.confidence,
                "composure": audio.composure,
                "vocal_delivery": audio.vocal_delivery,
                "dominant_emotion": audio.dominant_emotion,
                "observations": list(audio.observations),
                "provider": audio.provider,
            }

        qa_history = [_qa_dict(item) for item in request.qa_history]
        usage_token = begin_deepseek_usage("interview_evaluate")
        try:
            payload = InterviewEvaluateRequest(
                run_id=request.run_id,
                session_id=source.session_id,
                title=source.title,
                industry=source.industry,
                job_description=source.job_description,
                topic=source.topic,
                difficulty=source.difficulty or "Middle",
                language=source.language or "vi-VN",
                qa_history=qa_history,
                audio_analysis=audio_analysis,
            )
            evaluation, provider = await evaluate_interview(payload)
            await get_rag_agent().index_completed_interview(
                _knowledge_record(
                    source=source,
                    run_id=request.run_id,
                    qa_history=qa_history,
                    evaluation=evaluation.model_dump(mode="json"),
                    audio_analysis=audio_analysis,
                )
            )
        except Exception as error:
            usage = end_deepseek_usage(usage_token)
            _set_usage_metadata(context, usage)
            await _abort_for_error(context, error)
        usage = end_deepseek_usage(usage_token)

        ratings = evaluation.ratings
        result_audio = evaluation.audio_analysis or audio_analysis or {}
        return interv_ai_pb2.InterviewEvaluateResponse(
            success=True,
            provider=provider,
            usage=_deepseek_usage_message(usage),
            evaluation=interv_ai_pb2.InterviewEvaluation(
                score=evaluation.score,
                ratings=interv_ai_pb2.EvaluationRatings(
                    communication=_rating(ratings, "communication", "communication"),
                    knowledge=_rating(ratings, "knowledge", "knowledge"),
                    problem_solving=_rating(ratings, "problemSolving", "problem_solving"),
                    confidence=_rating(ratings, "confidence", "confidence"),
                    jd_fit=_rating(ratings, "jdFit", "jd_fit"),
                    composure=_rating(ratings, "composure", "composure"),
                    vocal_delivery=_rating(ratings, "vocalDelivery", "vocal_delivery"),
                ),
                feedback=evaluation.feedback,
                strengths=evaluation.strengths,
                weaknesses=evaluation.weaknesses,
                recommendations=evaluation.recommendations,
                questions=[
                    interv_ai_pb2.EvaluationQuestion(
                        question=item.question,
                        answer=item.answer,
                        score=item.score,
                        feedback=item.feedback,
                        evidence=item.evidence,
                        grounding_ids=item.grounding_ids,
                    )
                    for item in evaluation.questions
                ],
                audio_analysis=interv_ai_pb2.AudioBehaviorAnalysis(
                    confidence=int(result_audio.get("confidence", 0)),
                    composure=int(result_audio.get("composure", 0)),
                    vocal_delivery=int(result_audio.get("vocal_delivery", 0)),
                    dominant_emotion=str(result_audio.get("dominant_emotion", "")),
                    observations=[str(item) for item in result_audio.get("observations", [])],
                    provider=str(result_audio.get("provider", "")),
                ),
                grounding_ids=evaluation.grounding_ids,
            ),
        )

    async def CreateStreamingToken(self, request, context):
        await _authorize(context)
        if not 30 <= (request.expires_in_seconds or 60) <= 600:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "expires_in_seconds must be between 30 and 600",
            )
        if not 60 <= (request.max_session_duration_seconds or 900) <= 3600:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "max_session_duration_seconds must be between 60 and 3600",
            )
        try:
            result = await create_streaming_token(
                expires_in_seconds=request.expires_in_seconds or 60,
                max_session_duration_seconds=request.max_session_duration_seconds or 900,
            )
        except Exception as error:
            await _abort_for_error(context, error)
        return interv_ai_pb2.StreamingTokenResponse(success=True, **result)

    async def AnalyzeInterview(self, request_iterator, context):
        await _authorize(context)
        samples: list[AudioSample] = []
        total_bytes = 0
        async for request in request_iterator:
            if request.audio:
                total_bytes += len(request.audio)
                if (
                    len(samples) >= MAX_AUDIO_ANALYSIS_CHUNKS
                    or total_bytes > MAX_AUDIO_ANALYSIS_BYTES
                ):
                    await context.abort(
                        grpc.StatusCode.RESOURCE_EXHAUSTED,
                        "Audio analysis stream exceeds configured limits",
                    )
                samples.append(
                    AudioSample(
                        question_id=request.question_id,
                        transcript=request.transcript,
                        audio=request.audio,
                        content_type=request.content_type,
                        duration_sec=request.duration_sec,
                    )
                )

        try:
            result = await analyze_audio_behavior(samples)
        except Exception as error:
            await _abort_for_error(context, error)

        return interv_ai_pb2.AudioAnalysisResponse(
            success=True,
            analysis=interv_ai_pb2.AudioBehaviorAnalysis(
                confidence=result.confidence,
                composure=result.composure,
                vocal_delivery=result.vocal_delivery,
                dominant_emotion=result.dominant_emotion,
                observations=result.observations,
                provider=result.provider,
            ),
        )

    async def GetRagStatus(self, request, context):
        await _authorize(context)
        health = await get_rag_agent().health()
        return interv_ai_pb2.RagStatusResponse(
            success=health.ready,
            ready=health.ready,
            backend=health.backend,
            collection=health.collection,
            document_count=health.document_count,
            dense_model=health.dense_model,
            sparse_model=health.sparse_model,
            error=health.error,
        )

    async def SearchKnowledge(self, request, context):
        await _authorize(context)
        if not request.query or len(request.query) > 4_000:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "query must contain between 1 and 4000 characters",
            )
        if len(request.session_id) > 64 or len(request.run_id) > 64:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "session_id or run_id is too long",
            )
        purpose = request.purpose or "question"
        if purpose not in {"question", "follow_up", "evaluation", "audit"}:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "purpose must be question, follow_up, evaluation, or audit",
            )
        if purpose == "audit" and not request.session_id:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "session_id is required for private audit retrieval",
            )
        profile = resolve_profile(request.industry, request.difficulty or "Middle")
        try:
            evidence = await get_rag_agent().retrieve(
                RetrievalQuery(
                    text=request.query,
                    purpose=purpose,
                    industry=profile.industry.name,
                    level=profile.level,
                    tier=profile.tier.index,
                    session_id=request.session_id,
                    run_id=request.run_id,
                    top_k=max(1, min(request.limit or 8, 20)),
                )
            )
        except Exception as error:
            await _abort_for_error(context, error)
        return interv_ai_pb2.RagSearchResponse(
            success=True,
            evidence=[
                interv_ai_pb2.RagEvidence(
                    grounding_id=item.grounding_id,
                    title=item.title,
                    text=item.text,
                    score=item.score,
                    document_type=item.document_type,
                    industry=item.industry,
                    level=item.level,
                    source_ids=item.source_ids,
                    run_id=item.run_id,
                )
                for item in evidence
            ],
        )

    async def DeleteKnowledge(self, request, context):
        await _authorize(context)
        if not request.session_id and not request.run_id:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "session_id or run_id is required",
            )
        try:
            deleted_count = await get_rag_agent().delete_interview_knowledge(
                session_id=request.session_id,
                run_id=request.run_id,
            )
        except Exception as error:
            await _abort_for_error(context, error)
        return interv_ai_pb2.RagDeleteResponse(
            success=True,
            deleted_count=deleted_count,
        )

    async def GetDeepSeekBalance(self, request, context):
        await _authorize(context)
        try:
            result = await get_deepseek_balance()
        except Exception as error:
            await _abort_for_error(context, error)
        return interv_ai_pb2.DeepSeekBalanceResponse(
            success=True,
            is_available=result["is_available"],
            balances=[
                interv_ai_pb2.DeepSeekBalanceInfo(
                    currency=item["currency"],
                    total_balance=item["total_balance"],
                    granted_balance=item["granted_balance"],
                    topped_up_balance=item["topped_up_balance"],
                )
                for item in result["balances"]
            ],
            fast_model=result["fast_model"],
            eval_model=result["eval_model"],
            checked_at=datetime.now(UTC).isoformat(),
        )


async def start_grpc_server() -> grpc.aio.Server:
    settings = get_settings()
    server = grpc.aio.server(
        options=[
            ("grpc.max_receive_message_length", MAX_GRPC_MESSAGE_BYTES),
            ("grpc.max_send_message_length", MAX_GRPC_MESSAGE_BYTES),
        ]
    )
    interv_ai_pb2_grpc.add_IntervAiServicer_to_server(IntervAiService(), server)
    address = f"{settings.grpc_host}:{settings.grpc_port}"
    if settings.grpc_tls_cert_path and settings.grpc_tls_key_path:
        private_key = Path(settings.grpc_tls_key_path).read_bytes()
        certificate_chain = Path(settings.grpc_tls_cert_path).read_bytes()
        client_ca = (
            Path(settings.grpc_tls_client_ca_path).read_bytes()
            if settings.grpc_tls_client_ca_path
            else None
        )
        credentials = grpc.ssl_server_credentials(
            [(private_key, certificate_chain)],
            root_certificates=client_ca,
            require_client_auth=client_ca is not None,
        )
        bound_port = server.add_secure_port(address, credentials)
    else:
        bound_port = server.add_insecure_port(address)
    if bound_port == 0:
        raise RuntimeError(f"Could not bind gRPC server to {address}")
    await server.start()
    return server
