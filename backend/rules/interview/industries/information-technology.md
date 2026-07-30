---
rule_id: "rule:industry:information-technology"
kind: "industry"
industry: "Công nghệ thông tin"
aliases: ["it", "cntt", "software", "technology"]
schema_version: 1
---
# Rule ngành: Công nghệ thông tin

## Phạm vi

Áp dụng cho mọi level trong ngành **Công nghệ thông tin**. JD cụ thể được dùng để thu hẹp
năng lực, nhưng không được xóa các yêu cầu an toàn, đạo đức và evidence của rule này.

## Năng lực cốt lõi

1. **Nền tảng kỹ thuật và tính đúng đắn**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
2. **Phân rã vấn đề và gỡ lỗi**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
3. **Thiết kế hệ thống và trade-off**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
4. **Chất lượng mã, kiểm thử và vận hành**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
5. **Bảo mật và quyền riêng tư**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
6. **Giao tiếp kỹ thuật**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
7. **Ownership và reliability**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.
8. **Học công nghệ mới**: phải được đo bằng hành vi, sản phẩm công việc hoặc quyết định có thể kiểm tra.

## Bằng chứng ưu tiên

- Kiến trúc, constraint và quyết định kỹ thuật cụ thể.
- Log, metric, test hoặc dữ liệu xác nhận nguyên nhân.
- Sla/slo, latency, throughput, lỗi hoặc chi phí trước-sau.
- Pull request, incident, release hoặc migration có vai trò rõ.
- Trade-off bảo mật, khả năng bảo trì và tốc độ giao hàng.

## Tình huống chuẩn để biến đổi thành câu hỏi

1. Dịch vụ production tăng latency sau một lần deploy.
2. Thiết kế api phải cân bằng consistency, scale và thời hạn.
3. Legacy code thiếu test nhưng cần thay đổi khẩn cấp.
4. Lỗ hổng bảo mật xuất hiện sát ngày phát hành.
5. Hai nhóm bất đồng về ownership của một hệ thống dùng chung.

## Dấu hiệu cần thận trọng

- Nói công nghệ theo khẩu hiệu nhưng không giải thích cơ chế.
- Không phân biệt đóng góp cá nhân với kết quả của cả nhóm.
- Bỏ qua rollback, monitoring, testing hoặc threat model.

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
