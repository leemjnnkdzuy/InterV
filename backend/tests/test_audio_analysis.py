from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services.audio_analysis import AudioSample, _analyze_with_sensevoice


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
    def test_sensevoice_tags_do_not_change_psychological_placeholders(self):
        sample = AudioSample(
            question_id="q_1",
            transcript="one two three four five six seven eight nine ten",
            audio=b"audio",
            content_type="audio/webm",
            duration_sec=6,
        )

        with patch(
            "app.services.audio_analysis._load_sensevoice",
            return_value=_FakeSenseVoice(),
        ):
            result = _analyze_with_sensevoice([sample])

        self.assertEqual(result.confidence, 50)
        self.assertEqual(result.composure, 50)
        self.assertEqual(result.dominant_emotion, "angry")
        self.assertTrue(any("SenseVoice LID" in item for item in result.observations))
        self.assertTrue(any("không được quy đổi" in item for item in result.observations))


if __name__ == "__main__":
    unittest.main()
