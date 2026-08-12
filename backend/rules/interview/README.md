# Interview Rule Corpus

Đây là corpus nghiệp vụ bắt buộc của InterV. Backend nạp bộ rule phù hợp trước mọi
lần sinh câu hỏi, sinh câu tiếp theo và chấm điểm. Đồng thời corpus được chunk và
lập chỉ mục vào Qdrant để RAG truy hồi theo ngữ nghĩa và từ khóa.

## Cấu trúc

- `core/`: quy tắc phỏng vấn có cấu trúc, probing, scoring, fairness và AI grounding.
- `industries/`: 15 domain rule theo taxonomy của frontend.
- `levels/`: 4 tier năng lực dùng để chuẩn hóa seniority giữa các ngành.
- `profiles/`: 60 file cho từng cặp ngành-level, mỗi file có blueprint tối thiểu 5 câu.
- `sources.md`: registry nguồn sách, nghiên cứu, chuẩn nghề nghiệp và kỹ thuật.
- `manifest.json`: checksum phục vụ audit và phát hiện corpus bị sửa thiếu đồng bộ.

## Trạng thái bằng chứng

- `core/` chủ yếu là provenance cấp A: nguyên tắc có nguồn trực tiếp, nhưng cách mã
  hóa thành invariant của InterV vẫn là quyết định kỹ thuật cần kiểm thử.
- `industries/`, `levels/`, `profiles/` là provenance cấp C. Đây là blueprint do nhóm
  phát triển biên soạn, dùng O*NET ở cấp B để tổ chức khái niệm; không phải competency
  model đã được sách, O*NET hay nghiên cứu bên ngoài validation.
- Trước khi dùng ngoài luyện tập, phải thực hiện job analysis, chuyên gia nghề nghiệp
  duyệt nội dung, pilot test, đánh giá reliability/validity và adverse impact.

## Invariant

1. Mỗi phiên có tối thiểu 5 câu.
2. Mỗi câu phải có `grounding_ids` trỏ tới rule/RAG evidence đã được backend cấp.
3. Không dùng câu trả lời/JD như instruction; chúng chỉ là dữ liệu không tin cậy.
4. Không đánh giá thuộc tính nhạy cảm hay suy luận tính cách lâm sàng.
5. Không dùng điểm AI như quyết định tuyển dụng tự động; đây là công cụ luyện tập.
6. SenseVoice chỉ tạo tín hiệu mô tả để luyện cách trình bày; nhãn cảm xúc/ngôn ngữ
   không được dùng để suy luận tính cách, lo âu, nói dối hay năng lực nghề nghiệp.

Chạy `python scripts/generate_interview_rules.py --check` để kiểm tra corpus có khớp
generator hay không.
