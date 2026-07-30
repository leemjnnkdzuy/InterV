from __future__ import annotations

import asyncio
import json
import re
from functools import lru_cache
from typing import Iterable

from app.config import get_settings
from app.rag.embeddings import FastEmbedProvider
from app.rag.models import (
    InterviewKnowledgeRecord,
    KnowledgeDocument,
    RagHealth,
    RetrievalQuery,
    RetrievedEvidence,
)
from app.rag.store import QdrantKnowledgeStore
from app.rules import RuleCatalog, RuleDocument, get_rule_catalog, resolve_profile


HEADING_PATTERN = re.compile(r"^(#{1,3})\s+(.+?)\s*$", re.MULTILINE)


def _chunk_markdown(
    document: RuleDocument,
    *,
    max_characters: int = 2_200,
) -> list[KnowledgeDocument]:
    content = document.content.strip()
    matches = list(HEADING_PATTERN.finditer(content))
    sections: list[tuple[str, str]] = []
    if not matches:
        sections.append((document.rule_id, content))
    else:
        preamble = content[: matches[0].start()].strip()
        if preamble:
            sections.append((document.rule_id, preamble))
        for index, match in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(content)
            title = match.group(2).strip()
            section = content[match.start() : end].strip()
            sections.append((title, section))

    chunks: list[KnowledgeDocument] = []
    chunk_index = 0
    for section_title, section in sections:
        paragraphs = [item.strip() for item in re.split(r"\n\s*\n", section) if item.strip()]
        current = ""
        for paragraph in paragraphs:
            candidate = f"{current}\n\n{paragraph}".strip()
            if current and len(candidate) > max_characters:
                chunk_index += 1
                chunks.append(
                    _rule_chunk(document, chunk_index, section_title, current)
                )
                current = paragraph
            else:
                current = candidate
        if current:
            chunk_index += 1
            chunks.append(_rule_chunk(document, chunk_index, section_title, current))
    return chunks


def _rule_chunk(
    document: RuleDocument,
    chunk_index: int,
    section_title: str,
    text: str,
) -> KnowledgeDocument:
    return KnowledgeDocument(
        document_id=f"{document.rule_id}#chunk-{chunk_index:03d}",
        title=f"{document.rule_id} / {section_title}",
        text=text,
        document_type="rule_chunk",
        access_scope="public",
        industry=document.industry,
        level=document.level,
        tier=document.tier,
        source_ids=document.source_ids,
        metadata={
            "rule_id": document.rule_id,
            "kind": document.kind,
            "path": document.path.as_posix(),
            "chunk_index": chunk_index,
        },
    )


def _compact_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def _qa_value(qa: dict[str, object], *keys: str) -> str:
    for key in keys:
        value = qa.get(key)
        if value is not None:
            return str(value)
    return ""


class InterviewRagAgent:
    def __init__(
        self,
        *,
        store: QdrantKnowledgeStore,
        rule_catalog: RuleCatalog | None = None,
        top_k: int = 8,
        candidate_limit: int = 32,
    ) -> None:
        self.store = store
        self.rule_catalog = rule_catalog or get_rule_catalog()
        self.top_k = top_k
        self.candidate_limit = candidate_limit
        self._ready = False
        self._initialization_error = ""
        self._lock = asyncio.Lock()

    async def initialize(self) -> RagHealth:
        if self._ready:
            return await self.health(initialize=False)
        async with self._lock:
            if self._ready:
                return await self.health(initialize=False)
            try:
                self.rule_catalog.validate()
                await asyncio.to_thread(self.store.initialize)
                rule_documents = [
                    chunk
                    for document in self.rule_catalog.all_documents()
                    for chunk in _chunk_markdown(document)
                ]
                await asyncio.to_thread(
                    self.store.sync_rule_documents,
                    rule_documents,
                )
                self._ready = True
                self._initialization_error = ""
            except Exception as error:
                self._initialization_error = str(error)
                raise RuntimeError(
                    f"Mandatory backend RAG initialization failed: {error}"
                ) from error
        return await self.health(initialize=False)

    async def ensure_ready(self) -> None:
        if not self._ready:
            await self.initialize()

    async def health(self, *, initialize: bool = True) -> RagHealth:
        if initialize and not self._ready:
            try:
                await self.initialize()
            except Exception:
                pass
        count = 0
        if self._ready:
            count = await asyncio.to_thread(self.store.count)
        return RagHealth(
            ready=self._ready,
            backend=self.store.backend_label,
            collection=self.store.collection_name,
            document_count=count,
            dense_model=self.store.embedding_provider.dense_model_name,
            sparse_model=self.store.embedding_provider.sparse_model_name,
            error=self._initialization_error,
        )

    async def retrieve(self, query: RetrievalQuery) -> list[RetrievedEvidence]:
        await self.ensure_ready()
        evidence = await asyncio.to_thread(
            self.store.search,
            query,
            candidate_limit=self.candidate_limit,
        )
        if not evidence:
            raise RuntimeError(
                "Mandatory RAG returned no evidence for the selected interview profile"
            )
        if (
            query.purpose != "audit"
            and not any(item.document_type == "rule_chunk" for item in evidence)
        ):
            raise RuntimeError(
                "Mandatory RAG did not return a rule chunk; refusing ungrounded generation"
            )
        return evidence

    async def retrieve_for_interview(
        self,
        *,
        purpose: str,
        title: str,
        industry: str,
        level: str,
        job_description: str,
        topic: str,
        session_id: str,
        run_id: str = "",
        latest_question: str = "",
        latest_answer: str = "",
        top_k: int = 8,
    ) -> list[RetrievedEvidence]:
        profile = resolve_profile(industry, level)
        query_text = "\n".join(
            item
            for item in (
                f"Purpose: {purpose}",
                f"Role: {title}",
                f"Industry: {profile.industry.name}",
                f"Level: {profile.level}; Tier: {profile.tier.index}",
                f"Topic: {topic}",
                f"Job description: {job_description[:8_000]}",
                f"Latest question: {latest_question}",
                f"Latest answer evidence gaps: {latest_answer[:2_000]}",
                (
                    "Need structured, job-related, evidence-seeking interview content "
                    "with behavioral anchors and no sensitive attributes."
                ),
            )
            if item and not item.endswith(": ")
        )
        return await self.retrieve(
            RetrievalQuery(
                text=query_text,
                purpose=purpose,  # type: ignore[arg-type]
                industry=profile.industry.name,
                level=profile.level,
                tier=profile.tier.index,
                session_id=session_id,
                run_id=run_id,
                top_k=top_k,
            )
        )

    @staticmethod
    def render_evidence(
        evidence: Iterable[RetrievedEvidence],
        *,
        max_characters: int = 18_000,
    ) -> str:
        blocks: list[str] = []
        total = 0
        for item in evidence:
            block = item.prompt_block()
            if blocks and total + len(block) > max_characters:
                break
            blocks.append(block)
            total += len(block)
        return "\n\n".join(blocks)

    async def index_session_context(
        self,
        record: InterviewKnowledgeRecord,
    ) -> int:
        await self.ensure_ready()
        text = "\n".join(
            (
                f"Role: {record.title}",
                f"Industry: {record.industry}",
                f"Level: {record.level}",
                f"Topic: {record.topic}",
                "Job description:",
                record.job_description or "(not provided)",
            )
        )
        document = KnowledgeDocument(
            document_id=f"interview:{record.run_id}:context",
            title=f"Private interview context / {record.title}",
            text=text,
            document_type="session_context",
            access_scope="private",
            industry=record.industry,
            level=record.level,
            tier=record.tier,
            run_id=record.run_id,
            session_id=record.session_id,
            language=record.language,
            metadata={"topic": record.topic},
        )
        return await asyncio.to_thread(self.store.upsert, [document])

    async def index_turn(
        self,
        record: InterviewKnowledgeRecord,
        qa: dict[str, object],
        question_index: int,
    ) -> int:
        await self.ensure_ready()
        question_id = _qa_value(qa, "questionId", "question_id") or f"q_{question_index + 1}"
        question = _qa_value(qa, "question")
        answer = _qa_value(qa, "answer")
        document = KnowledgeDocument(
            document_id=f"interview:{record.run_id}:turn:{question_id}",
            title=f"Private interview turn {question_index + 1}",
            text=(
                f"Question: {question}\n"
                f"Candidate answer: {answer or '(empty answer)'}"
            ),
            document_type="interview_turn",
            access_scope="private",
            industry=record.industry,
            level=record.level,
            tier=record.tier,
            run_id=record.run_id,
            session_id=record.session_id,
            question_id=question_id,
            question_index=question_index,
            language=record.language,
            metadata={"has_answer": bool(answer.strip())},
        )
        return await asyncio.to_thread(self.store.upsert, [document])

    async def index_completed_interview(
        self,
        record: InterviewKnowledgeRecord,
    ) -> int:
        await self.ensure_ready()
        documents: list[KnowledgeDocument] = []
        evaluation = record.evaluation or {}
        question_evaluations = evaluation.get("questions", [])
        if not isinstance(question_evaluations, list):
            question_evaluations = []

        for index, qa in enumerate(record.qa_history):
            question_id = _qa_value(qa, "questionId", "question_id") or f"q_{index + 1}"
            question = _qa_value(qa, "question")
            evaluation_item = (
                question_evaluations[index]
                if index < len(question_evaluations)
                and isinstance(question_evaluations[index], dict)
                else {}
            )
            score = int(evaluation_item.get("score", 0) or 0)
            if question and score >= 50:
                documents.append(
                    KnowledgeDocument(
                        document_id=f"interview:{record.run_id}:pattern:{question_id}",
                        title=(
                            f"De-identified question pattern / {record.industry} / "
                            f"{record.level}"
                        ),
                        text=(
                            f"Interview question: {question}\n"
                            f"Profile: {record.industry} / {record.level}\n"
                            f"Observed answer score: {score}/100.\n"
                            "Candidate answer is intentionally excluded."
                        ),
                        document_type="question_pattern",
                        access_scope="corpus",
                        industry=record.industry,
                        level=record.level,
                        tier=record.tier,
                        source_ids=(record.run_id,),
                        run_id=record.run_id,
                        session_id=record.session_id,
                        question_id=question_id,
                        question_index=index,
                        language=record.language,
                        metadata={
                            "score": score,
                            "deidentified": True,
                            "answer_included": False,
                        },
                    )
                )

        documents.append(
            KnowledgeDocument(
                document_id=f"interview:{record.run_id}:evaluation",
                title=f"Private interview evaluation / {record.title}",
                text=(
                    "Evaluation:\n"
                    f"{_compact_json(evaluation)}\n"
                    "Audio behavior analysis:\n"
                    f"{_compact_json(record.audio_analysis or {})}"
                ),
                document_type="interview_evaluation",
                access_scope="private",
                industry=record.industry,
                level=record.level,
                tier=record.tier,
                run_id=record.run_id,
                session_id=record.session_id,
                language=record.language,
                metadata={
                    "score": int(evaluation.get("score", 0) or 0),
                    "qa_count": len(record.qa_history),
                },
            )
        )
        return await asyncio.to_thread(self.store.upsert, documents)

    async def audit_session(
        self,
        *,
        session_id: str,
        industry: str,
        level: str,
        query_text: str,
        top_k: int = 20,
    ) -> list[RetrievedEvidence]:
        profile = resolve_profile(industry, level)
        return await self.retrieve(
            RetrievalQuery(
                text=query_text,
                purpose="audit",
                industry=profile.industry.name,
                level=profile.level,
                tier=profile.tier.index,
                session_id=session_id,
                top_k=top_k,
            )
        )

    async def rebuild(self) -> RagHealth:
        async with self._lock:
            await asyncio.to_thread(self.store.delete_collection)
            self._ready = False
            self._initialization_error = ""
        return await self.initialize()

    async def delete_interview_knowledge(
        self,
        *,
        session_id: str = "",
        run_id: str = "",
    ) -> int:
        await self.ensure_ready()
        return await asyncio.to_thread(
            self.store.delete_interview_knowledge,
            session_id=session_id,
            run_id=run_id,
        )


@lru_cache(maxsize=1)
def get_rag_agent() -> InterviewRagAgent:
    settings = get_settings()
    if not settings.rag_enabled:
        raise RuntimeError(
            "RAG_ENABLED=false is not permitted: grounded interview generation is mandatory"
        )
    embedding_provider = FastEmbedProvider(
        dense_model=settings.rag_dense_model,
        sparse_model=settings.rag_sparse_model,
        cache_dir=settings.rag_model_cache_dir or None,
    )
    store = QdrantKnowledgeStore(
        collection_name=settings.qdrant_collection,
        embedding_provider=embedding_provider,
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
        local_path=settings.qdrant_path,
    )
    return InterviewRagAgent(
        store=store,
        top_k=settings.rag_top_k,
        candidate_limit=settings.rag_candidate_limit,
    )
