# PHÂN TÍCH VÀ NỘI DUNG TỪNG SLIDE (KLTN_InterV_LeMinhDuy_v20.pptx - 37 Slides)

## Slide 1

- NGHIÊN CỨU THIẾT KẾ VÀ PHÁT TRIỂN KIẾN TRÚC HỆ THỐNG PHỎNG VẤN NĂNG LỰC TỰ ĐỘNG TÍCH HỢP XỬ LÝ GIỌNG NÓI ĐA TẦNG, TRUY XUẤT TRI THỨC TĂNG CƯỜNG (RAG) VÀ MÔ HÌNH NGÔN NGỮ LỚN
- Sinh viên: Lê Minh Duy - MSSV: 221A011220
- GVHD: ThS. Đặng Văn Lực • Trường Đại học Văn Hiến • 2026

---

## Slide 2

- Lộ trình trình bày
- 01
- Bài toán
- Bối cảnh, đối tượng, mục tiêu
- 02
- Phương pháp
- Nền tảng và cách xác minh
- 03
- Thiết kế
- Kiến trúc, dữ liệu, pipeline
- 04
- Sản phẩm
- Luồng trải nghiệm thực tế
- 05
- Bằng chứng
- Quy mô và kiểm thử
- 06
- Kết luận
- Đóng góp, giới hạn, lộ trình

---

## Slide 3

- BÀI TOÁN
- 01
- Bối cảnh, đối tượng, mục tiêu và 4 nguyên tắc khóa phạm vi

---

## Slide 4

- Bài toán: chuẩn hóa mà không loại bỏ phán đoán con người
- LLM thiếu căn cứ
- Câu hỏi có thể trôi chảy nhưng lệch JD hoặc không truy nguyên.
- Thiếu nhất quán
- Phỏng vấn tự do làm câu hỏi và tiêu chí thay đổi giữa ứng viên.
- Suy diễn quá mức
- Tín hiệu giọng nói dễ bị biến thành kết luận tâm lý thiếu bằng chứng.
- Yêu cầu thiết kế: cùng tiêu chí • output có căn cứ • AI không thay quyết định con người.
- #01

---

## Slide 5

- Ba nhóm người dùng, ba ranh giới trách nhiệm
- Recruiter
- Quản lý JD, chiến dịch, bằng chứng và đánh giá cuối.
- Ứng viên
- Luyện tập hoặc tham gia phiên theo lời mời.
- Admin
- Vận hành hệ thống; không thay recruiter ra quyết định.
- Ownership xuyên suốt: ứng viên sở hữu dữ liệu cá nhân • recruiter sở hữu quyết định • admin chỉ vận hành.
- #01

---

## Slide 6

- Mục tiêu và câu hỏi nghiên cứu
- 01
- Hai chế độ
- Practice và recruitment tách vòng đời
- 02
- Grounded LLM
- JD/rule giới hạn output
- Speech an toàn
- Coaching, không chẩn đoán
- 04
- Provenance
- Evidence khác blueprint
- 05
- Xác minh
- Test, type check, corpus audit
- 06
- Ranh giới
- Không auto-hire/auto-reject
- #01

---

## Slide 7

- Phạm vi đề tài được khóa bằng bốn nguyên tắc
- Ngoài phạm vi: chẩn đoán tâm lý • auto-hire/auto-reject • tuyên bố validity/fairness.
- 01
- Evidence-first
- Output quan trọng nối về JD/rule có ID.
- 02
- Human-in-the-loop
- Recruiter giữ quyết định cuối.
- 03
- Observation only
- Emotion chỉ mô tả tín hiệu.
- 04
- Đúng mức bằng chứng
- Kỹ thuật không đồng nghĩa validity/fairness.
- #01

---

## Slide 8

- PHƯƠNG PHÁP
- 02
- Nền tảng lý thuyết, xác minh kỹ thuật và ánh xạ vào hệ thống

---

## Slide 9

- Phương pháp tách rõ “chạy đúng” và “đo lường có hiệu lực”
- Thiết kế hệ thống
- Kiến trúc, pipeline, state và sequence
- Tổng quan tài liệu
- Structured interview, STAR, BARS, AI governance
- Xác minh kỹ thuật
- Unit/contract test, type check, corpus audit
- Audit hiện vật
- Route, model, proto, service, rule và test
- 01
- 02
- 03
- 04
- #02

---

## Slide 10

- Lý thuyết được chuyển thành cơ chế phần mềm
- STAR + BARS
- Hành vi quan sát được gắn với mốc đánh giá.
- Structured interview
- Cùng năng lực, thang đo và evidence requirement.
- Responsible AI
- Grounding, audit, fallback và người chịu trách nhiệm cuối.
- Ánh xạ vào hệ thống: Structured interview → schema • STAR/BARS → rule • Responsible AI → grounding + audit.
- #02

---

## Slide 11

- THIẾT KẾ
- 03
- Kiến trúc 2 tầng, Lookahead 0ms, RAG Hybrid Grounding, Pipeline tiếng nói 2 pha & Typed gRPC

---

## Slide 12

- AI + tri thức
- Python/gRPC (16 RPCs), DeepSeek, Qdrant, speech
- Web + BFF
- Next.js kiểm soát quyền và điều phối
- Dữ liệu
- MongoDB giao dịch; event phục vụ audit
- Kiến trúc InterV: các biên trách nhiệm có hợp đồng
- Web client
- Next.js
- BFF + nghiệp vụ
- TypeScript
- AI boundary
- Python / gRPC
- Model providers
- DeepSeek • Speech
- MongoDB
- state + audit
- Qdrant
- Dense + BM25
- #03

---

## Slide 13

- Mô hình dữ liệu giữ ownership và provenance
- User, job, invitation, interview, answer, evaluation và audit liên kết theo vòng đời.
- User
- Job
- Invitation
- Interview
- Answer
- Evaluation
- #03

---

## Slide 14

- Ba actor dùng chung nền tảng nhưng không chia sẻ quyền quyết định; AI nằm ngoài biên tuyển dụng.
- InterV
- application core
- Ứng viên
- Recruiter
- Admin
- AI providers
- Luyện tập / tham gia
- JD / chiến dịch / đánh giá
- AI không giữ quyền tuyển dụng
- Use case phản ánh đúng quyền sở hữu
- #03

---

## Slide 15

- Lookahead thích ứng câu hỏi mà không ngắt phiên
- Qᵢ₊₁ được trả ngay; after() sinh Qᵢ₊₂ từ QA vừa commit.
- LUỒNG NGƯỜI DÙNG
- Qᵢ
- ghi âm +
- transcript
- Câu hiện tại
- COMMIT
- QA
- Qᵢ₊₁
- đã có trong
- questions[]
- CÂU KẾ TIẾP · TRẢ NGAY
- Trả trước,
- thích ứng sau
- Người dùng không phải chờ DeepSeek tạo câu kế tiếp.
- LUỒNG NỀN · LOOKAHEAD
- 1
- QA đã lưu
- chống ghi lặp
- 2
- SubmitAnswer
- current + history
- 3
- RAG + DeepSeek
- probe gap / slot chưa phủ
- 4
- Validate
- không lặp · ID hợp lệ
- Qᵢ₊₂
- ghi đè khi
- chưa phục vụ
- DÙNG Ở LƯỢT SAU
- Đủ số câu → Finish → SenseVoice → EvaluateInterview → COMPLETED
- #03

---

## Slide 16

- Grounded generation
- Chuẩn hóa context → truy hồi evidence → sinh JSON → hậu kiểm schema và citation.
- CƠ CHẾ KIỂM SOÁT
- 01
- Chuẩn hóa
- context
- Input contract
- 02
- Hybrid
- retrieval
- Evidence IDs
- 03
- DeepSeek
- JSON
- Structured output
- 04
- Schema
- validation
- Validation gate
- 05
- Grounding
- allow-list
- Citation gate
- Evidence IDs   →   JSON có cấu trúc   →   Output hợp lệ
- Bất biến: citation chỉ hợp lệ khi thuộc evidence đã được truy hồi.
- #03

---

## Slide 17

- Vòng đời tài liệu RAG có provenance
- Mỗi evidence ID truy ngược được về nguồn, phiên bản và trạng thái lưu giữ.
- INGEST
- RETRIEVE
- GROUND + VERIFY
- Nguồn + metadata
- Ngành • profile
- provenance
- Chunk + hash
- Định danh nội dung
- Qdrant index
- Dense + sparse
- Hybrid retrieval
- BM25 + dense → RRF
- Grounded context
- Evidence allow-list
- Validate output
- Schema + citation
- 01
- 02
- 03
- 04
- 05
- 06
- PROVENANCE XUYÊN SUỐT
- Quản trị phiên bản
- manifest • corpus hash • rollback
- Evidence IDs
- nguồn • ngành • profile
- Retention & audit
- xóa khi quá hạn • ghi vết
- #03

---

## Slide 18

- Pipeline tiếng nói nhiều tầng: Realtime & Hậu kỳ phỏng vấn
- AssemblyAI streaming • Faster-Whisper fallback & batch • SenseVoice LID/SER/AED
- 1. LUỒNG REALTIME TRONG PHỎNG VẤN (TƯƠNG TÁC LIỀN MẠCH)
- 2. LUỒNG XỬ LÝ HẬU KỲ SAU PHỎNG VẤN (ĐÁNH GIÁ CHUYÊN SÂU)
- Microphone
- Thu âm AudioWorklet (16kHz PCM)
- AssemblyAI Streaming
- STT thời gian thực (WebSocket)[Lỗi → Faster-Whisper fallback]
- AI Provider (DeepSeek)
- Có text tức thời → Sinh câu hỏi thích ứng & TTS mượt mà, không rời rạc
- Faster-Whisper tuần tự
- STT chính xác cao + Thuật toán: nhịp độ, tốc độ (WPM), khoảng lặng
- SenseVoice (Observation only)
- LID/SER/AED
- Đánh giá phong thái
- Mức độ tự tin, lưu loát, nhịp điệu diễn đạt hỗ trợ coaching
- #03

---

## Slide 19

- An toàn, quan sát và khả năng phục hồi
- Auth/RBAC • schema • timeout/retry • audit/usage • health • graceful fallback
- Auth + RBAC
- Schema validation
- Timeout • retry • circuit breaker
- Audit • usage • health
- Graceful fallback
- Đúng quyền
- Có đường phục hồi
- Đủ dấu vết audit
- #03

---

## Slide 20

- Hợp đồng typed giữ TypeScript ↔ Python nhất quán
- BFF xác thực và chuẩn hóa request; dữ liệu chỉ được lưu hoặc hiển thị sau khi qua schema validation.
- REQUEST  →
- 01
- Client
- Request
- 02
- Next.js BFF
- Auth + normalize
- 03
- Proto / gRPC
- Typed RPC
- 04
- Python service
- → AI provider
- ←  RESPONSE
- Persist / hiển thị
- Dữ liệu hợp lệ
- Schema validation
- Evidence IDs + status
- JSON + evidence
- Structured response
- Typed contract chặn lỗi cấu trúc trước khi dữ liệu đi vào state của hệ thống.
- #03

---

## Slide 21

- SẢN PHẨM
- 04
- Ma trận RBAC, State Machine luyện tập, Vòng đời tuyển dụng Recruiter & Graceful Fallback

---

## Slide 22

- RBAC giữ quyền quyết định ở đúng actor
- Ứng viên
- Practice
- Join invite
- View own data
- Recruiter
- Manage JD
- Campaign
- Final review
- Admin
- Operate
- Moderate
- Audit
- AI provider: không có quyền hire / reject
- Quyền tăng theo trách nhiệm; AI không có quyền tuyển dụng.
- #04

---

## Slide 23

- State machine giữ phiên luyện tập nhất quán
- DRAFT
- READY
- RECORDING
- PROCESSING
- REVIEWED
- COMPLETED
- ERROR → retry / resume
- Mỗi chuyển trạng thái có điều kiện và đường fallback.
- #04

---

## Slide 24

- Vòng đời tuyển dụng tách mời, phiên và đánh giá
- Job + JD
- Campaign
- Invitation
- Interview
- Evidence
- Final review
- Recruiter quyết định
- Tách ownership giúp audit và xóa dữ liệu đúng phạm vi.
- #04

---

## Slide 25

- Fallback giữ phiên tiếp tục khi provider lỗi
- Audio stream
- AssemblyAI
- Transcript
- Timeout
- Faster-Whisper
- Resume session
- PRIMARY PATH
- FALLBACK PATH
- #04

---

## Slide 26

- Stack công nghệ theo ranh giới trách nhiệm
- Mỗi nhóm công nghệ sở hữu một trách nhiệm; các lớp giao tiếp qua hợp đồng typed.
- PRODUCT & STATE
- 01
- Web/BFF
- Next.js • React • TypeScript
- 02
- Dữ liệu
- MongoDB • Mongoose
- AI SERVICES
- 03
- AI boundary
- Python • gRPC (16 RPCs)
- 04
- LLM/RAG
- DeepSeek • Qdrant
- BM25 + RRF
- 05
- Speech
- AssemblyAI • Faster-Whisper
- SenseVoice
- 06
- Vận hành
- PayOS • audit • health • usage
- #04

---

## Slide 27

- BẰNG CHỨNG
- 05
- Quy mô hiện vật 72.000+ LOC, 51/51 Backend tests đạt 100%, 3 điểm kiểm soát LLM & Bất biến SenseVoice

---

## Slide 28

- Quy mô hiện vật triển khai
- Các con số được đối chiếu trực tiếp từ repository và hợp đồng dịch vụ.
- 72.445
- Dòng mã
- 61 / 74
- Route files / HTTP methods
- 19
- Mongoose models
- 16
- gRPC RPCs
- 468 tệp văn bản • 38 trang frontend • 86 rule files
- #05

---

## Slide 29

- Xác minh kỹ thuật đạt; hiệu lực tuyển dụng chưa được chứng minh
- Kiểm tra bổ sung: TypeScript ✓ • corpus provenance ✓ • backend 51/51 ✓
- 51/51
- Backend tests
- Đạt 100% trong 3,28 giây
- 86
- Rule files
- 15 ngành • 60 profile
- 16
- gRPC RPCs
- Biên typed TS ↔ Python
- #05

---

## Slide 30

- DeepSeek/RAG được kiểm soát ở ba điểm
- Trong khi sinh
- Prompt yêu cầu JSON cấu trúc và citation.
- Trước khi sinh
- Context chuẩn hóa; evidence có ID và metadata.
- Sau khi sinh
- Schema validation, repair và grounding allow-list.
- Grounding là chuỗi kiểm soát trước – trong – sau khi sinh, không chỉ là một prompt.
- #05

---

## Slide 31

- Bất biến an toàn của SenseVoice
- Mặc định an toàn: confidence/composure = 50 (trung tính); tín hiệu giọng nói chỉ dùng để mô tả.
- 01
- Observation only
- LID/SER/AED chỉ mô tả tín hiệu.
- 02
- Neutral default
- Confidence/composure giữ 50.
- 03
- No psychometrics
- Không suy ra tính cách hay năng lực.
- 04
- No auto-decision
- Không auto-hire/auto-reject.
- #05

---

## Slide 32

- KẾT LUẬN
- 06
- 4 đóng góp then chốt, giới hạn nghiên cứu, 4 cổng kiểm soát triển khai & Lời cảm ơn

---

## Slide 33

- Bốn đóng góp chính
- Mỗi đóng góp đều có thể truy ngược về code, proto, rule và kiểm thử.
- 01
- Kiến trúc end-to-end
- Hai chế độ, ownership và vòng đời riêng.
- 02
- Grounded LLM
- Hybrid retrieval, schema và allow-list.
- 03
- Speech có fallback
- Streaming, batch và quan sát an toàn.
- 04
- Corpus provenance
- 86 rule: evidence khác blueprint.
- #06

---

## Slide 34

- Giới hạn cần được đọc cùng kết quả
- Blueprint cần SME
- 60 profile cần chuyên gia miền thẩm định.
- Chưa có field data
- Chưa kết luận reliability, validity hay fairness.
- Speech cần benchmark
- Chưa có mẫu tiếng Việt đại diện.
- Kết quả hiện tại chứng minh tính nhất quán kỹ thuật — chưa chứng minh hiệu lực tuyển dụng.
- #06

---

## Slide 35

- Bốn cổng kiểm soát trước khi mở rộng tự động hóa
- Validity, fairness, legal review
- 1–2 profile có SME, BARS
- Decision support
- Evidence-first; không auto-reject
- Practice hardening
- Security, E2E, delete, UI clarity
- 01
- 02
- 03
- 04
- Profile pilot
- Controlled scale
- Mỗi giai đoạn có một gate bắt buộc trước khi tăng mức tự động hóa.
- #06

---

## Slide 36

- InterV đã đạt nền tảng kỹ thuật khả thi
- cho nghiên cứu và triển khai có kiểm soát
- KẾT LUẬN
- 01
- Grounded LLM
- Evidence IDs • schema
- • grounding allow-list
- 02
- Typed contracts
- + fallback
- BFF ↔ gRPC • schema
- • provider fallback
- 03
- Human-in-the-loop
- rollout
- AI hỗ trợ bằng chứng;
- con người quyết định
- Bước tiếp theo: kiểm thử với SME và triển khai theo các gate kiểm soát.
- #06

---

## Slide 37

- Cảm ơn Hội đồng
- Em xin tiếp nhận câu hỏi và góp ý.
- Q&A
- InterV • Lê Minh Duy • @leemjnnkdzuy
- #06

---

