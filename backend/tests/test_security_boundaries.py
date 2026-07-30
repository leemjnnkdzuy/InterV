import io
import hashlib
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from app.config import Settings
from app.services.cache import CacheService
from app.services.document import _validate_signature
from app.services.audio_analysis import _verify_model_checkpoint


class ConfigurationSecurityTests(unittest.TestCase):
    def test_internal_key_must_be_strong(self):
        with self.assertRaisesRegex(ValueError, "at least 32 bytes"):
            Settings(
                _env_file=None,
                ai_backend_internal_key="short",
            )

    def test_remote_grpc_requires_tls(self):
        with self.assertRaisesRegex(ValueError, "TLS is mandatory"):
            Settings(
                _env_file=None,
                ai_backend_internal_key="k" * 32,
                grpc_host="0.0.0.0",
            )

    def test_loopback_grpc_may_use_plaintext(self):
        settings = Settings(
            _env_file=None,
            ai_backend_internal_key="k" * 32,
            grpc_host="127.0.0.1",
        )
        self.assertEqual(settings.grpc_host, "127.0.0.1")


class UploadSecurityTests(unittest.TestCase):
    def test_pdf_extension_cannot_hide_non_pdf_content(self):
        with self.assertRaisesRegex(ValueError, "signature"):
            _validate_signature(".pdf", b"<html>not a pdf</html>")

    def test_docx_rejects_parent_directory_archive_paths(self):
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            archive.writestr("[Content_Types].xml", "<Types />")
            archive.writestr("word/document.xml", "<document />")
            archive.writestr("../outside.txt", "unsafe")

        with self.assertRaisesRegex(ValueError, "unsafe archive path"):
            _validate_signature(".docx", output.getvalue())

    def test_text_upload_rejects_binary_content(self):
        with self.assertRaisesRegex(ValueError, "binary"):
            _validate_signature(".txt", b"hello\x00world")


class ModelIntegrityTests(unittest.TestCase):
    def test_checkpoint_hash_must_match(self):
        with tempfile.TemporaryDirectory() as directory:
            checkpoint = Path(directory) / "model.pt"
            checkpoint.write_bytes(b"known checkpoint")
            expected = hashlib.sha256(b"known checkpoint").hexdigest()
            _verify_model_checkpoint(checkpoint, expected)
            with self.assertRaisesRegex(RuntimeError, "integrity"):
                _verify_model_checkpoint(checkpoint, "0" * 64)


class MemoryCacheSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def test_memory_fallback_is_lru_bounded(self):
        cache = CacheService()
        settings = SimpleNamespace(
            memory_cache_max_items=2,
            memory_cache_max_bytes=4 * 1024 * 1024,
        )
        with patch("app.services.cache.get_settings", return_value=settings):
            await cache.set_json("a", {"value": 1})
            await cache.set_json("b", {"value": 2})
            self.assertEqual((await cache.get_json("a"))["value"], 1)
            await cache.set_json("c", {"value": 3})

        self.assertIsNone(await cache.get_json("b"))
        self.assertIsNotNone(await cache.get_json("a"))
        self.assertIsNotNone(await cache.get_json("c"))

    async def test_memory_fallback_expires_entries(self):
        cache = CacheService()
        settings = SimpleNamespace(
            memory_cache_max_items=16,
            memory_cache_max_bytes=4 * 1024 * 1024,
        )
        with patch("app.services.cache.get_settings", return_value=settings):
            with patch("app.services.cache.time.monotonic", return_value=100):
                await cache.set_json("short", {"value": 1}, ttl_seconds=1)
            with patch("app.services.cache.time.monotonic", return_value=102):
                self.assertIsNone(await cache.get_json("short"))
