# Rule — hồ sơ nghiên cứu và kiểm soát bằng chứng

Thư mục này là hồ sơ phương pháp cho các quyết định liên quan đến dữ liệu, mô hình và đánh giá của InterV. Nội dung được tổ chức để người khác có thể truy ngược từ một kết luận về đúng nguồn dữ liệu, lệnh chạy và artefact đã tạo.

> Trạng thái ban đầu: **DRAFT**. Các mục chưa có log, hash hoặc artefact không được xem là kết quả đã xác nhận.

## Mục tiêu

- Tách giả thuyết, phương pháp, quan sát và kết luận.
- Ghi lại nguồn dữ liệu, phiên bản code, môi trường và tiêu chí đánh giá.
- Không biến kế hoạch thành bằng chứng thực nghiệm.
- Cho phép một reviewer độc lập lặp lại từng bước.

## Tài liệu

- [research-protocol.md](research-protocol.md): quy trình nghiên cứu và nguyên tắc reproducibility.
- [evidence-log.md](evidence-log.md): nhật ký bằng chứng cần điền bằng kết quả thật.
- [review-checklist.md](review-checklist.md): checklist trước khi gửi báo cáo.

## Quy ước trạng thái

`DRAFT` → `RUNNING` → `OBSERVED` → `REVIEWED` → `ACCEPTED`.

Không sử dụng `ACCEPTED` nếu chưa có artefact và người kiểm tra độc lập.
