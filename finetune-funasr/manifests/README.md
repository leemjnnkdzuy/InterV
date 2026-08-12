# Manifest contract

Mỗi dòng JSONL đại diện cho một audio:

```json
{
  "audio_filepath": "relative/path.wav",
  "duration": 3.42,
  "text": "câu transcript tiếng Việt",
  "speaker_id": "spk_0001",
  "split": "train"
}
```

Kiểm tra bắt buộc trước training: file tồn tại, duration hợp lệ, sample rate đúng, text không rỗng, speaker không rò rỉ giữa các split và manifest có hash SHA-256.
