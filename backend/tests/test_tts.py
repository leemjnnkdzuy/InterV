import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

from app.lib.vbee_pronunciation import (
    PRONUNCIATION_SETS,
    apply_vbee_pronunciations,
    prepare_vbee_tts_text,
    pronunciation_entry_count,
)
from app.schemas import TtsPreviewRequest, VoiceInfo
from app.services.tts import VBEE_DEFAULT_VOICE, synthesize_preview


class TtsPreviewTests(unittest.IsolatedAsyncioTestCase):
    async def test_synthesis_uses_vbee_and_does_not_reload_voice_catalog(self):
        payload = TtsPreviewRequest(
            text="Hãy giới thiệu ngắn gọn về bản thân.",
            language="vi-VN",
            voice_id=VBEE_DEFAULT_VOICE,
        )
        with patch(
            "app.services.tts.cache_service.get_json",
            new=AsyncMock(return_value=None),
        ), patch(
            "app.services.tts.cache_service.set_json",
            new=AsyncMock(),
        ), patch(
            "app.services.tts._synthesize_vbee_tts",
            new=AsyncMock(return_value=b"audio"),
        ) as synthesize, patch(
            "app.services.tts.list_voices",
            new=AsyncMock(
                return_value=[
                    VoiceInfo(
                        id=VBEE_DEFAULT_VOICE,
                        name="HN - Ngọc Huyền",
                        locale="vi-VN",
                    )
                ]
            ),
        ) as list_voices:
            response = await synthesize_preview(payload)

        self.assertEqual(response.audio_base64, "YXVkaW8=")
        synthesize.assert_awaited_once_with(payload.text, payload.voice_id)
        list_voices.assert_awaited_once_with("vi-VN")

    async def test_direct_tts_preview_also_uses_the_pronunciation_library(self):
        payload = TtsPreviewRequest(
            text="Hãy giải thích cách dùng React Native và PostgreSQL.",
            language="vi-VN",
            voice_id=VBEE_DEFAULT_VOICE,
        )
        with patch(
            "app.services.tts.cache_service.get_json",
            new=AsyncMock(return_value=None),
        ), patch(
            "app.services.tts.cache_service.set_json",
            new=AsyncMock(),
        ), patch(
            "app.services.tts._synthesize_vbee_tts",
            new=AsyncMock(return_value=b"audio"),
        ) as synthesize, patch(
            "app.services.tts.list_voices",
            new=AsyncMock(
                return_value=[
                    VoiceInfo(id=VBEE_DEFAULT_VOICE, name="Vbee", locale="vi-VN")
                ]
            ),
        ):
            await synthesize_preview(payload)

        spoken_text = synthesize.await_args.args[0]
        self.assertNotIn("React Native", spoken_text)
        self.assertNotIn("PostgreSQL", spoken_text)
        self.assertIn("ri-ắc nây-tịp", spoken_text)
        self.assertIn("pốt-gờ-rét kiu-êu", spoken_text)

    async def test_synthesis_rejects_unavailable_voice(self):
        payload = TtsPreviewRequest(
            text="Xin chào",
            language="vi-VN",
            voice_id="unsupported-voice",
        )

        with patch(
            "app.services.tts.list_voices",
            new=AsyncMock(return_value=[]),
        ), self.assertRaises(HTTPException) as raised:
            await synthesize_preview(payload)

        self.assertEqual(raised.exception.status_code, 400)

    def test_technical_terms_are_phoneticized_for_vbee_only(self):
        display_text = (
            "Bạn dùng ReactJS, TypeScript, REST API, Figma và Zustand như thế nào?"
        )

        spoken_text = prepare_vbee_tts_text(display_text)

        self.assertEqual(
            display_text,
            "Bạn dùng ReactJS, TypeScript, REST API, Figma và Zustand như thế nào?",
        )
        self.assertNotIn("ReactJS", spoken_text)
        self.assertNotIn("TypeScript", spoken_text)
        self.assertNotIn("REST API", spoken_text)
        self.assertNotIn("Figma", spoken_text)
        self.assertNotIn("Zustand", spoken_text)
        self.assertIn("ri-ác giây-ét", spoken_text)

    def test_react_and_figma_variants_are_phoneticized(self):
        spoken_text = prepare_vbee_tts_text(
            "React JS, React-JS, React.js và Figma giúp xây dựng giao diện."
        )

        self.assertNotIn("React", spoken_text)
        self.assertNotIn("Figma", spoken_text)
        self.assertEqual(
            spoken_text,
            "ri-ác giây-ét, ri-ác giây-ét, ri-ác giây-ét và phích-mờ giúp xây dựng giao diện.",
        )

    def test_interv_brand_keeps_the_final_v_sound(self):
        spoken_text = prepare_vbee_tts_text("Chào mừng bạn đến với InterV.")

        self.assertEqual(spoken_text, "Chào mừng bạn đến với in-tờ vi.")

    def test_pronunciation_library_has_broad_domain_coverage(self):
        self.assertGreaterEqual(pronunciation_entry_count(), 250)
        self.assertGreaterEqual(len(PRONUNCIATION_SETS), 10)
        expected_industry_sets = {
            "industry_information_technology",
            "industry_data_ai",
            "industry_finance_banking",
            "industry_sales_business",
            "industry_marketing_advertising",
            "industry_human_resources",
            "industry_customer_service",
            "industry_design_creative",
            "industry_accounting_audit",
            "industry_product_project_operations",
            "industry_education_training",
            "industry_healthcare_pharma",
            "industry_law_legal",
            "industry_construction_real_estate",
            "industry_tourism_hospitality",
            "industry_manufacturing_logistics_retail",
            "industry_general",
        }
        self.assertTrue(expected_industry_sets.issubset(PRONUNCIATION_SETS))

        sample = (
            "React Native, TypeScript, GraphQL, PostgreSQL, MongoDB, Docker, "
            "Kubernetes, GitHub Actions, OAuth, JWT, RAG, TTS and KPI."
        )
        spoken = apply_vbee_pronunciations(sample)
        for term in (
            "React Native",
            "TypeScript",
            "GraphQL",
            "PostgreSQL",
            "MongoDB",
            "Docker",
            "Kubernetes",
            "GitHub Actions",
            "OAuth",
            "JWT",
            "RAG",
            "TTS",
            "KPI",
        ):
            self.assertNotIn(term, spoken)

if __name__ == "__main__":
    unittest.main()
