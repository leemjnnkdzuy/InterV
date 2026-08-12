# Dataset card — Vietnamese speech (template)

## Tóm tắt

| Trường | Giá trị |
|---|---|
| Tên bộ dữ liệu | `TODO` |
| Ngôn ngữ | Vietnamese (`vi-VN`) |
| Mục đích | Fine-tuning/evaluation ASR |
| Tổng thời lượng | `TODO` |
| Số speaker | `TODO` |
| License | `TODO` |
| Consent/legal basis | `TODO` |
| Manifest SHA-256 | `TODO` |

## Thành phần audio

- Định dạng gốc: `TODO`
- Sample rate gốc: `TODO`
- Chuẩn hóa dự kiến: mono, `16 kHz`, PCM WAV 16-bit.
- Khoảng thời lượng: `TODO`
- Thiết bị/điều kiện thu: `TODO`
- Slice giọng/vùng/nhiễu: `TODO`

## Transcript policy

- Giữ chữ Quốc ngữ và dấu tiếng Việt.
- Quy định viết số, viết tắt, ký hiệu và tên riêng phải được ghi riêng.
- Không âm thầm sửa transcript sau khi tạo manifest; mỗi lần sửa tạo version mới.
- Lưu cả transcript gốc và transcript chuẩn hóa khi quyền riêng tư cho phép.

## Chia tập

| Split | Speaker-disjoint | Số mẫu | Thời lượng | Hash |
|---|---:|---:|---:|---|
| train | Có | `TODO` | `TODO` | `TODO` |
| dev | Có | `TODO` | `TODO` | `TODO` |
| test | Có | `TODO` | `TODO` | `TODO` |

## Rủi ro và giới hạn

Có thể tồn tại mất cân bằng vùng giọng, chất lượng thu, nội dung và speaker. Không dùng bộ dữ liệu này để suy luận độ chính xác cho toàn bộ người nói tiếng Việt nếu chưa có đánh giá ngoài miền.
