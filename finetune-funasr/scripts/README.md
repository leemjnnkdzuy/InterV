# Scripts contract

Các script dự kiến nên có interface không đổi:

```text
prepare_audio --input <raw> --output <processed> --manifest <manifest.jsonl>
validate_manifest --manifest <manifest.jsonl>
run_baseline --config <config.yaml> --output <artifacts>
train_funasr --config <config.yaml> --output <artifacts>
evaluate_asr --checkpoint <checkpoint> --manifest <test.jsonl> --output <metrics.json>
```

Mỗi script phải ghi command line, version code, input hash và output path vào run log. Chưa có script nào được coi là đã chạy chỉ vì interface đã được mô tả.
