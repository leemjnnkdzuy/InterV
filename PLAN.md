# InterV AI Interview Architecture

## Muc tieu

InterV thuc hien mot phien phong van giong noi hoan chinh:

1. DeepSeek tao cau hoi dau tien tu JD, chu de, nganh, do kho va ngon ngu.
2. Edge TTS doc cau hoi.
3. Sau khi TTS ket thuc, browser tu dong bat microphone.
4. Audio PCM16 16 kHz duoc gui realtime toi AssemblyAI bang token ngan han.
5. Ban ghi goc duoc luu base64 trong MongoDB theo tung cau tra loi.
6. DeepSeek tao cau hoi tiep theo dua tren toan bo lich su hoi dap.
7. SenseVoice phan tich cam xuc, phong thai va do tu tin tu audio.
8. DeepSeek cham noi dung theo JD va ket hop ket qua audio thanh bao cao.

Khong co cau hoi, transcript, diem so hoac thanh toan mock trong runtime.

## Bien gioi he thong

- Browser -> Next.js: REST cung nguon, cookie HttpOnly.
- Browser -> AssemblyAI: WebSocket, chi dung temporary token do backend cap.
- Next.js -> Python AI backend: bat buoc gRPC.
- Next.js -> MongoDB: du lieu nguoi dung, practice, run, audio va result.
- Next.js -> PayOS: tao link, xac minh va webhook co chu ky.

Python chi mo HTTP health check; cac nghiep vu AI khong co REST endpoint noi bo.

## gRPC contract

Contract chuan: `frontend/proto/interv_ai.proto`.

RPC:

- `Health`
- `ExtractJd`
- `ListVoices`
- `SynthesizeTts`
- `StartInterview`
- `TranscribeAudio`
- `SubmitAnswer`
- `EvaluateInterview`
- `CreateStreamingToken`
- `AnalyzeInterview` (client streaming)

Moi RPC yeu cau `x-internal-api-key`. Message toi da 32 MB va client co deadline de khong treo request vo han.

## Luu tru

- `PracticeSession`: cau hinh va ket qua gan nhat.
- `PracticeRun`: snapshot cau hinh, cau hoi thich ung, transcript va danh gia.
- `PracticeAudio`: mot document cho mot cau tra loi, co audio base64, MIME, duration, Assembly session id va transcript.
- Unique index `(runId, questionId)` giup retry khong tao ban ghi audio trung.

## Dieu kien san sang

Backend chi khoi dong khi:

- co `DEEPSEEK_API_KEY`;
- co `ASSEMBLY_AI_API_KEY`;
- SenseVoice load duoc model;
- Edge TTS co giong phu hop;
- gRPC bind duoc cong da cau hinh.

Neu mot dich vu bat buoc loi trong phien phong van, UI dung tai buoc do va cho phep retry. Khong tu thay bang du lieu gia.

## Tieu chi kiem thu

- Python compile thanh cong.
- gRPC contract tests pass, gom auth, start, follow-up, streaming audio va no-audio invariant.
- Live smoke test DeepSeek, AssemblyAI, Edge TTS va SenseVoice.
- Next.js lint va production build pass.
- Browser test desktop/mobile khong co overflow, console error hoac page error.
- E2E tao practice -> start -> answer -> adaptive follow-up -> finish -> result, sau do xoa du lieu test.
