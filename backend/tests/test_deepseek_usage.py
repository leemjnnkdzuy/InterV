import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.services.deepseek import (
    _record_deepseek_attempt,
    begin_deepseek_usage,
    end_deepseek_usage,
    get_deepseek_balance,
)


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, payload, **kwargs):
        self.payload = payload
        self.kwargs = kwargs
        self.request_headers = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False

    async def get(self, path, headers):
        if path != "/user/balance":
            raise AssertionError("Unexpected balance endpoint")
        self.request_headers = headers
        return FakeResponse(self.payload)


class DeepSeekUsageTests(unittest.IsolatedAsyncioTestCase):
    def test_usage_aggregates_retries_cache_and_reasoning(self):
        token = begin_deepseek_usage("interview_evaluate")
        _record_deepseek_attempt(
            model="deepseek-v4-pro",
            latency_ms=120,
            failed=True,
        )
        _record_deepseek_attempt(
            model="deepseek-v4-pro",
            latency_ms=880,
            response=SimpleNamespace(
                id="provider-request-1",
                usage={
                    "prompt_tokens": 1_000,
                    "completion_tokens": 240,
                    "total_tokens": 1_240,
                    "prompt_cache_hit_tokens": 600,
                    "prompt_cache_miss_tokens": 400,
                    "completion_tokens_details": {
                        "reasoning_tokens": 90,
                    },
                },
            ),
        )
        usage = end_deepseek_usage(token)

        self.assertEqual(usage.operation, "interview_evaluate")
        self.assertEqual(usage.model, "deepseek-v4-pro")
        self.assertEqual(usage.request_count, 2)
        self.assertEqual(usage.successful_request_count, 1)
        self.assertEqual(usage.failed_request_count, 1)
        self.assertEqual(usage.prompt_tokens, 1_000)
        self.assertEqual(usage.completion_tokens, 240)
        self.assertEqual(usage.total_tokens, 1_240)
        self.assertEqual(usage.cache_hit_tokens, 600)
        self.assertEqual(usage.cache_miss_tokens, 400)
        self.assertEqual(usage.reasoning_tokens, 90)
        self.assertEqual(usage.latency_ms, 1_000)
        self.assertEqual(usage.request_ids, ["provider-request-1"])

    def test_usage_context_is_reset_between_logical_requests(self):
        first_token = begin_deepseek_usage("interview_start")
        _record_deepseek_attempt(
            model="deepseek-v4-flash",
            latency_ms=20,
            response=SimpleNamespace(
                id="first",
                usage={
                    "prompt_tokens": 10,
                    "completion_tokens": 5,
                },
            ),
        )
        first = end_deepseek_usage(first_token)

        second_token = begin_deepseek_usage("interview_follow_up")
        second = end_deepseek_usage(second_token)
        self.assertEqual(first.total_tokens, 15)
        self.assertEqual(second.total_tokens, 0)
        self.assertEqual(second.request_count, 0)
        self.assertEqual(second.operation, "interview_follow_up")

    async def test_balance_response_is_sanitized(self):
        payload = {
            "is_available": True,
            "balance_infos": [
                {
                    "currency": "usd",
                    "total_balance": "12.3456",
                    "granted_balance": "2.0000",
                    "topped_up_balance": "10.3456",
                },
                {
                    "currency": "EUR",
                    "total_balance": "999",
                    "granted_balance": "0",
                    "topped_up_balance": "999",
                },
            ],
        }
        settings = SimpleNamespace(
            deepseek_api_key="test-secret",
            deepseek_base_url="https://api.deepseek.com",
            deepseek_fast_model="deepseek-v4-flash",
            deepseek_eval_model="deepseek-v4-pro",
        )
        fake_client = FakeAsyncClient(payload)
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=settings,
            ),
            patch(
                "app.services.deepseek.httpx.AsyncClient",
                return_value=fake_client,
            ),
        ):
            result = await get_deepseek_balance()

        self.assertTrue(result["is_available"])
        self.assertEqual(len(result["balances"]), 1)
        self.assertEqual(result["balances"][0]["currency"], "USD")
        self.assertEqual(result["balances"][0]["total_balance"], "12.3456")
        self.assertEqual(
            fake_client.request_headers["Authorization"],
            "Bearer test-secret",
        )

    async def test_balance_rejects_unbounded_provider_payload(self):
        payload = {
            "is_available": True,
            "balance_infos": [{} for _ in range(5)],
        }
        settings = SimpleNamespace(
            deepseek_api_key="test-secret",
            deepseek_base_url="https://api.deepseek.com",
            deepseek_fast_model="deepseek-v4-flash",
            deepseek_eval_model="deepseek-v4-pro",
        )
        with (
            patch(
                "app.services.deepseek.get_settings",
                return_value=settings,
            ),
            patch(
                "app.services.deepseek.httpx.AsyncClient",
                return_value=FakeAsyncClient(payload),
            ),
        ):
            with self.assertRaisesRegex(RuntimeError, "invalid"):
                await get_deepseek_balance()
