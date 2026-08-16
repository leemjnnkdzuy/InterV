from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services.audio_analysis import (
    AudioSample,
    SignalMetrics,
    _analyze_with_sensevoice,
)


class _FakeSenseVoice:
    def generate(self, **_kwargs):
        return [
            {
                "text": (
                    "<|en|><|ANGRY|><|Speech|><|withitn|>"
                    "This transcript is not used for psychological scoring."
                )
            }
        ]


class AudioAnalysisTests(unittest.TestCase):
    def test_delivery_metrics_are_observable_and_provider_neutral(self):
        transcript = " ".join(f"word{index}" for index in range(60))
        samples = [
            AudioSample(
                question_id=f"q_{index}",
                transcript=transcript,
                audio=b"audio",
                content_type="audio/webm",
                duration_sec=30,
            )
            for index in range(1, 3)
        ]

        with patch(
            "app.services.audio_analysis._load_sensevoice",
            return_value=_FakeSenseVoice(),
        ), patch(
            "app.services.audio_analysis._signal_metrics",
            return_value=SignalMetrics(
                duration_sec=30,
                pause_ratio=0.2,
                volume_stability=85,
                clipping_ratio=0,
            ),
        ):
            result = _analyze_with_sensevoice(samples)

        self.assertEqual(result.speaking_rate_wpm, 120)
        self.assertEqual(result.pace_consistency, 100)
        self.assertEqual(result.pause_ratio, 20)
        self.assertEqual(result.volume_stability, 85)
        self.assertEqual(result.analyzed_answer_count, 2)
        self.assertEqual(result.dominant_emotion, "angry")
        self.assertFalse(
            any("sensevoice" in item.casefold() for item in result.observations)
        )
        self.assertTrue(any("120" in item for item in result.observations))


if __name__ == "__main__":
    unittest.main()
