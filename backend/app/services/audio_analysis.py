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


@dataclass(slots=True)
class SenseVoiceTags:
    languages: list[str]
    emotions: list[str]
    events: list[str]


_sensevoice_model = None


def _score_baseline(samples: list[AudioSample]) -> tuple[int, int, int, list[str]]:
    usable = [sample for sample in samples if sample.audio]
    transcripts = [sample.transcript.strip() for sample in samples if sample.transcript.strip()]
    total_duration = sum(max(sample.duration_sec, 0.0) for sample in usable)
    word_count = sum(len(transcript.split()) for transcript in transcripts)
    speaking_rate = (
        word_count / (total_duration / 60.0)
        if total_duration > 0 and word_count > 0
        else 0.0
    )

    # Confidence and composure are not observable psychometric constructs in this
    # pipeline. Keep neutral placeholders for the legacy API contract and never
    # modify them from an emotion label.
    confidence = 50
    composure = 50
    vocal_delivery = 50
    observations: list[str] = []
    if usable:
        observations.append(f"Đã phân tích {len(usable)} đoạn ghi âm của ứng viên.")
    else:
        observations.append("Không có audio hợp lệ; chỉ sử dụng transcript để đánh giá.")

    if speaking_rate > 0:
        if 90 <= speaking_rate <= 180:
            vocal_delivery = 75
            observations.append("Tốc độ trình bày nằm trong khoảng dễ theo dõi.")
        elif speaking_rate > 210:
            vocal_delivery = 40
            observations.append("Tốc độ nói khá nhanh, nên chủ động ngắt nhịp rõ hơn.")
        elif speaking_rate < 65:
            vocal_delivery = 40
            observations.append("Nhịp nói chậm; nên giảm khoảng dừng kéo dài.")
        else:
            vocal_delivery = 60
    observations.append(
        "Confidence/composure được giữ ở mức trung tính; hệ thống không suy luận "
        "trạng thái tâm lý từ giọng nói."
    )
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


def _sensevoice_tags(samples: list[AudioSample]) -> SenseVoiceTags:
    model = _load_sensevoice()
    languages: list[str] = []
    emotions: list[str] = []
    events: list[str] = []
    language_codes = {"zh", "en", "yue", "ja", "ko", "nospeech"}
    emotion_codes = {
        "happy",
        "sad",
        "angry",
        "neutral",
        "fearful",
        "disgusted",
        "surprised",
    }
    event_codes = {
        "speech",
        "bgm",
        "applause",
        "laughter",
        "crying",
        "sneeze",
        "cough",
    }
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
            tags = [tag.casefold() for tag in re.findall(r"<\|([^|>]+)\|>", text)]
            languages.extend(tag for tag in tags if tag in language_codes)
            emotions.extend(tag for tag in tags if tag in emotion_codes)
            events.extend(tag for tag in tags if tag in event_codes)
        finally:
            temp_path.unlink(missing_ok=True)
    return SenseVoiceTags(
        languages=languages,
        emotions=emotions,
        events=events,
    )


def _analyze_with_sensevoice(samples: list[AudioSample]) -> AudioBehaviorResult:
    confidence, composure, vocal_delivery, observations = _score_baseline(samples)
    tags = _sensevoice_tags(samples)
    dominant_emotion = "neutral"

    if tags.languages:
        language_counts = Counter(tags.languages)
        dominant_language, language_segments = language_counts.most_common(1)[0]
        observations.append(
            "SenseVoice LID nhận diện ngôn ngữ chủ đạo "
            f"{dominant_language} trên {language_segments}/{len(tags.languages)} đoạn có thẻ LID."
        )

    if tags.events:
        event_counts = Counter(tags.events)
        rendered_events = ", ".join(
            f"{event}={count}" for event, count in event_counts.most_common()
        )
        observations.append(f"SenseVoice AED ghi nhận: {rendered_events}.")

    if tags.emotions:
        emotion_counts = Counter(tags.emotions)
        dominant_emotion = emotion_counts.most_common(1)[0][0]
        observations.append(
            "SenseVoice SER gắn nhãn cảm xúc âm học chủ đạo là "
            f"{dominant_emotion}; nhãn này không được quy đổi thành điểm tâm lý."
        )

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
