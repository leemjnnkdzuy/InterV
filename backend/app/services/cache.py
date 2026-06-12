import json
import asyncio
from typing import Any

from app.config import get_settings


class CacheService:
    def __init__(self) -> None:
        self._memory: dict[str, str] = {}
        self._redis = None

    async def connect(self) -> None:
        try:
            import redis.asyncio as redis

            self._redis = redis.from_url(get_settings().redis_url, decode_responses=True)
            await asyncio.wait_for(self._redis.ping(), timeout=1.5)
        except Exception:
            self._redis = None

    async def get_json(self, key: str) -> Any | None:
        raw: str | None = None
        if self._redis is not None:
            raw = await self._redis.get(key)
        else:
            raw = self._memory.get(key)
        if not raw:
            return None
        return json.loads(raw)

    async def set_json(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        raw = json.dumps(value)
        if self._redis is not None:
            await self._redis.set(key, raw, ex=ttl_seconds)
        else:
            self._memory[key] = raw


cache_service = CacheService()
