# InterV AI Backend

Python service cho toàn bộ tác vụ AI của InterV.

- FastAPI chỉ cung cấp `GET /health` trên cổng `3001`.
- Contract nghiệp vụ chạy bằng gRPC trên cổng `50051`.
- Mọi RPC yêu cầu metadata `x-internal-api-key`.
- DeepSeek, AssemblyAI, Edge TTS và SenseVoice được kiểm tra khi khởi động.
- `GetDeepSeekBalance` đọc số dư provider mà không lộ API key; các RPC DeepSeek trả
  telemetry token/cache/retry/latency để Next.js ghi ledger chi phí.
- Interview RAG chạy trong backend bằng Qdrant, không dùng MongoDB làm vector store.
- Rule engine fail-fast với 15 ngành, 4 tier và 60 profile ngành-level.

## Cài đặt

Chạy từ thư mục gốc dự án:

```powershell
py -3.14 -m venv backend\.venv
backend\.venv\Scripts\python -m pip install --upgrade pip
backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Điền API key thật trong `.env`. `AI_BACKEND_INTERNAL_KEY` phải khớp với frontend.
Mặc định Qdrant chạy embedded và lưu ở `backend/data/qdrant`. Có thể đặt
`QDRANT_URL`/`QDRANT_API_KEY` để dùng Qdrant server hoặc cloud mà không đổi code.

## Khởi tạo và kiểm tra RAG

Backend tự validate corpus và bootstrap Qdrant khi khởi động. Có thể chạy riêng trước
để tải model và kiểm tra index:

```powershell
cd backend
$env:PYTHONUTF8 = "1"
.\.venv\Scripts\python scripts\rag_admin.py bootstrap
.\.venv\Scripts\python scripts\rag_admin.py status
.\.venv\Scripts\python scripts\rag_admin.py search `
  "production latency log metric rollback" `
  --industry "Công nghệ thông tin" `
  --level Senior `
  --limit 5
```

`bootstrap` là idempotent: chỉ embed file mới/đổi và xóa rule chunk không còn trong
corpus. Dùng `scripts\rag_admin.py rebuild --yes` khi cần tạo lại toàn bộ collection.
Lần đầu FastEmbed tải dense model đa ngôn ngữ và sparse BM25 vào
`backend/data/model-cache`.

Rule nguồn nằm tại `rules/interview/`:

- 5 core rule về structure, probing, scoring, fairness và AI grounding;
- 15 rule ngành;
- 4 rule tier;
- 60 profile chính xác, mỗi profile có blueprint tối thiểu 5 câu;
- `sources.md` và `manifest.json` phục vụ citation/audit.

Kiểm tra corpus không bị lệch generator:

```powershell
.\.venv\Scripts\python scripts\generate_interview_rules.py --check
```

## Chạy

```powershell
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 3001
```

Lần đầu SenseVoice sẽ tải model. Server chỉ báo sẵn sàng sau khi:

1. cấu hình DeepSeek và AssemblyAI hợp lệ;
2. SenseVoice load thành công với `trust_remote_code=False` và checkpoint đúng
   `SENSEVOICE_MODEL_SHA256`;
3. Edge TTS trả được danh sách giọng tiếng Việt;
4. rule corpus đủ 60 profile và có source ID hợp lệ;
5. Qdrant/FastEmbed sẵn sàng và rule corpus đã được index;
6. gRPC bind thành công tại `GRPC_PORT`.

Redis chỉ là tầng cache tối ưu; khi Redis không chạy, cache trong process được dùng. Kafka là kênh sự kiện mở rộng và không tham gia quyết định AI.

## Sinh lại gRPC stubs

```powershell
backend\.venv\Scripts\python -m grpc_tools.protoc `
  -I frontend\proto `
  --python_out=backend `
  --grpc_python_out=backend `
  frontend\proto\interv_ai.proto
```

Hai file sinh ra là `backend/interv_ai_pb2.py` và `backend/interv_ai_pb2_grpc.py`.

## Invariant dữ liệu

- `StartInterview` index context riêng tư.
- `SubmitAnswer` index từng turn idempotent.
- `EvaluateInterview` index evaluation/audio metadata và tạo question pattern đã bỏ
  câu trả lời.
- Generation chỉ truy hồi `rule_chunk` và `question_pattern`; raw answer của ứng viên
  khác bị chặn ở cả Qdrant filter và post-filter.
- Mỗi câu/đánh giá phải cite profile rule cùng một retrieved evidence ID. ID ngoài
  allow-list làm RPC thất bại.
- `DeleteKnowledge` xóa toàn bộ knowledge theo session/run; route xóa practice gọi RPC
  này trước khi cascade MongoDB.
- `StartInterview`, `SubmitAnswer` và `EvaluateInterview` trả `DeepSeekUsage`.
  Khi RPC lỗi, cùng payload tối giản được gửi ở trailing metadata để request đã phát
  sinh tại provider vẫn được hạch toán.
- Qdrant không giữ raw audio; binary audio tiếp tục nằm trong `PracticeAudio`.

## Test

```powershell
cd backend
$env:PYTHONPATH = (Get-Location).Path
.\.venv\Scripts\python -m unittest discover -s tests -v
```

Live smoke DeepSeek + Qdrant (có phát sinh request tính phí):

```powershell
.\.venv\Scripts\python scripts\smoke_interview_ai.py --mode generation
.\.venv\Scripts\python scripts\smoke_interview_ai.py --mode evaluation
```

Mode `evaluation` dùng 5 câu trả lời synthetic và metadata SenseVoice synthetic để
kiểm tra evaluator/grounding; nó không thay thế test model audio thật.

Ca full-stack có audio thật nằm ở `frontend/scripts/e2e-smoke.mjs`; chạy bằng
`pnpm test:e2e-smoke` khi cả hai service đang sẵn sàng. Evaluator từ chối mọi
grounding ID ngoài allow-list và chỉ gọi một lượt repair hoàn chỉnh nếu JSON đầu
tiên không qua backend validation.

Smoke TTS và SenseVoice thật có thể chạy bằng một audio ngắn; model khoảng 1 GB được
cache dưới thư mục ModelScope của user. Production nên prewarm khi deploy để request
phỏng vấn không chịu chi phí tải model lần đầu.

Nếu gRPC bind ngoài loopback, backend từ chối khởi động khi thiếu TLS cert/key. Đặt
thêm `GRPC_TLS_CLIENT_CA_PATH` để bắt buộc mTLS. Không mount certificate hoặc API key
vào image; inject bằng secret manager tại runtime.
