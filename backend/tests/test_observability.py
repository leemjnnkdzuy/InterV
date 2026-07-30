import re
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import grpc

from app.grpc_server import ApiLoggingInterceptor
from app.observability import (
    get_request_id,
    request_context,
    valid_request_id,
)


class ObservabilityContextTests(unittest.TestCase):
    def test_valid_request_id_preserves_uuid_and_replaces_untrusted_value(self):
        request_id = "4a7e1ae2-1d3f-4b04-bf5b-bf66073d0a5c"
        self.assertEqual(valid_request_id(request_id), request_id)

        generated = valid_request_id("attacker-controlled")
        self.assertRegex(
            generated,
            re.compile(
                r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-"
                r"[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
            ),
        )

    def test_request_context_is_reset_after_request(self):
        self.assertIsNone(get_request_id())
        with request_context("request-a"):
            self.assertEqual(get_request_id(), "request-a")
        self.assertIsNone(get_request_id())


class ApiLoggingInterceptorTests(unittest.IsolatedAsyncioTestCase):
    async def test_unary_log_contains_metadata_but_not_request_payload(self):
        request_id = "4a7e1ae2-1d3f-4b04-bf5b-bf66073d0a5c"
        secret_payload = {"password": "must-not-be-logged"}

        async def behavior(request, context):
            self.assertIs(request, secret_payload)
            self.assertEqual(get_request_id(), request_id)
            return {"success": True}

        handler = grpc.unary_unary_rpc_method_handler(behavior)
        continuation = AsyncMock(return_value=handler)
        details = SimpleNamespace(method="/interv.ai.v1.IntervAi/Health")
        context = SimpleNamespace(
            invocation_metadata=lambda: (
                SimpleNamespace(key="x-request-id", value=request_id),
                SimpleNamespace(
                    key="x-internal-api-key",
                    value="must-not-be-logged",
                ),
            ),
            code=lambda: None,
            peer=lambda: "ipv4:127.0.0.1:50000",
        )

        with patch("app.grpc_server.log_api_event") as log_event:
            wrapped = await ApiLoggingInterceptor().intercept_service(
                continuation,
                details,
            )
            response = await wrapped.unary_unary(secret_payload, context)

        self.assertEqual(response, {"success": True})
        log_event.assert_called_once()
        fields = log_event.call_args.kwargs
        self.assertEqual(fields["request_id"], request_id)
        self.assertEqual(fields["status"], "OK")
        self.assertEqual(
            fields["method"],
            "/interv.ai.v1.IntervAi/Health",
        )
        self.assertNotIn("password", fields)
        self.assertNotIn("x-internal-api-key", fields)
