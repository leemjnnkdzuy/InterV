from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal


DocumentType = Literal[
    "rule_chunk",
    "session_context",
    "interview_turn",
    "question_pattern",
    "interview_evaluation",
]
AccessScope = Literal["public", "corpus", "private"]
RetrievalPurpose = Literal["question", "follow_up", "evaluation", "audit"]


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


@dataclass(frozen=True)
class KnowledgeDocument:
    document_id: str
    title: str
    text: str
    document_type: DocumentType
    access_scope: AccessScope
    industry: str = "*"
    level: str = "*"
    tier: int = 0
    source_ids: tuple[str, ...] = ()
    run_id: str = ""
    session_id: str = ""
    question_id: str = ""
    question_index: int = -1
    language: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=utc_now_iso)


@dataclass(frozen=True)
class RetrievedEvidence:
    grounding_id: str
    title: str
    text: str
    score: float
    document_type: str
    industry: str
    level: str
    source_ids: tuple[str, ...]
    run_id: str = ""

    def prompt_block(self, max_characters: int = 2_400) -> str:
        content = self.text.strip()
        if len(content) > max_characters:
            content = content[: max_characters - 1].rstrip() + "…"
        return (
            f'<EVIDENCE id="{self.grounding_id}" '
            f'type="{self.document_type}" score="{self.score:.6f}">\n'
            f"Title: {self.title}\n"
            f"Industry: {self.industry}; Level: {self.level}\n"
            f"Sources: {', '.join(self.source_ids) or 'internal'}\n"
            f"{content}\n"
            "</EVIDENCE>"
        )


@dataclass(frozen=True)
class RetrievalQuery:
    text: str
    purpose: RetrievalPurpose
    industry: str
    level: str
    tier: int
    session_id: str = ""
    run_id: str = ""
    top_k: int = 8


@dataclass(frozen=True)
class InterviewKnowledgeRecord:
    run_id: str
    session_id: str
    title: str
    industry: str
    level: str
    tier: int
    language: str
    job_description: str = ""
    topic: str = ""
    qa_history: tuple[dict[str, Any], ...] = ()
    evaluation: dict[str, Any] | None = None
    audio_analysis: dict[str, Any] | None = None


@dataclass(frozen=True)
class RagHealth:
    ready: bool
    backend: str
    collection: str
    document_count: int
    dense_model: str
    sparse_model: str
    error: str = ""
