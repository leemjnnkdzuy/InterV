import asyncio
import json
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any

from app.config import get_settings


@dataclass(frozen=True)
class _MemoryEntry:
    raw: str
    expires_at: float
    size_bytes: int


class CacheService:
    def __init__(self) -> None:
        self._memory: OrderedDict[str, _MemoryEntry] = OrderedDict()
        self._memory_bytes = 0
        self._lock = asyncio.Lock()
        self._redis = None

    async def connect(self) -> None:
        try:
            import redis.asyncio as redis

            client = redis.from_url(
                get_settings().redis_url,
                decode_responses=True,
                socket_connect_timeout=1.5,
                socket_timeout=2,
            )
            await asyncio.wait_for(client.ping(), timeout=1.5)
            self._redis = client
        except Exception:
            self._redis = None

    async def _disable_redis(self) -> None:
        client = self._redis
        self._redis = None
        if client is not None:
            await client.aclose()

    async def _get_memory(self, key: str) -> str | None:
        now = time.monotonic()
        async with self._lock:
            entry = self._memory.get(key)
            if entry is None:
                return None
            if entry.expires_at <= now:
                self._memory.pop(key, None)
                self._memory_bytes -= entry.size_bytes
                return None
            self._memory.move_to_end(key)
            return entry.raw

    async def _set_memory(
        self,
        key: str,
        raw: str,
        ttl_seconds: int,
    ) -> None:
        settings = get_settings()
        size_bytes = len(raw.encode("utf-8"))
        if size_bytes > settings.memory_cache_max_bytes // 4:
            return
        entry = _MemoryEntry(
            raw=raw,
            expires_at=time.monotonic() + max(1, ttl_seconds),
            size_bytes=size_bytes,
        )
        async with self._lock:
            previous = self._memory.pop(key, None)
            if previous is not None:
                self._memory_bytes -= previous.size_bytes
            self._memory[key] = entry
            self._memory_bytes += size_bytes
            while (
                len(self._memory) > settings.memory_cache_max_items
                or self._memory_bytes > settings.memory_cache_max_bytes
            ):
                _, removed = self._memory.popitem(last=False)
                self._memory_bytes -= removed.size_bytes

    async def get_json(self, key: str) -> Any | None:
        raw: str | None = None
        if self._redis is not None:
            try:
                raw = await self._redis.get(key)
            except Exception:
                await self._disable_redis()
        if raw is None:
            raw = await self._get_memory(key)
        if not raw:
            return None
        try:
            return json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            return None

    async def set_json(
        self,
        key: str,
        value: Any,
        ttl_seconds: int = 3600,
    ) -> None:
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        if self._redis is not None:
            try:
                await self._redis.set(key, raw, ex=max(1, ttl_seconds))
                return
            except Exception:
                await self._disable_redis()
        await self._set_memory(key, raw, ttl_seconds)

    async def close(self) -> None:
        await self._disable_redis()
        async with self._lock:
            self._memory.clear()
            self._memory_bytes = 0


cache_service = CacheService()
