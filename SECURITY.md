# Security Policy

## Trust boundaries

- Browser chỉ giao tiếp với Next.js cùng origin qua HTTPS và với AssemblyAI bằng
  token streaming ngắn hạn.
- Next.js là lớp xác thực/ủy quyền, lưu dữ liệu MongoDB và gọi AI backend bằng gRPC.
- AI backend không public nghiệp vụ HTTP; mọi RPC cần internal key và remote gRPC
  bắt buộc TLS.
- DeepSeek/JD/transcript/RAG evidence đều được xem là dữ liệu không tin cậy, không
  phải instruction.

## Controls implemented

- JWT có issuer/audience/type/algorithm cố định; access request kiểm tra cả session
  đang hoạt động và tài khoản chưa khóa. Refresh token chỉ lưu hash và được rotation.
- Route admin/recruiter có guard ở server layout và API authorization độc lập. API
  đọc role từ database cho từng request; role trong JWT không đủ để nâng quyền.
- Nâng/hạ role và khóa/mở tài khoản chạy trong Mongo transaction, chặn tự hạ quyền,
  chặn khóa admin cuối cùng, thu hồi session và ghi audit log đã loại secret.
- Recruiter chỉ tra cứu/mời tài khoản role `user` đã xác minh và đang hoạt động.
  Tạo campaign/session/invitation và hoàn tất kết quả đều có transaction; cấu hình
  phiên tuyển dụng bị khóa và candidate không thể sửa/xóa để gian lận.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` ở production; Proxy chặn cross-site
  mutation, gắn CSP nonce và các security header.
- Login, OTP, TTS, upload, streaming token và payment có rate limit phía server.
- Password tối thiểu 12 ký tự; OTP/password chờ xác thực được hash; đổi/reset password
  thu hồi session.
- Upload được allow-list, kiểm magic bytes, kích thước, zip traversal, macro và zip
  bomb; parser chạy ngoài event loop với timeout.
- Payment webhook xác minh signature SDK và đối chiếu `orderCode`, `amount`,
  `paymentLinkId`; verify và đối soát admin dùng cùng validation/settlement. URL
  checkout trả về admin chỉ nhận HTTPS và lỗi SDK không được lưu thô vào database.
- Điều chỉnh credit admin chặn số dư âm, có giới hạn/rate limit/idempotency key và
  ghi credit ledger cùng audit log trong một Mongo transaction.
- Đăng ký, reset/đổi mật khẩu, đổi email, thu hồi session và credit ledger dùng
  transaction; reset grant chỉ lưu hash và được tiêu thụ một lần.
- Start interview có request hash, lease và idempotency key giữ qua retry; duplicate
  request không thể trừ credit lần hai. Mọi JSON/multipart/webhook đều có hard cap
  streaming trước khi parse.
- Cache fallback có TTL, giới hạn item và byte. Audio/RPC có giới hạn từng phần và
  toàn run.
- SenseVoice không chạy remote code và checkpoint phải khớp SHA-256.
- DeepSeek output phải qua schema, exact-answer evidence và grounding allow-list;
  repair tối đa một lần vẫn phải qua cùng validator.
- DeepSeek credential chỉ tồn tại ở Python backend. Balance RPC giới hạn payload và
  chỉ trả decimal/currency/model đã làm sạch. Usage event cùng aggregate token/cost
  được ghi idempotent trong một transaction; trailing gRPC metadata giữ telemetry
  ngay cả khi provider request hoặc logical operation thất bại.

## External controls required

- WAF/CDN hoặc reverse proxy cho DDoS, request-rate edge và trusted proxy headers.
- TLS certificate lifecycle, secret manager, Mongo/Qdrant encryption at rest,
  backup/restore và network ACL.
- Malware scanner/CDR là lớp bổ sung cần có nếu sau này cho phép loại file văn phòng
  ngoài PDF/DOCX/TXT hoặc nhận file từ nguồn doanh nghiệp không kiểm soát.
- Thiết lập retention cho raw audio theo chính sách riêng tư của đơn vị triển khai.

## Incident response

Không gửi secret qua chat, issue, log hoặc commit. Khi một key xuất hiện ngoài secret
manager, thu hồi/xoay key tại provider, cập nhật `.env`/deployment secret, restart
dịch vụ và thu hồi session liên quan. Báo cáo bảo mật phải kèm route/RPC, điều kiện
tái hiện và mức ảnh hưởng, không kèm dữ liệu người dùng thật.
