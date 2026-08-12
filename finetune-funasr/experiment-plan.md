# Experiment plan

## Mục tiêu

So sánh FunASR baseline với checkpoint fine-tuned trên dữ liệu tiếng Việt bằng cùng pipeline chuẩn hóa và cùng test set speaker-disjoint.

## Ma trận thử nghiệm

| Run | Model/base | Data version | Seed | Learning rate | Epochs | Selection rule | Status |
|---|---|---|---:|---:|---:|---|---|
| B-001 | `TODO` | `TODO` | `TODO` | N/A | N/A | baseline | PLANNED |
| F-001 | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | best dev WER | PLANNED |
| F-002 | `TODO` | `TODO` | `TODO` | `TODO` | `TODO` | best dev WER | PLANNED |

## Metrics

- Word Error Rate (WER), quy tắc tokenization cố định.
- Character Error Rate (CER), quy tắc Unicode cố định.
- Real-time factor và latency p50/p95.
- Tỷ lệ lỗi theo slice audio.
- Regression cases so với baseline.

## Kiểm soát leakage

- Split theo `speaker_id`, không split ngẫu nhiên theo file.
- Không dùng transcript test để chọn checkpoint, prompt hoặc hậu xử lý.
- Đóng băng test manifest trước khi mở đánh giá cuối.

## Artefacts bắt buộc

```text
artifacts/<run-id>/
├── config.yaml
├── environment.txt
├── train.log
├── metrics.json
├── predictions.jsonl
├── checkpoint.sha256
└── README.md
```

## Kết luận mẫu

`TODO — chỉ điền sau khi chạy baseline và fine-tuned trên test set đã khóa.`
