from typing import Literal

from pydantic import BaseModel, Field


class VoiceInfo(BaseModel):
    id: str
    name: str
    locale: str
    gender: str | None = None
    description: str | None = None


class VoicesResponse(BaseModel):
    success: bool = True
    voices: list[VoiceInfo]


class TtsPreviewRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    language: str = "vi-VN"
    voice_id: str


class TtsPreviewResponse(BaseModel):
    success: bool = True
    audio_base64: str
    content_type: str = "audio/mpeg"
    cached: bool = False


class NormalizedJd(BaseModel):
    title: str | None = None
    company: str | None = None
    responsibilities: list[str] = []
    requirements: list[str] = []
    skills: list[str] = []
    seniority: str | None = None
    language: str | None = None


class JdExtractResponse(BaseModel):
    success: bool = True
    markdown: str
    normalized: NormalizedJd


class InterviewStartRequest(BaseModel):
    session_id: str
    title: str
    industry: str = ""
    job_description: str = ""
    topic: str = ""
    difficulty: str = "Middle"
    duration: int = Field(default=3, ge=1, le=25)
    language: str = "vi-VN"
    voice_id: str = "vi-VN-HoaiMyNeural"


class GeneratedQuestion(BaseModel):
    id: str
    text: str
    competency: str
    difficulty: str | None = None
    expected_signals: list[str] = []


class InterviewStartResponse(BaseModel):
    success: bool = True
    run_id: str
    questions: list[GeneratedQuestion]
    provider: Literal["deepseek", "fallback"] = "fallback"


class TranscribeResponse(BaseModel):
    success: bool = True
    transcript: str
    language: str | None = None
    duration_sec: float | None = None
    provider: Literal["faster-whisper", "fallback"] = "fallback"
    message: str | None = None


class InterviewAnswerRequest(BaseModel):
    run_id: str
    question_id: str
    question: str
    answer: str
    language: str = "vi-VN"


class InterviewAnswerResponse(BaseModel):
    success: bool = True
    feedback_hint: str | None = None


class EvaluationQuestion(BaseModel):
    question: str
    answer: str
    score: int
    feedback: str
    evidence: list[str] = []


class InterviewEvaluation(BaseModel):
    score: int
    ratings: dict[str, int]
    feedback: str
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    questions: list[EvaluationQuestion]


class InterviewEvaluateRequest(BaseModel):
    run_id: str
    title: str
    industry: str = ""
    job_description: str = ""
    topic: str = ""
    difficulty: str = "Middle"
    language: str = "vi-VN"
    qa_history: list[dict[str, str]]


class InterviewEvaluateResponse(BaseModel):
    success: bool = True
    evaluation: InterviewEvaluation
    provider: Literal["deepseek", "fallback"] = "fallback"
