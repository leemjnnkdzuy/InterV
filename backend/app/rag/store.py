from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Iterable

from app.rag.embeddings import EmbeddingProvider
from app.rag.models import KnowledgeDocument, RetrievalQuery, RetrievedEvidence


DENSE_VECTOR_NAME = "dense"
SPARSE_VECTOR_NAME = "sparse"
POINT_NAMESPACE = uuid.UUID("1cf12673-0ff2-4ece-aec9-46e2f5bc209b")


def _checksum(document: KnowledgeDocument) -> str:
    serialized = json.dumps(
        {
            "id": document.document_id,
            "text": document.text,
            "type": document.document_type,
            "scope": document.access_scope,
            "industry": document.industry,
            "level": document.level,
            "tier": document.tier,
            "sources": document.source_ids,
            "metadata": document.metadata,
        },
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _point_id(document_id: str) -> str:
    return str(uuid.uuid5(POINT_NAMESPACE, document_id))


class QdrantKnowledgeStore:
    def __init__(
        self,
        *,
        collection_name: str,
        embedding_provider: EmbeddingProvider,
        url: str = "",
        api_key: str = "",
        local_path: str = "",
        client=None,
    ) -> None:
        self.collection_name = collection_name
        self.embedding_provider = embedding_provider
        self.url = url
        self.api_key = api_key
        self.local_path = local_path
        self._client = client
        self.backend_label = url or f"qdrant-local:{local_path}"

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            from qdrant_client import QdrantClient
        except ImportError as error:
            raise RuntimeError(
                'RAG requires qdrant-client[fastembed]. Install backend requirements.'
            ) from error

        if self.url:
            self._client = QdrantClient(
                url=self.url,
                api_key=self.api_key or None,
                timeout=30,
                prefer_grpc=True,
            )
        else:
            path = Path(self.local_path or "./data/qdrant").resolve()
            path.mkdir(parents=True, exist_ok=True)
            self._client = QdrantClient(path=str(path))
            self.backend_label = f"qdrant-local:{path}"
        return self._client

    def initialize(self) -> None:
        from qdrant_client import models

        client = self._get_client()
        if not client.collection_exists(self.collection_name):
            client.create_collection(
                collection_name=self.collection_name,
                vectors_config={
                    DENSE_VECTOR_NAME: models.VectorParams(
                        size=self.embedding_provider.dense_size,
                        distance=models.Distance.COSINE,
                    )
                },
                sparse_vectors_config={
                    SPARSE_VECTOR_NAME: models.SparseVectorParams(
                        modifier=models.Modifier.IDF,
                    )
                },
            )
            return

        collection = client.get_collection(self.collection_name)
        vectors = collection.config.params.vectors
        dense_config = (
            vectors.get(DENSE_VECTOR_NAME)
            if isinstance(vectors, dict)
            else None
        )
        existing_size = getattr(dense_config, "size", None)
        if existing_size != self.embedding_provider.dense_size:
            raise RuntimeError(
                f"Qdrant collection {self.collection_name} has dense size "
                f"{existing_size}, expected {self.embedding_provider.dense_size}. "
                "Use a new collection name or rebuild the RAG index."
            )

    @staticmethod
    def _payload(document: KnowledgeDocument) -> dict[str, object]:
        return {
            "document_id": document.document_id,
            "title": document.title,
            "text": document.text,
            "document_type": document.document_type,
            "access_scope": document.access_scope,
            "industry": document.industry,
            "level": document.level,
            "tier": document.tier,
            "source_ids": list(document.source_ids),
            "run_id": document.run_id,
            "session_id": document.session_id,
            "question_id": document.question_id,
            "question_index": document.question_index,
            "language": document.language,
            "metadata": document.metadata,
            "created_at": document.created_at,
            "checksum": _checksum(document),
            "dense_model": "",
            "sparse_model": "",
        }

    def _existing_checksums(self, documents: list[KnowledgeDocument]) -> dict[str, str]:
        if not documents:
            return {}
        client = self._get_client()
        points = client.retrieve(
            collection_name=self.collection_name,
            ids=[_point_id(document.document_id) for document in documents],
            with_payload=["document_id", "checksum"],
            with_vectors=False,
        )
        return {
            str(point.payload.get("document_id")): str(point.payload.get("checksum"))
            for point in points
            if point.payload
        }

    def upsert(self, documents: Iterable[KnowledgeDocument]) -> int:
        from qdrant_client import models

        items = list(documents)
        if not items:
            return 0
        existing = self._existing_checksums(items)
        changed = [
            document
            for document in items
            if existing.get(document.document_id) != _checksum(document)
        ]
        if not changed:
            return 0

        texts = [document.text for document in changed]
        dense_vectors = self.embedding_provider.embed_documents(texts)
        sparse_vectors = self.embedding_provider.sparse_documents(texts)
        points: list[models.PointStruct] = []
        for document, dense, sparse in zip(
            changed, dense_vectors, sparse_vectors, strict=True
        ):
            payload = self._payload(document)
            payload["dense_model"] = self.embedding_provider.dense_model_name
            payload["sparse_model"] = self.embedding_provider.sparse_model_name
            points.append(
                models.PointStruct(
                    id=_point_id(document.document_id),
                    vector={
                        DENSE_VECTOR_NAME: dense,
                        SPARSE_VECTOR_NAME: models.SparseVector(
                            indices=sparse.indices,
                            values=sparse.values,
                        ),
                    },
                    payload=payload,
                )
            )
        self._get_client().upsert(
            collection_name=self.collection_name,
            points=points,
            wait=True,
        )
        return len(points)

    def sync_rule_documents(
        self,
        documents: Iterable[KnowledgeDocument],
    ) -> dict[str, int]:
        from qdrant_client import models

        items = list(documents)
        expected_ids = {document.document_id for document in items}
        existing: dict[str, str] = {}
        offset = None
        while True:
            points, offset = self._get_client().scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_type",
                            match=models.MatchValue(value="rule_chunk"),
                        )
                    ]
                ),
                limit=256,
                offset=offset,
                with_payload=["document_id"],
                with_vectors=False,
            )
            for point in points:
                if point.payload:
                    document_id = str(point.payload.get("document_id", ""))
                    if document_id:
                        existing[document_id] = str(point.id)
            if offset is None:
                break

        stale_ids = sorted(set(existing) - expected_ids)
        if stale_ids:
            self._get_client().delete(
                collection_name=self.collection_name,
                points_selector=models.PointIdsList(
                    points=[existing[document_id] for document_id in stale_ids]
                ),
                wait=True,
            )
        changed = self.upsert(items)
        return {
            "upserted": changed,
            "deleted": len(stale_ids),
            "total": len(items),
        }

    @staticmethod
    def _access_policy(query: RetrievalQuery) -> tuple[list[str], list[str]]:
        if query.purpose in {"question", "follow_up"}:
            return ["rule_chunk", "question_pattern"], ["public", "corpus"]
        if query.purpose == "evaluation":
            return ["rule_chunk"], ["public"]
        return [
            "rule_chunk",
            "session_context",
            "interview_turn",
            "question_pattern",
            "interview_evaluation",
        ], ["public", "corpus", "private"]

    @classmethod
    def _filter(cls, query: RetrievalQuery):
        from qdrant_client import models

        document_types, access_scopes = cls._access_policy(query)

        must = [
            models.FieldCondition(
                key="document_type",
                match=models.MatchAny(any=document_types),
            ),
            models.FieldCondition(
                key="access_scope",
                match=models.MatchAny(any=access_scopes),
            ),
            models.FieldCondition(
                key="industry",
                match=models.MatchAny(any=[query.industry, "*"]),
            ),
            models.FieldCondition(
                key="level",
                match=models.MatchAny(any=[query.level, "*"]),
            ),
            models.FieldCondition(
                key="tier",
                match=models.MatchAny(any=[query.tier, 0]),
            ),
        ]
        if query.purpose == "audit" and query.session_id:
            must.append(
                models.FieldCondition(
                    key="session_id",
                    match=models.MatchValue(value=query.session_id),
                )
            )

        return models.Filter(must=must)

    def search(
        self,
        query: RetrievalQuery,
        *,
        candidate_limit: int = 32,
    ) -> list[RetrievedEvidence]:
        from qdrant_client import models

        dense = self.embedding_provider.embed_query(query.text)
        sparse = self.embedding_provider.sparse_query(query.text)
        query_filter = self._filter(query)
        response = self._get_client().query_points(
            collection_name=self.collection_name,
            prefetch=[
                models.Prefetch(
                    query=dense,
                    using=DENSE_VECTOR_NAME,
                    filter=query_filter,
                    limit=candidate_limit,
                ),
                models.Prefetch(
                    query=models.SparseVector(
                        indices=sparse.indices,
                        values=sparse.values,
                    ),
                    using=SPARSE_VECTOR_NAME,
                    filter=query_filter,
                    limit=candidate_limit,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            query_filter=query_filter,
            limit=candidate_limit,
            with_payload=True,
            with_vectors=False,
        )

        scored: list[tuple[float, RetrievedEvidence]] = []
        seen_checksums: set[str] = set()
        allowed_types, allowed_scopes = self._access_policy(query)
        for point in response.points:
            payload = point.payload or {}
            document_type = str(payload.get("document_type", ""))
            access_scope = str(payload.get("access_scope", ""))
            if document_type not in allowed_types or access_scope not in allowed_scopes:
                continue
            payload_industry = str(payload.get("industry", "*"))
            payload_level = str(payload.get("level", "*"))
            payload_tier = int(payload.get("tier", 0) or 0)
            if payload_industry not in {query.industry, "*"}:
                continue
            if payload_level not in {query.level, "*"}:
                continue
            if payload_tier not in {query.tier, 0}:
                continue
            if (
                query.purpose == "audit"
                and query.session_id
                and str(payload.get("session_id", "")) != query.session_id
            ):
                continue
            text = str(payload.get("text", "")).strip()
            document_id = str(payload.get("document_id", "")).strip()
            if not text or not document_id:
                continue
            checksum = str(payload.get("checksum", ""))
            if checksum and checksum in seen_checksums:
                continue
            seen_checksums.add(checksum)
            score = float(point.score or 0.0)
            industry = payload_industry
            level = payload_level
            rerank_score = score
            if industry == query.industry:
                rerank_score += 0.08
            elif industry == "*":
                rerank_score += 0.03
            if level == query.level:
                rerank_score += 0.05
            if payload_tier == query.tier:
                rerank_score += 0.02
            evidence = RetrievedEvidence(
                grounding_id=document_id,
                title=str(payload.get("title", document_id)),
                text=text,
                score=rerank_score,
                document_type=document_type,
                industry=industry,
                level=level,
                source_ids=tuple(
                    str(item) for item in payload.get("source_ids", [])
                ),
                run_id=str(payload.get("run_id", "")),
            )
            scored.append((rerank_score, evidence))

        scored.sort(key=lambda item: (-item[0], item[1].grounding_id))
        return [item[1] for item in scored[: query.top_k]]

    def count(self) -> int:
        result = self._get_client().count(
            collection_name=self.collection_name,
            exact=True,
        )
        return int(result.count)

    def delete_interview_knowledge(
        self,
        *,
        session_id: str = "",
        run_id: str = "",
    ) -> int:
        from qdrant_client import models

        if not session_id and not run_id:
            raise ValueError("session_id or run_id is required")
        conditions = [
            models.FieldCondition(
                key="document_type",
                match=models.MatchAny(
                    any=[
                        "session_context",
                        "interview_turn",
                        "question_pattern",
                        "interview_evaluation",
                    ]
                ),
            )
        ]
        if session_id:
            conditions.append(
                models.FieldCondition(
                    key="session_id",
                    match=models.MatchValue(value=session_id),
                )
            )
        if run_id:
            conditions.append(
                models.FieldCondition(
                    key="run_id",
                    match=models.MatchValue(value=run_id),
                )
            )
        selector = models.Filter(must=conditions)
        count = self._get_client().count(
            collection_name=self.collection_name,
            count_filter=selector,
            exact=True,
        ).count
        self._get_client().delete(
            collection_name=self.collection_name,
            points_selector=models.FilterSelector(filter=selector),
            wait=True,
        )
        return int(count)

    def delete_collection(self) -> None:
        client = self._get_client()
        if client.collection_exists(self.collection_name):
            client.delete_collection(self.collection_name)

    def close(self) -> None:
        client = self._client
        if client is not None and hasattr(client, "close"):
            client.close()
