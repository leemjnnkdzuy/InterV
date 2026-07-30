# InterV

InterV là hệ thống luyện phỏng vấn giọng nói dùng Next.js, MongoDB và một AI backend Python. Trình duyệt chỉ gọi API cùng nguồn của Next.js. Mọi giao tiếp nội bộ từ Next.js sang AI backend đều dùng gRPC theo contract tại `frontend/proto/interv_ai.proto`.

## Kiến trúc chạy

```text
Browser
  |-- HTTPS/REST + cookie --> Next.js :3000
  |-- WSS + temporary token --> AssemblyAI Streaming

Next.js :3000
  |-- gRPC + x-internal-api-key --> Python AI backend :50051
  |-- MongoDB --> users, sessions, runs, binary audio, results, ledgers
  |-- Event MongoDB --> API metadata logs (TTL 7 ngày)
  |-- HTTPS --> PayOS

Python :3001 (health) / :50051 (gRPC)
  |-- Rule engine --> 5 core + 15 ngành + 4 tier + 60 profile Markdown
  |-- Qdrant + FastEmbed --> hybrid RAG đa ngôn ngữ/BM25
  |-- DeepSeek --> câu hỏi thích ứng và đánh giá có grounding ID
  |-- Edge TTS --> đọc câu hỏi
  |-- Faster Whisper --> khôi phục transcript khi bản realtime rỗng
  |-- SenseVoice --> cảm xúc, phong thái và độ tự tin
```

DeepSeek, Qdrant RAG, AssemblyAI, Edge TTS và SenseVoice là thành phần bắt buộc.
Backend không khởi động nếu rule thiếu, RAG không sẵn sàng, cấu hình bắt buộc sai hoặc
model không load được. Luồng phỏng vấn không có câu hỏi, transcript, điểm số hay
thanh toán giả. Mọi phiên có tối thiểu 5 câu.

## Yêu cầu

- Node.js 20 trở lên
- pnpm
- Python 3.12-3.14 64-bit
- MongoDB replica set hoặc MongoDB Atlas (bắt buộc để dùng transaction)
- Qdrant embedded mặc định; không cần cài server riêng
- API key DeepSeek và AssemblyAI
- Tài khoản SMTP cho đăng ký/xác thực email
- PayOS nếu dùng chức năng nạp credit

SenseVoice tải model khoảng 1 GB ở lần chạy đầu. FastEmbed cũng tải dense model đa
ngôn ngữ và BM25 vào `backend/data/model-cache`. Máy cần đủ dung lượng đĩa và RAM;
chạy CPU được nhưng bước phân tích sẽ chậm hơn GPU.

## Cấu hình

Tạo file môi trường từ các mẫu, sau đó điền giá trị thật:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

`AI_BACKEND_INTERNAL_KEY` phải giống nhau ở hai file và nên là chuỗi ngẫu nhiên dài. Không đưa `DEEPSEEK_API_KEY`, `ASSEMBLY_AI_API_KEY`, khóa PayOS hoặc internal key ra biến `NEXT_PUBLIC_*`.

`MONGODB_URI_EVENT` trong `frontend/.env` phải trỏ đến cluster log riêng.
Collection `apirequestlogs` dùng TTL index trên `createdAt` và tự xóa sau 7 ngày;
thời hạn này được khóa trong schema, không thể kéo dài từ dashboard.

Production phải đặt `NEXT_PUBLIC_APP_URL` là origin HTTPS thật. Ba biến PayOS nằm ở
`frontend/.env`; đăng ký webhook HTTPS là
`https://<domain>/api/payment/webhook`. Nếu gRPC chạy khác máy, cấu hình TLS/mTLS
theo hai file `.env.example`; plaintext chỉ được chấp nhận trên loopback.

## Phân quyền và workspace

InterV có ba vai trò tách biệt:

- `user`: luyện tập cá nhân và làm các cuộc phỏng vấn được giao.
- `recruiter`: dùng workspace `/recruiter`, tạo chiến dịch, chọn ứng viên đã có tài
  khoản, gửi thư mời, theo dõi lịch, tiến độ và kết quả.
- `admin`: dùng workspace `/admin`, quản lý tài khoản/vai trò, giám sát tuyển dụng,
  DeepSeek, thanh toán, credit và audit log.

Layout server chặn truy cập sai vai trò trước khi render. Mọi API `/api/admin/*` và
`/api/recruiter/*` tiếp tục đọc vai trò/trạng thái mới nhất từ MongoDB, nên sửa role
hoặc khóa tài khoản có hiệu lực ngay cả khi access token cũ chưa hết hạn. Các thao
tác đổi role/khóa tài khoản thu hồi toàn bộ session của user mục tiêu và được ghi
vào `AdminAuditLog`.

Tài khoản đặc quyền đầu tiên không được tạo từ form công khai. Tạo một tài khoản
thường, xác minh email, rồi chạy:

```powershell
cd frontend
pnpm admin:set-role -- --email admin@example.com --role admin
```

Lệnh chỉ nâng quyền cho tài khoản đang tồn tại, đã xác minh và đang hoạt động. Có
thể dùng cùng lệnh với `--role recruiter` hoặc `--role user`; mọi session hiện tại
của tài khoản sẽ bị thu hồi.

## Quản trị DeepSeek và tài chính

Workspace admin có hai khu vực riêng:

- `/admin/ai`: đọc số dư DeepSeek live qua gRPC, trạng thái backend/RAG, model đang
  chạy, token input/output/reasoning, cache hit/miss, retry, lỗi, latency, chi phí
  theo ngày/model/tác vụ và ngân sách tháng.
- `/admin/payments`: theo dõi doanh thu/conversion, trạng thái nội bộ và trạng thái
  PayOS, đối soát hoặc hủy giao dịch chưa thanh toán, xem sổ credit và điều chỉnh
  credit người dùng.
- `/admin/api-logs`: theo dõi request, lỗi, p95 latency, tuyến chậm, correlation ID
  và cấu hình ngưỡng cảnh báo. API quản trị tương ứng là `/api/admin/api-logs`.

API log chỉ chứa method, đường dẫn đã làm sạch, tên query key, status, latency,
request ID, actor ID, IP và user agent. Hệ thống không lưu body, query value,
cookie, token, authorization header, stack trace hoặc nội dung lỗi từ provider.

API key DeepSeek chỉ nằm trong Python backend. `GetDeepSeekBalance` chỉ trả số dư,
currency và tên model đã làm sạch; frontend không nhận credential. Mỗi lần gọi model
được ghi idempotent vào `AiUsageEvent` cùng snapshot đơn giá, sau đó cộng tổng token
và chi phí vào `PracticeRun` trong cùng Mongo transaction. Retry và lượt repair
evaluation đều được tính.

Đơn giá mặc định cho `deepseek-v4-flash` và `deepseek-v4-pro` được seed trong
`DeepSeekUsage.ts`; admin có thể cập nhật snapshot dùng để ước tính chi phí mà không
đổi model runtime của backend. Trước khi triển khai cần đối chiếu bảng giá hiện hành
tại `https://api-docs.deepseek.com/quick_start/pricing`.

Thanh toán giữ riêng `status` nội bộ và `providerStatus`. Webhook, route verify và
đối soát admin đều xác minh `orderCode`, số tiền và `paymentLinkId` trước khi cộng
credit. Nguồn sự thật `PAID` từ PayOS được settlement nguyên tử; hủy chỉ gọi PayOS
cho giao dịch chưa thanh toán. Điều chỉnh credit yêu cầu lý do, giới hạn số lượng,
không cho số dư âm, có idempotency key và audit trong cùng transaction.

Một chiến dịch recruiter tạo atomically `RecruitmentCampaign`, một
`PracticeSession` bị khóa cho từng ứng viên và `RecruitmentInvitation`. Ứng viên
phải có role `user`, đã xác minh và đang hoạt động. Thư mời được gửi bất đồng bộ,
có lease/retry và trạng thái `PENDING/SENDING/SENT/FAILED`; recruiter có thể gửi
lại thư lỗi. Phiên tuyển dụng không trừ credit và chỉ chạy khi chiến dịch đang mở,
đúng lịch, chưa hết hạn và chưa vượt số lần làm.

## Cài đặt

Từ thư mục gốc:

```powershell
py -3.14 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install --upgrade pip
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt

cd frontend
pnpm install
cd ..
```

Khi sửa protobuf, sinh lại Python stubs:

```powershell
backend\.venv\Scripts\python -m grpc_tools.protoc `
  -I frontend\proto `
  --python_out=backend `
  --grpc_python_out=backend `
  frontend\proto\interv_ai.proto
```

## Khởi động bằng hai terminal

Terminal 1, AI backend:

```powershell
cd backend
$env:PYTHONUTF8 = "1"
.\.venv\Scripts\python scripts\rag_admin.py bootstrap
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 3001
```

Chờ backend warm up hoàn tất. HTTP health chạy tại `http://localhost:3001/health`; gRPC chạy tại `localhost:50051`.

Terminal 2, frontend:

```powershell
cd frontend
pnpm dev
```

Mở `http://localhost:3000`.

## Kiểm thử

Backend:

```powershell
cd backend
$env:PYTHONPATH = (Get-Location).Path
.\.venv\Scripts\python -m unittest discover -s tests -v
```

Frontend:

```powershell
cd frontend
pnpm lint
pnpm build
pnpm audit --audit-level high
```

Smoke admin/recruiter (cần frontend đang chạy). Chỉ ở môi trường phát triển/test,
có thể đặt `SMTP_DRY_RUN=true` trước khi bật frontend để xác nhận hàng đợi thư mà
không gửi email ra ngoài:

```powershell
cd frontend
pnpm test:admin-recruiter
```

Smoke này kiểm route guard, API role isolation, session revocation, CSRF, giới hạn
payload, tính nguyên tử khi email ứng viên sai, ứng viên trùng, gửi thư, session bị
khóa, miễn credit, lịch recruiter, audit log, aggregate AI usage, số dư DeepSeek
live, danh sách PayOS và điều chỉnh credit nguyên tử/idempotent. Fixture được gắn
prefix riêng và dọn trong `finally`.

Full-stack smoke thật (cần backend + frontend đang chạy, `ffmpeg` trong `PATH`;
có gọi DeepSeek/AssemblyAI và có thể phát sinh chi phí nhỏ):

```powershell
cd frontend
pnpm test:e2e-smoke
pnpm test:recruitment-e2e
```

Script tạo user/practice cô lập, kiểm start song song và idempotency credit, đi đủ
5 câu với audio OGG, lấy AssemblyAI token, chạy SenseVoice + DeepSeek evaluation,
đọc kết quả đã lưu, đối chiếu ledger token/chi phí DeepSeek với `PracticeRun` và dọn
MongoDB/Qdrant trong `finally`.

`test:recruitment-e2e` còn tạo recruiter/campaign qua API thật, kiểm vòng đời
`INVITED → VIEWED → IN_PROGRESS → COMPLETED`, xác nhận ứng viên không bị trừ
credit và kết quả hoàn chỉnh xuất hiện ở cả lịch sử lẫn chi tiết chiến dịch.

Backend dependency audit:

```powershell
cd backend
.\.venv\Scripts\python -m pip install pip-audit
.\.venv\Scripts\pip-audit
```

Health check:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

Kiểm tra rule và RAG:

```powershell
cd backend
.\.venv\Scripts\python scripts\generate_interview_rules.py --check
.\.venv\Scripts\python scripts\rag_admin.py status
.\.venv\Scripts\python scripts\rag_admin.py search `
  "production latency log metric rollback" `
  --industry "Công nghệ thông tin" `
  --level Senior `
  --limit 5
```

Smoke thật qua DeepSeek + Qdrant (có phát sinh request tính phí):

```powershell
cd backend
.\.venv\Scripts\python scripts\smoke_interview_ai.py --mode generation
.\.venv\Scripts\python scripts\smoke_interview_ai.py --mode evaluation
```

## Dữ liệu phỏng vấn

- `PracticeRun` giữ câu hỏi thích ứng, transcript, provider và kết quả.
- `AiUsageEvent` giữ từng logical AI operation, toàn bộ provider request/retry,
  token/cache/latency/error và snapshot đơn giá; event và aggregate trên run được
  ghi cùng transaction.
- `PracticeAudio` giữ từng audio dưới dạng BSON binary trong document riêng; tổng audio mỗi run và kích thước từng đoạn đều bị giới hạn.
- Mỗi token AssemblyAI do backend cấp ngắn hạn và chỉ được tạo sau khi xác thực user/run.
- Khi hoàn thành, audio được stream qua gRPC cho SenseVoice trước khi DeepSeek chấm nội dung.
- Trang kết quả đọc dữ liệu đã lưu theo `runId`; không tự tạo lại điểm ở client.
- RAG không dùng MongoDB: Qdrant giữ rule, context/turn/evaluation riêng tư và question
  pattern đã bỏ câu trả lời. Raw audio không được đưa vào vector store.
- Mỗi câu và mỗi đánh giá lưu `groundingIds`; DeepSeek bị từ chối nếu cite ID không có
  trong allow-list do backend cấp.
- Khi xóa practice, Next.js gọi `DeleteKnowledge` qua gRPC rồi cascade session/run/audio.

## Độ mượt của cuộc phỏng vấn

- Nút Bắt đầu mở khóa audio và xin quyền microphone tại màn hình chuẩn bị, trước khi
  trừ credits.
- Backend sinh đủ bộ câu hỏi và warm TTS trong bước chuẩn bị; câu đầu được trả cùng
  response khởi tạo.
- Start dùng idempotency key bền qua lỗi mạng và lease 370 giây. Request trùng chỉ
  poll trạng thái chuẩn bị; process chết có thể được takeover mà không trừ credit lần
  hai.
- Khi AI đọc câu hỏi, frontend đồng thời mở microphone, AudioWorklet và AssemblyAI
  WebSocket.
- Khi ứng viên xem lại câu trả lời, recorder của lượt kế tiếp đã được chuẩn bị.
- API trả ngay câu kế tiếp đã có sẵn; DeepSeek tạo câu thích ứng cho lượt sau bằng
  `after()` và warm TTS ở background. Nếu lookahead chưa xong, câu nền đã warm được
  dùng ngay nên cuộc trò chuyện không phải chờ model.
- Chỉ bước chấm cuối chạy SenseVoice và DeepSeek evaluation dài; UI hiển thị trạng
  thái tổng hợp và evaluation lease ngăn chấm trùng. Grounding ID sai bị backend
  chặn và DeepSeek chỉ được repair một lần với allow-list chính xác.

## Production bắt buộc

- Terminate HTTPS tại reverse proxy/CDN; chỉ tin `X-Forwarded-For` do proxy đó ghi
  lại. Bật giới hạn request/DDoS ở edge.
- Không public cổng `50051`; dùng loopback, private network hoặc mTLS. Chỉ public
  frontend HTTPS. Cổng `3001` chỉ có health tối giản.
- Bật encryption at rest, backup và access control cho MongoDB/Qdrant; không dùng
  Mongo standalone vì payment/credits/evaluation dùng transaction.
- Xoay JWT, internal key, SMTP, DeepSeek, AssemblyAI và PayOS khi lộ. Lệnh
  `pnpm security:rotate-secrets` xoay JWT/internal key cục bộ và làm mọi session cũ
  mất hiệu lực.
- SenseVoice chạy với `trust_remote_code=False`; checkpoint được kiểm SHA-256 trước
  khi nạp. Khi chủ động nâng model phải review rồi cập nhật checksum.
