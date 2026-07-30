---
rule_id: "rule:industry:construction-real-estate"
kind: "industry"
industry: "Xây dựng & Bất động sản"
aliases: ["construction", "real estate", "xây dựng", "bất động sản"]
schema_version: 1
---
# Rule ngành: Xây dựng & Bất động sản

## Phạm vi

Áp dụng cho mọi level trong ngành **Xây dựng & Bất động sản**. JD cụ thể được dùng để thu hẹp
năng lực, nhưng không được xóa các yêu cầu an toàn, đạo đức và evidence của rule này.

## Năng lực cốt lõi

1. **An toàn và tuân thủ**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
2. **Đọc/kiểm soát hồ sơ kỹ thuật**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
3. **Tiến độ và nguồn lực**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
4. **Chi phí và hợp đồng**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
5. **Quality control**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
6. **Quản trị nhà thầu/khách hàng**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
7. **Risk và issue management**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
8. **Giao tiếp hiện trường**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.

## Bằng chứng ưu tiên

- Bản vẽ/spec/boq hoặc hồ sơ giao dịch cụ thể.
- Schedule, cost variance, defect hoặc conversion metric.
- Rfi, change order, nghiệm thu hoặc due diligence.
- Safety action và escalation.
- Trade-off chất lượng-tiến độ-chi phí có phê duyệt.

## Tình huống chuẩn để biến đổi thành câu hỏi

1. Phát hiện sai khác giữa bản vẽ và hiện trường.
2. Nhà thầu chậm tiến độ và yêu cầu phát sinh.
3. Nguy cơ an toàn cần dừng việc.
4. Chi phí vật liệu tăng làm vỡ budget.
5. Khách hàng yêu cầu cam kết ngoài hồ sơ được phê duyệt.

## Dấu hiệu cần thận trọng

- Đẩy nhanh tiến độ bằng cách bỏ qua an toàn/chất lượng.
- Không phân biệt estimate, commitment và actual.
- Che giấu conflict, defect hoặc điều kiện giao dịch quan trọng.

Các dấu hiệu trên kích hoạt probe hoặc hạ confidence; không tự động kết luận ứng viên
không đạt nếu chưa có evidence đối chứng.

## Quy tắc bắt buộc

1. Ít nhất 3 trong 5 câu lõi phải đo competency chuyên ngành từ danh sách trên.
2. Ít nhất một câu yêu cầu số liệu/artefact/quy trình kiểm chứng được.
3. Ít nhất một câu kiểm tra rủi ro, ethics hoặc chất lượng.
4. Câu hỏi phải điều chỉnh theo tier, không chỉ thay nhãn level.
5. Không chấp nhận jargon thay cho reasoning và vai trò cá nhân.

## Nguồn

[ONET2026] [OPM2008] [ROULIN2022]
