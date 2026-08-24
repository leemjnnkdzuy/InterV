from typing import Literal

from pydantic import BaseModel, Field


class VoiceInfo(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=200)
    locale: str = Field(min_length=2, max_length=20)
    gender: str | None = None
    description: str | None = None
    demo_url: str | None = None


class VoicesResponse(BaseModel):
    success: bool = True
    voices: list[VoiceInfo]


class TtsPreviewRequest(BaseModel):
    # Interview turns can contain a short acknowledgement and bridge before
    # the question. Keep one bounded provider request instead of truncating
    # the spoken turn in the browser.
    text: str = Field(min_length=1, max_length=1_200)
    language: str = Field(default="vi-VN", min_length=2, max_length=20)
    voice_id: str = Field(min_length=1, max_length=120)


class TtsPreviewResponse(BaseModel):
    success: bool = True
    audio_base64: str
    content_type: str = "audio/mpeg"
    cached: bool = False


class NormalizedJd(BaseModel):
    title: str | None = None
    company: str | None = None
    responsibilities: list[str] = Field(default_factory=list, max_length=20)
    requirements: list[str] = Field(default_factory=list, max_length=20)
    skills: list[str] = Field(default_factory=list, max_length=50)
    seniority: str | None = None
    language: str | None = None


class JdExtractResponse(BaseModel):
    success: bool = True
    markdown: str
    normalized: NormalizedJd


class InterviewStartRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    industry: str = Field(default="", max_length=120)
    job_description: str = Field(default="", max_length=50_000)
    topic: str = Field(default="", max_length=2_000)
    difficulty: str = Field(default="Middle", min_length=1, max_length=80)
    requested_questions: int = Field(default=1, ge=1, le=25)
    question_count: int = Field(default=5, ge=5, le=25)
    language: str = Field(default="vi-VN", min_length=2, max_length=20)
    voice_id: str = Field(
        default="hn_female_ngochuyen_full_48k-fhg",
        min_length=1,
        max_length=120,
    )
    candidate_profile: str = Field(default="", max_length=10_000)


class GeneratedQuestion(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=500)
    tts_text: str = Field(default="", max_length=1_000)
    competency: str = Field(min_length=1, max_length=120)
    difficulty: str | None = Field(default=None, max_length=80)
    expected_signals: list[str] = Field(default_factory=list, max_length=20)
    grounding_ids: list[str] = Field(default_factory=list, max_length=30)


class InterviewStartResponse(BaseModel):
    success: bool = True
    run_id: str
    questions: list[GeneratedQuestion]
    provider: Literal["deepseek"] = "deepseek"


class InterviewOpeningRequest(BaseModel):
    run_id: str = Field(min_length=1, max_length=64)
    session_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    industry: str = Field(default="", max_length=120)
    job_description: str = Field(default="", max_length=50_000)
    topic: str = Field(default="", max_length=2_000)
    difficulty: str = Field(default="Middle", min_length=1, max_length=80)
    question_count: int = Field(default=5, ge=5, le=25)
    language: str = Field(default="vi-VN", min_length=2, max_length=20)
    opening_prompt: str = Field(min_length=1, max_length=1_000)
    opening_transcript: str = Field(min_length=1, max_length=20_000)
    candidate_profile: str = Field(default="", max_length=10_000)


class InterviewTransition(BaseModel):
    acknowledgement_text: str = Field(min_length=1, max_length=300)
    transition_text: str = Field(min_length=1, max_length=500)
    transition_type: Literal[
        "opening_to_first",
        "continue_competency",
        "probe_gap",
        "bridge_to_next_competency",
    ]


class TranscribeResponse(BaseModel):
    success: bool = True
    transcript: str
    language: str | None = None
    duration_sec: float | None = None
    provider: Literal["faster-whisper"] = "faster-whisper"
    message: str | None = None


class InterviewAnswerRequest(BaseModel):
    run_id: str = Field(min_length=1, max_length=64)
    question_id: str = Field(min_length=1, max_length=64)
    question: str = Field(min_length=1, max_length=1_500)
    answer: str = Field(min_length=1, max_length=20_000)
    language: str = Field(default="vi-VN", min_length=2, max_length=20)


class InterviewFollowUpRequest(InterviewAnswerRequest):
    session_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    industry: str = Field(default="", max_length=120)
    job_description: str = Field(default="", max_length=50_000)
    topic: str = Field(default="", max_length=2_000)
    difficulty: str = Field(default="Middle", min_length=1, max_length=80)
    question_count: int = Field(default=5, ge=5, le=25)
    next_question_index: int = Field(ge=1, le=24)
    qa_history: list[dict[str, object]] = Field(
        default_factory=list,
        max_length=25,
    )
    candidate_profile: str = Field(default="", max_length=10_000)


class InterviewAnswerResponse(BaseModel):
    success: bool = True
    feedback_hint: str | None = None
    has_next_question: bool = False
    next_question: GeneratedQuestion | None = None
    acknowledgement_text: str | None = None
    transition_text: str | None = None
    spoken_text: str | None = None
    transition_type: str | None = None
    provider: Literal["deepseek"] = "deepseek"


class EvaluationQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=1_500)
    answer: str = Field(max_length=20_000)
    score: int = Field(ge=0, le=100)
    feedback: str = Field(max_length=5_000)
    evidence: list[str] = Field(default_factory=list, max_length=30)
    grounding_ids: list[str] = Field(default_factory=list, max_length=30)


class InterviewEvaluation(BaseModel):
    score: int = Field(ge=0, le=100)
    ratings: dict[str, int]
    feedback: str = Field(max_length=10_000)
    strengths: list[str] = Field(max_length=30)
    weaknesses: list[str] = Field(max_length=30)
    mistakes: list[str] = Field(default_factory=list, max_length=30)
    recommendations: list[str] = Field(max_length=30)
    questions: list[EvaluationQuestion] = Field(min_length=5, max_length=25)
    audio_analysis: dict[str, object] | None = None
    grounding_ids: list[str] = Field(default_factory=list, max_length=50)


class InterviewEvaluateRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    run_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=200)
    industry: str = Field(default="", max_length=120)
    job_description: str = Field(default="", max_length=50_000)
    topic: str = Field(default="", max_length=2_000)
    difficulty: str = Field(default="Middle", min_length=1, max_length=80)
    language: str = Field(default="vi-VN", min_length=2, max_length=20)
    qa_history: list[dict[str, object]] = Field(min_length=5, max_length=25)
    audio_analysis: dict[str, object] | None = None
    candidate_profile: str = Field(default="", max_length=10_000)


class InterviewEvaluateResponse(BaseModel):
    success: bool = True
    evaluation: InterviewEvaluation
    provider: Literal["deepseek"] = "deepseek"


class CandidateProfileItem(BaseModel):
    category: str = Field(min_length=1, max_length=60)
    label: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=1_500)
    evidence: list[str] = Field(default_factory=list, max_length=5)


class CandidateProfileRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=20_000)
    title: str = Field(min_length=1, max_length=200)
    job_description: str = Field(default="", max_length=50_000)
    language: str = Field(default="vi-VN", min_length=2, max_length=20)
    candidate_profile: str = Field(default="", max_length=10_000)
