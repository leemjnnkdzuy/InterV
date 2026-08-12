# Evidence log

> Đây là biểu mẫu nhật ký. Không điền số liệu, timestamp hoặc kết luận giả. Mỗi dòng phải trỏ tới artefact thật.

## Thông tin phiên nghiên cứu

| Trường | Giá trị |
|---|---|
| Owner | `TODO` |
| Project commit | `TODO` |
| Dataset manifest hash | `TODO` |
| Environment lock | `TODO` |
| Started at | `TODO` |
| Reviewed by | `TODO` |

## Nhật ký thao tác

| ID | Thời gian | Mục đích | Lệnh/script | Input hash | Output/artefact | Status |
|---|---|---|---|---|---|---|
| E-001 | `TODO` | Tạo manifest | `TODO` | `TODO` | `TODO` | DRAFT |
| E-002 | `TODO` | Baseline inference | `TODO` | `TODO` | `TODO` | DRAFT |
| E-003 | `TODO` | Fine-tuning run | `TODO` | `TODO` | `TODO` | DRAFT |
| E-004 | `TODO` | Test evaluation | `TODO` | `TODO` | `TODO` | DRAFT |

## Quy tắc ghi log

1. Ghi lệnh thực tế, không ghi lệnh dự kiến như thể đã chạy.
2. Lưu stdout/stderr cùng run ID.
3. Hash file lớn bằng SHA-256; không commit audio riêng tư.
4. Nếu một run lỗi, giữ lại lỗi và đánh dấu `FAILED`, không xóa lịch sử.
5. Reviewer ký xác nhận sau khi tái hiện được artefact.

## Kết luận tạm thời

`TODO — chỉ cập nhật sau khi có baseline, fine-tuned run và đánh giá độc lập.`
