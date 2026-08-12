# Fine-tuning FunASR cho tiếng Việt

Thư mục này mô tả kế hoạch fine-tuning FunASR trên bộ âm thanh và transcript tiếng Việt phục vụ InterV. Đây là hồ sơ chuẩn bị; chưa được xem là một training run đã hoàn thành cho đến khi có log và artefact trong `../rule/evidence-log.md`.

## Cấu trúc đề xuất

```text
finetune-funasr/
├── README.md
├── dataset-card.md
├── experiment-plan.md
├── configs/
│   └── vietnamese-baseline.yaml
├── manifests/
│   └── README.md
├── scripts/
│   └── README.md
└── reports/
    └── README.md
```

## Pipeline

1. Kiểm kê quyền sử dụng và chất lượng audio.
2. Chuẩn hóa audio về mono, sample rate cố định; giữ bản gốc bất biến.
3. Tạo manifest `audio_filepath`, `duration`, `text`, `speaker_id`, `split`.
4. Tách train/dev/test theo speaker.
5. Chạy baseline trên test set.
6. Fine-tune theo cấu hình được version hóa.
7. Chọn checkpoint bằng dev set, sau đó đánh giá test một lần.
8. Lưu metric, confusion/error slices và model card.

## Không được ghi nhận là kết quả

Các giá trị `TODO`, cấu hình mẫu và kế hoạch trong thư mục này không phải bằng chứng mô hình đã được huấn luyện. Bằng chứng phải đến từ run thật và có hash.
