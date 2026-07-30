from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from typing import Protocol, Sequence


@dataclass(frozen=True)
class SparseEmbeddingVector:
    indices: list[int]
    values: list[float]


class EmbeddingProvider(Protocol):
    @property
    def dense_size(self) -> int: ...

    @property
    def dense_model_name(self) -> str: ...

    @property
    def sparse_model_name(self) -> str: ...

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...

    def sparse_documents(
        self, texts: Sequence[str]
    ) -> list[SparseEmbeddingVector]: ...

    def sparse_query(self, text: str) -> SparseEmbeddingVector: ...


class FastEmbedProvider:
    def __init__(
        self,
        *,
        dense_model: str,
        sparse_model: str,
        cache_dir: str | None = None,
    ) -> None:
        try:
            from fastembed import SparseTextEmbedding, TextEmbedding
        except ImportError as error:
            raise RuntimeError(
                'RAG requires qdrant-client[fastembed]. Install backend requirements '
                "with Python 3.12."
            ) from error

        kwargs = {"cache_dir": cache_dir} if cache_dir else {}
        self._dense_model_name = dense_model
        self._sparse_model_name = sparse_model
        self._dense = TextEmbedding(model_name=dense_model, **kwargs)
        self._sparse = SparseTextEmbedding(model_name=sparse_model, **kwargs)
        probe = list(self._dense.embed(["InterV embedding dimension probe"]))
        if not probe:
            raise RuntimeError(f"Dense embedding model {dense_model} returned no vector")
        self._dense_size = len(probe[0])

    @property
    def dense_size(self) -> int:
        return self._dense_size

    @property
    def dense_model_name(self) -> str:
        return self._dense_model_name

    @property
    def sparse_model_name(self) -> str:
        return self._sparse_model_name

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return [
            [float(value) for value in vector]
            for vector in self._dense.embed(list(texts))
        ]

    def embed_query(self, text: str) -> list[float]:
        vectors = list(self._dense.query_embed(text))
        if not vectors:
            raise RuntimeError("Dense embedding query returned no vector")
        return [float(value) for value in vectors[0]]

    @staticmethod
    def _sparse_vector(vector) -> SparseEmbeddingVector:
        return SparseEmbeddingVector(
            indices=[int(value) for value in vector.indices],
            values=[float(value) for value in vector.values],
        )

    def sparse_documents(
        self, texts: Sequence[str]
    ) -> list[SparseEmbeddingVector]:
        return [
            self._sparse_vector(vector)
            for vector in self._sparse.embed(list(texts))
        ]

    def sparse_query(self, text: str) -> SparseEmbeddingVector:
        vectors = list(self._sparse.query_embed(text))
        if not vectors:
            raise RuntimeError("Sparse embedding query returned no vector")
        return self._sparse_vector(vectors[0])


class DeterministicEmbeddingProvider:
    """Small deterministic embedder used only by unit tests and corpus tooling."""

    TOKEN_PATTERN = re.compile(r"[\wÀ-ỹ]+", re.UNICODE)

    def __init__(self, dense_size: int = 96) -> None:
        self._dense_size = dense_size

    @property
    def dense_size(self) -> int:
        return self._dense_size

    @property
    def dense_model_name(self) -> str:
        return "test/deterministic-multilingual"

    @property
    def sparse_model_name(self) -> str:
        return "test/deterministic-bm25"

    @classmethod
    def _tokens(cls, text: str) -> list[str]:
        return [item.casefold() for item in cls.TOKEN_PATTERN.findall(text)]

    @staticmethod
    def _digest(token: str) -> bytes:
        return hashlib.blake2b(token.encode("utf-8"), digest_size=16).digest()

    def _dense(self, text: str) -> list[float]:
        vector = [0.0] * self._dense_size
        for token in self._tokens(text):
            digest = self._digest(token)
            index = int.from_bytes(digest[:4], "big") % self._dense_size
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return [self._dense(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._dense(text)

    def _sparse(self, text: str) -> SparseEmbeddingVector:
        counts: dict[int, float] = {}
        for token in self._tokens(text):
            index = int.from_bytes(self._digest(token)[:4], "big")
            counts[index] = counts.get(index, 0.0) + 1.0
        indices = sorted(counts)
        return SparseEmbeddingVector(
            indices=indices,
            values=[1.0 + math.log(counts[index]) for index in indices],
        )

    def sparse_documents(
        self, texts: Sequence[str]
    ) -> list[SparseEmbeddingVector]:
        return [self._sparse(text) for text in texts]

    def sparse_query(self, text: str) -> SparseEmbeddingVector:
        return self._sparse(text)
