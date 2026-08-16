import asyncio
import hashlib
import hmac
import math
import re
import shutil
import subprocess
import tempfile
from array import array
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from statistics import mean, pstdev

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
    recommendations: list[str]
    speaking_rate_wpm: float
    pace_consistency: int
    pause_ratio: int
    volume_stability: int
    filler_word_count: int
    average_answer_duration_sec: float
    analyzed_answer_count: int
    total_word_count: int
    provider: str


@dataclass(slots=True)
class SenseVoiceTags:
    languages: list[str]
    emotions: list[str]
    events: list[str]


@dataclass(slots=True)
class SignalMetrics:
    duration_sec: float
    pause_ratio: float
    volume_stability: int
    clipping_ratio: float


_sensevoice_model = None


def _require_ffmpeg() -> None:
    """Fail startup with an actionable error when audio decoding is unavailable."""
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "SenseVoice audio analysis requires ffmpeg on PATH. "
            "Install ffmpeg and restart the AI backend."
        )


def _clamp_score(value: float) -> int:
    return max(0, min(100, round(value)))


def _word_count(text: str) -> int:
    return len(re.findall(r"\b[\wÀ-ỹ]+\b", text, flags=re.UNICODE))


def _count_fillers(text: str) -> int:
    normalized = " ".join(text.casefold().split())
    fillers = (
        r"\b(?:ừm+|ờm+|ừ|ờ|à|kiểu như|nói chung là|thực ra là)\b",
        r"\b(?:um+|uh+|erm+|like|you know|basically|actually)\b",
    )
    return sum(len(re.findall(pattern, normalized)) for pattern in fillers)


def _signal_metrics(sample: AudioSample) -> SignalMetrics | None:
    if not sample.audio:
        return None
    suffix = _audio_suffix(sample.content_type)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(sample.audio)
        temp_path = Path(temp_file.name)
    try:
        process = subprocess.run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                str(temp_path),
                "-ac",
                "1",
                "-ar",
                "16000",
                "-f",
                "s16le",
                "pipe:1",
            ],
            capture_output=True,
            check=False,
            timeout=30,
        )
        if process.returncode != 0 or len(process.stdout) < 640:
            return None
        samples_pcm = array("h")
        samples_pcm.frombytes(process.stdout)
        window_size = 320
        rms_values: list[float] = []
        for start in range(0, len(samples_pcm) - window_size + 1, window_size):
            window = samples_pcm[start : start + window_size]
            rms = math.sqrt(sum(value * value for value in window) / window_size)
            rms_values.append(rms)
        if not rms_values:
            return None

        threshold = max(250.0, max(rms_values) * 0.08)
        active_rms = [value for value in rms_values if value >= threshold]
        pause_ratio = 1.0 - (len(active_rms) / len(rms_values))
        active_db = [20 * math.log10(max(value, 1.0) / 32768.0) for value in active_rms]
        db_variation = pstdev(active_db) if len(active_db) > 1 else 0.0
        volume_stability = _clamp_score(100 - max(0.0, db_variation - 2.5) * 11)
        clipped = sum(1 for value in samples_pcm if abs(value) >= 32700)
        clipping_ratio = clipped / max(1, len(samples_pcm))
        return SignalMetrics(
            duration_sec=len(samples_pcm) / 16000.0,
            pause_ratio=max(0.0, min(1.0, pause_ratio)),
            volume_stability=volume_stability,
            clipping_ratio=clipping_ratio,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    finally:
        temp_path.unlink(missing_ok=True)


def _score_delivery(
    samples: list[AudioSample],
) -> tuple[int, int, int, dict[str, float | int], list[str], list[str]]:
    usable = [sample for sample in samples if sample.audio]
    transcripts = [sample.transcript.strip() for sample in samples if sample.transcript.strip()]
    total_duration = sum(max(sample.duration_sec, 0.0) for sample in usable)
    word_count = sum(_word_count(transcript) for transcript in transcripts)
    speaking_rate = (
        word_count / (total_duration / 60.0)
        if total_duration > 0 and word_count > 0
        else 0.0
    )
    answer_rates = [
        _word_count(sample.transcript) / (sample.duration_sec / 60.0)
        for sample in usable
        if sample.duration_sec >= 2 and _word_count(sample.transcript) > 0
    ]
    rate_variation = (
        pstdev(answer_rates) / mean(answer_rates)
        if len(answer_rates) > 1 and mean(answer_rates) > 0
        else 0.0
    )
    pace_consistency = (
        _clamp_score(100 - rate_variation * 140) if len(answer_rates) > 1 else 60
    )
    signal_rows = [metric for sample in usable if (metric := _signal_metrics(sample))]
    signal_duration = sum(metric.duration_sec for metric in signal_rows)
    pause_ratio = (
        sum(metric.pause_ratio * metric.duration_sec for metric in signal_rows)
        / signal_duration
        if signal_duration > 0
        else -0.01
    )
    volume_stability = (
        round(mean(metric.volume_stability for metric in signal_rows))
        if signal_rows
        else -1
    )
    clipping_ratio = (
        max(metric.clipping_ratio for metric in signal_rows) if signal_rows else 0.0
    )
    filler_count = sum(_count_fillers(transcript) for transcript in transcripts)
    average_duration = total_duration / len(usable) if usable else 0.0
    short_answers = sum(_word_count(transcript) < 30 for transcript in transcripts)

    if 105 <= speaking_rate <= 170:
        pace_score = 90
    elif 85 <= speaking_rate < 105 or 170 < speaking_rate <= 195:
        pace_score = 70
    elif speaking_rate > 0:
        pace_score = 45
    else:
        pace_score = 0
    pause_score = _clamp_score(100 - abs(pause_ratio - 0.22) * 180) if signal_rows else 50
    observable_stability = volume_stability if signal_rows else pace_consistency
    vocal_delivery = _clamp_score(
        pace_score * 0.4
        + pace_consistency * 0.25
        + pause_score * 0.2
        + observable_stability * 0.15
    )
    # Legacy fields are populated only from observable delivery behavior. They
    # are not emotion, personality, or hiring-suitability scores.
    confidence = _clamp_score(
        45 + min(35, (word_count / max(1, len(transcripts))) * 0.45)
        - (short_answers / max(1, len(transcripts))) * 20
    )
    composure = _clamp_score(pace_consistency * 0.6 + observable_stability * 0.4)
    observations: list[str] = []
    recommendations: list[str] = []
    if speaking_rate > 0:
        if 105 <= speaking_rate <= 170:
            observations.append(
                f"Tốc độ trung bình {speaking_rate:.0f} từ/phút, phù hợp để người nghe theo dõi."
            )
        elif speaking_rate > 170:
            observations.append(f"Tốc độ trung bình {speaking_rate:.0f} từ/phút, hơi nhanh.")
            recommendations.append(
                "Giảm tốc ở ý chính và dừng ngắn sau mỗi kết quả hoặc con số quan trọng."
            )
        else:
            observations.append(f"Tốc độ trung bình {speaking_rate:.0f} từ/phút, hơi chậm.")
            recommendations.append(
                "Rút gọn phần dẫn nhập và đi sớm hơn vào hành động, kết quả cụ thể."
            )
    if len(answer_rates) > 1:
        observations.append(
            f"Độ ổn định tốc độ giữa các câu đạt {pace_consistency}/100."
        )
        if pace_consistency < 65:
            recommendations.append(
                "Giữ nhịp nhất quán giữa các câu; luyện trả lời theo khung 60–120 giây."
            )
    if signal_rows:
        observations.append(
            f"Khoảng lặng chiếm khoảng {pause_ratio * 100:.0f}% thời lượng; "
            f"độ ổn định âm lượng đạt {volume_stability}/100."
        )
        if pause_ratio > 0.38:
            recommendations.append(
                "Chuẩn bị trước 3 ý chính để giảm các khoảng dừng dài khi chuyển ý."
            )
        elif pause_ratio < 0.08:
            recommendations.append(
                "Chèn khoảng nghỉ ngắn giữa các ý để câu trả lời rõ và dễ ghi nhận hơn."
            )
        if volume_stability < 60:
            recommendations.append(
                "Giữ khoảng cách với micro ổn định và duy trì âm lượng đều hơn."
            )
        if clipping_ratio > 0.002:
            observations.append("Một số đoạn có tín hiệu quá lớn, làm giảm độ rõ của âm thanh.")
            recommendations.append("Đặt micro xa hơn một chút để tránh vỡ tiếng.")
    if filler_count:
        observations.append(f"Ghi nhận {filler_count} từ đệm trong toàn bộ câu trả lời.")
        if filler_count >= max(3, len(transcripts)):
            recommendations.append(
                "Thay từ đệm bằng một nhịp dừng ngắn trước khi bắt đầu ý tiếp theo."
            )
    if short_answers:
        observations.append(
            f"Có {short_answers}/{len(transcripts)} câu trả lời dưới 30 từ, có thể thiếu dẫn chứng."
        )
        recommendations.append(
            "Bổ sung bối cảnh, hành động cá nhân và kết quả đo được cho các câu trả lời ngắn."
        )

    metrics: dict[str, float | int] = {
        "speaking_rate_wpm": round(speaking_rate, 1),
        "pace_consistency": pace_consistency,
        "pause_ratio": round(pause_ratio * 100) if signal_rows else -1,
        "volume_stability": volume_stability,
        "filler_word_count": filler_count,
        "average_answer_duration_sec": round(average_duration, 1),
        "analyzed_answer_count": len(usable),
        "total_word_count": word_count,
    }
    return (
        confidence,
        composure,
        vocal_delivery,
        metrics,
        observations[:5],
        recommendations[:4],
    )


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
    (
        confidence,
        composure,
        vocal_delivery,
        metrics,
        observations,
        recommendations,
    ) = _score_delivery(samples)
    tags = _sensevoice_tags(samples)
    dominant_emotion = "neutral"

    if tags.languages:
        language_counts = Counter(tags.languages)
        dominant_language, language_segments = language_counts.most_common(1)[0]
        if dominant_language == "nospeech" and language_segments >= max(1, len(tags.languages) // 2):
            recommendations.append(
                "Một số đoạn có rất ít giọng nói rõ; hãy kiểm tra micro trước khi trả lời."
            )

    if tags.events:
        event_counts = Counter(tags.events)
        disruptive_events = sum(
            count
            for event, count in event_counts.items()
            if event in {"bgm", "cough", "crying"}
        )
        if disruptive_events:
            observations.append(
                f"Phát hiện {disruptive_events} đoạn có âm thanh có thể làm giảm độ rõ."
            )

    if tags.emotions:
        emotion_counts = Counter(tags.emotions)
        dominant_emotion = emotion_counts.most_common(1)[0][0]
    return AudioBehaviorResult(
        confidence=max(0, min(confidence, 100)),
        composure=max(0, min(composure, 100)),
        vocal_delivery=max(0, min(vocal_delivery, 100)),
        dominant_emotion=dominant_emotion,
        observations=observations[:5],
        recommendations=recommendations[:4],
        speaking_rate_wpm=float(metrics["speaking_rate_wpm"]),
        pace_consistency=int(metrics["pace_consistency"]),
        pause_ratio=int(metrics["pause_ratio"]),
        volume_stability=int(metrics["volume_stability"]),
        filler_word_count=int(metrics["filler_word_count"]),
        average_answer_duration_sec=float(metrics["average_answer_duration_sec"]),
        analyzed_answer_count=int(metrics["analyzed_answer_count"]),
        total_word_count=int(metrics["total_word_count"]),
        provider="sensevoice",
    )


async def analyze_audio_behavior(samples: list[AudioSample]) -> AudioBehaviorResult:
    if not any(sample.audio for sample in samples):
        raise ValueError("SenseVoice requires at least one recorded audio answer")
    return await asyncio.to_thread(_analyze_with_sensevoice, samples)


async def warmup_sensevoice() -> None:
    _require_ffmpeg()
    await asyncio.to_thread(_load_sensevoice)
