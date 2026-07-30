from typing import Any
import asyncio

from app.config import get_settings


class EventPublisher:
    def __init__(self) -> None:
        self._producer = None

    async def connect(self) -> None:
        producer = None
        try:
            from aiokafka import AIOKafkaProducer

            producer = AIOKafkaProducer(
                bootstrap_servers=get_settings().kafka_brokers.split(",")
            )
            await asyncio.wait_for(producer.start(), timeout=1.5)
            self._producer = producer
        except Exception:
            if producer is not None:
                try:
                    await producer.stop()
                except Exception:
                    pass
            self._producer = None

    async def close(self) -> None:
        if self._producer is not None:
            await self._producer.stop()

    async def publish(self, topic: str, event: dict[str, Any]) -> None:
        if self._producer is None:
            return
        import json

        await self._producer.send_and_wait(topic, json.dumps(event).encode("utf-8"))


event_publisher = EventPublisher()
