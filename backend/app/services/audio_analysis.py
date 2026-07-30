import asyncio
import hashlib
import hmac
import re
import tempfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from app.config import get_settings


@dataclass(slots=True)
class AudioSample:
    question_id: str
    transcript: str
    audio: bytes
    content_type: str
    duration_sec: float


@dataclass(slots=True)
class AudioBehaviorResult:
    confidence: int
    composure: int
    vocal_delivery: int
    dominant_emotion: str
    observations: list[str]
    provider: str


_sensevoice_model = None


def _score_baseline(samples: list[AudioSample]) -> tuple[int, int, int, list[str]]:
    usable = [sample for sample in samples if sample.audio]
    transcripts = [sample.transcript.strip() for sample in samples if sample.transcript.strip()]
    total_duration = sum(max(sample.duration_sec, 0.0) for sample in usable)
    word_count = sum(len(transcript.split()) for transcript in transcripts)
    speaking_rate = word_count / max(total_duration / 60.0, 1.0)

    confidence = 68
    composure = 70
    vocal_delivery = 68
    observations: list[str] = []
    if usable:
        observations.append(f"Đã phân tích {len(usable)} đoạn ghi âm của ứng viên.")
    else:
        observations.append("Không có audio hợp lệ; chỉ sử dụng transcript để đánh giá.")

    if speaking_rate > 0:
        if 90 <= speaking_rate <= 180:
            vocal_delivery += 8
            observations.append("Tốc độ trình bày nằm trong khoảng dễ theo dõi.")
        elif speaking_rate > 210:
            composure -= 8
            observations.append("Tốc độ nói khá nhanh, nên chủ động ngắt nhịp rõ hơn.")
        elif speaking_rate < 65:
            confidence -= 6
            observations.append("Nhịp nói chậm; nên giảm khoảng dừng kéo dài.")

    if len(transcripts) >= 2:
        confidence += 4
        composure += 3
    return confidence, composure, vocal_delivery, observations


def _audio_suffix(content_type: str) -> str:
    if "mp4" in content_type:
        return ".m4a"
    if "wav" in content_type:
        return ".wav"
    if "mpeg" in content_type or "mp3" in content_type:
        return ".mp3"
    return ".webm"


def _verify_model_checkpoint(model_file: Path, expected_sha256: str) -> None:
    if not model_file.is_file():
        raise RuntimeError("SenseVoice checkpoint is missing")
    digest = hashlib.sha256()
    with model_file.open("rb") as checkpoint:
        for chunk in iter(lambda: checkpoint.read(1024 * 1024), b""):
            digest.update(chunk)
    if not hmac.compare_digest(
        digest.hexdigest(),
        expected_sha256.casefold(),
    ):
        raise RuntimeError("SenseVoice checkpoint integrity verification failed")


def _load_sensevoice():
    global _sensevoice_model
    if _sensevoice_model is not None:
        return _sensevoice_model

    from funasr import AutoModel
    from modelscope import snapshot_download

    settings = get_settings()
    model_dir = Path(
        snapshot_download(
            settings.sensevoice_model,
            revision=settings.sensevoice_model_revision,
        )
    )
    model_file = model_dir / "model.pt"
    _verify_model_checkpoint(
        model_file,
        settings.sensevoice_model_sha256,
    )

    _sensevoice_model = AutoModel(
        model=str(model_dir),
        trust_remote_code=False,
        device=settings.sensevoice_device,
        disable_update=True,
    )
    return _sensevoice_model


def _sensevoice_emotions(samples: list[AudioSample]) -> list[str]:
    model = _load_sensevoice()
    emotions: list[str] = []
    for sample in samples:
        if not sample.audio:
            continue

        suffix = _audio_suffix(sample.content_type)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(sample.audio)
            temp_path = Path(temp_file.name)

        try:
            response = model.generate(
                input=str(temp_path),
                cache={},
                language="auto",
                use_itn=True,
                batch_size_s=60,
            )
            text = ""
            if isinstance(response, list) and response and isinstance(response[0], dict):
                text = str(response[0].get("text", ""))
            emotions.extend(
                tag.lower()
                for tag in re.findall(
                    r"<\|(HAPPY|SAD|ANGRY|NEUTRAL|FEARFUL|DISGUSTED|SURPRISED)\|>",
                    text,
                    flags=re.IGNORECASE,
                )
            )
        finally:
            temp_path.unlink(missing_ok=True)
    return emotions


def _analyze_with_sensevoice(samples: list[AudioSample]) -> AudioBehaviorResult:
    confidence, composure, vocal_delivery, observations = _score_baseline(samples)
    emotions = _sensevoice_emotions(samples)
    dominant_emotion = "neutral"

    if emotions:
        emotion_counts = Counter(emotions)
        dominant_emotion = emotion_counts.most_common(1)[0][0]
        observations.append(
            f"SenseVoice nhận diện cảm xúc chủ đạo là {dominant_emotion}."
        )
        if dominant_emotion == "happy":
            confidence += 7
            vocal_delivery += 5
        elif dominant_emotion in {"fearful", "sad"}:
            confidence -= 10
            composure -= 7
        elif dominant_emotion == "angry":
            composure -= 12
        elif dominant_emotion == "surprised":
            composure -= 3

        neutral_ratio = emotion_counts.get("neutral", 0) / len(emotions)
        if neutral_ratio >= 0.6:
            composure += 6
            observations.append("Giọng nói giữ được trạng thái ổn định ở phần lớn câu trả lời.")

    return AudioBehaviorResult(
        confidence=max(0, min(confidence, 100)),
        composure=max(0, min(composure, 100)),
        vocal_delivery=max(0, min(vocal_delivery, 100)),
        dominant_emotion=dominant_emotion,
        observations=observations,
        provider="sensevoice",
    )


async def analyze_audio_behavior(samples: list[AudioSample]) -> AudioBehaviorResult:
    if not any(sample.audio for sample in samples):
        raise ValueError("SenseVoice requires at least one recorded audio answer")
    return await asyncio.to_thread(_analyze_with_sensevoice, samples)


async def warmup_sensevoice() -> None:
    await asyncio.to_thread(_load_sensevoice)
