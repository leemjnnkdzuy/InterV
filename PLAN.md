# InterV AI Interview Implementation Plan

## 1. Tong quan

Base hien tai da co Next.js frontend, API routes cho user/payment/practice, MongoDB models va UI practice. Muc tieu tiep theo la thay cac mock AI hien tai bang pipeline that:

- `frontend/` tiep tuc xu ly nguoi dung, auth, payment, practice CRUD, credit ledger va UI/UX.
- `backend/` tao service AI rieng chay cong `3001`.
- Cac tac vu AI gom trich xuat JD, sinh cau hoi, TTS, STT, cham diem va danh gia ung vien se di qua backend.
- DeepSeek la AI chinh cho sinh bo cau hoi, follow-up va danh gia.
- MarkItDown xu ly file JD upload.
- Edge TTS xu ly doc cau hoi va nghe thu giong.
- Faster Whisper xu ly nghe/noi sang text o backend.
- Redis dung cho cache, rate limit, job state va idempotency.
- Kafka dung cho event-driven flow de phu hop do an tot nghiep va de tach cac tac vu AI bat dong bo.

## 2. Kien truc dich vu

### Frontend Next.js

Frontend giu cac nhom API hien co:

- Auth/session/user profile.
- Practice CRUD.
- Payment PayOS.
- Credit history va credit balance.

Them cac API facade de frontend khong goi truc tiep AI backend:

- `POST /api/ai/jd/extract`
- `GET /api/ai/voices?language=vi-VN`
- `POST /api/ai/tts/preview`
- `POST /api/practice/[id]/quote`
- `POST /api/practice/[id]/start`
- `POST /api/ai/interview/[runId]/transcribe`
- `POST /api/ai/interview/[runId]/answer`
- `POST /api/ai/interview/[runId]/finish`

Facade se:

- Kiem tra auth bang cookie/token hien co.
- Validate payload.
- Re-compute credit/quote server-side.
- Goi backend `3001` bang internal secret.
- Khong expose DeepSeek key, backend key hoac internal endpoint cho browser.

### Backend AI service

Tao backend Python FastAPI trong `backend/`, chay cong `3001`, vi cac thu vien can dung phu hop Python:

- `markitdown[all]` cho document-to-markdown.
- `edge-tts` cho TTS.
- `faster-whisper` cho STT.
- `openai` SDK voi `base_url=https://api.deepseek.com` cho DeepSeek.
- `pydantic` cho schema validation.
- `redis` cho cache/job state/rate limit.
- `confluent-kafka` hoac `aiokafka` cho Kafka.

Backend endpoints noi bo:

- `POST /internal/jd/extract`
- `GET /internal/voices`
- `POST /internal/tts/preview`
- `POST /internal/interview/start`
- `POST /internal/interview/transcribe`
- `POST /internal/interview/answer`
- `POST /internal/interview/evaluate`

Moi endpoint noi bo yeu cau header:

- `X-Internal-Api-Key: <AI_BACKEND_INTERNAL_KEY>`

## 3. JD extraction bang MarkItDown

Trong `SetupPhase.tsx`, upload JD hien tai dang mock. Can thay bang flow that:

1. User upload `.pdf`, `.docx`, `.txt`, toi da 5MB.
2. Frontend gui file qua `POST /api/ai/jd/extract`.
3. Next.js facade verify auth va forward file sang backend `3001`.
4. Backend luu file vao temp directory ngan han, scan MIME/extension, goi MarkItDown.
5. Backend tra ve:

```ts
{
  success: true,
  markdown: string,
  normalized: {
    title?: string;
    company?: string;
    responsibilities: string[];
    requirements: string[];
    skills: string[];
    seniority?: string;
    language?: string;
  }
}
```

Sau khi nhan ket qua:

- `jobDescription` trong frontend duoc set bang Markdown da trich xuat.
- User co the sua lai JD truoc khi bat dau.
- Neu MarkItDown loi, fallback cho phep user paste manual text.

Security:

- Khong cho duong dan file tu user di thang vao MarkItDown.
- Chi dung file temp server tao.
- Xoa temp file sau khi convert.
- Limit kich thuoc va timeout.

Nguon: https://pypi.org/project/markitdown/

## 4. Ngon ngu phong van va giong doc

Thay muc "Phong van vien AI" hien tai trong `SetupPhase.tsx` bang 2 cau hinh:

- Ngon ngu phong van.
- Giong doc theo ngon ngu.

Ngon ngu v1:

- `vi-VN`
- `en-US`
- `zh-CN`

Ly do: khop voi i18n hien co `vi`, `en`, `zh`.

Voice flow:

1. Khi user chon ngon ngu, frontend goi `GET /api/ai/voices?language=<language>`.
2. Backend dung `edge-tts --list-voices` hoac Python API de lay danh sach voice.
3. Loc voice theo locale.
4. Hien thi voice name, gender, style/personality neu co.
5. Nut nghe thu goi `POST /api/ai/tts/preview`.
6. Backend generate MP3 bang Edge TTS va cache Redis theo hash `language + voiceId + sampleText`.

Payload voice:

```ts
interface InterviewVoice {
  id: string;
  name: string;
  locale: string;
  gender?: "Male" | "Female";
  description?: string;
}
```

Setup UI can hien:

- Select ngon ngu.
- Select giong doc.
- Nut play nghe thu.
- Loading state khi dang generate audio.
- Error state neu TTS service loi.

Nguon: https://pypi.org/project/edge-tts/

## 5. STT: nghe cau tra loi

Khong nen dua vao Web Speech API lam nguon chinh, vi MDN ghi `SpeechRecognition` van limited availability va tren mot so browser co the gui audio len service cua browser.

Huong v1:

- Frontend record audio bang MediaRecorder.
- Gui audio chunk/file sang backend qua `/api/ai/interview/[runId]/transcribe`.
- Backend dung `faster-whisper` de transcribe theo ngon ngu user da chon.
- Frontend hien transcript cho user sua truoc khi submit cau tra loi.

Ly do chon:

- Chat luong on dinh hon cross-browser.
- Phu hop multi-language.
- Backend kiem soat duoc pipeline danh gia.
- Co the log confidence/segments/decode time cho bao cao.

Fallback:

- Neu STT loi, user van co the nhap bang ban phim.

Nguon:

- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://github.com/SYSTRAN/faster-whisper

## 6. DeepSeek cho sinh cau hoi va danh gia

Dung DeepSeek API chinh thuc:

- Base URL: `https://api.deepseek.com`
- Model nhanh: `deepseek-v4-flash`
- Model danh gia chinh xac hon: `deepseek-v4-pro`

Phan viec:

- Sinh cau hoi: `deepseek-v4-flash`, non-thinking hoac thinking low/high tuy latency.
- Follow-up ngan giua phong van: `deepseek-v4-flash`.
- Danh gia cuoi: `deepseek-v4-pro`, thinking enabled, reasoning effort high.

Luu y API:

- Dung JSON Output voi `response_format: { "type": "json_object" }`.
- Prompt phai co chu "json" va co vi du shape output.
- Backend phai validate JSON bang Pydantic/Zod.
- Neu response rong/JSON loi, retry 1 lan voi prompt ngan hon.

Question generation output:

```ts
interface GeneratedQuestionSet {
  questions: Array<{
    id: string;
    text: string;
    competency: string;
    difficulty: string;
    expectedSignals: string[];
  }>;
}
```

Evaluation output:

```ts
interface InterviewEvaluation {
  score: number;
  ratings: {
    communication: number;
    knowledge: number;
    problemSolving: number;
    confidence: number;
    jdFit: number;
  };
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  questions: Array<{
    question: string;
    answer: string;
    score: number;
    feedback: string;
    evidence: string[];
  }>;
}
```

Nguon:

- https://api-docs.deepseek.com/quick_start/pricing
- https://api-docs.deepseek.com/guides/json_mode/
- https://api-docs.deepseek.com/guides/thinking_mode

## 7. Tinh tien va tru credit truoc khi luyen tap

Yeu cau chinh: tinh tien ngay trong `SetupPhase.tsx`, hien chi phi truoc khi luyen tap va tru credit truoc khi vao man interview.

### Ty gia noi bo

Theo `RECHARGE_PACKAGES` hien co:

- `10.000 VND = 100 credits`
- Suy ra `1 credit = 100 VND`

Bonus khi nap tien chi tang credit nhan duoc, khong lam doi don vi tieu dung.

### Pricing v1 de UX de hieu

Dung gia co dinh theo so cau hoi:

```ts
questionCost = duration * 10;
jdUploadCost = hasUploadedJdFile ? 10 : 0;
totalCredits = questionCost + jdUploadCost;
vndEquivalent = totalCredits * 100;
```

Vi du:

- 3 cau, paste JD: `30 credits = 3.000 VND`
- 5 cau, upload JD: `60 credits = 6.000 VND`
- 25 cau, upload JD: `260 credits = 26.000 VND`

Ly do dung fixed price v1:

- User thay gia ro truoc khi bam bat dau.
- Tranh tinh trang token AI dao dong lam UX kho hieu.
- Token usage DeepSeek van duoc log noi bo de toi uu pricing sau.

### Hien thi trong SetupPhase

Them card/khoi gan CTA "Bat dau luyen tap":

- So du hien tai: `user.credits`.
- Chi phi du kien: `totalCredits`.
- Gia tri VND: `vndEquivalent`.
- So du sau khi tru: `user.credits - totalCredits`.
- Breakdown:
  - `Bo cau hoi AI: duration * 10 credits`
  - `Xu ly JD upload: 10 credits` neu co file upload
- Neu khong du credit:
  - Disable CTA.
  - Hien: `Ban thieu X credits`.
  - Them nut sang `/credit`.

CTA text:

- Du credit: `Tru X Credits & Bat dau luyen tap`
- Khong du credit: `Khong du Credits`

### API quote

Them route:

- `POST /api/practice/[id]/quote`

Payload:

```ts
{
  difficulty: string;
  duration: number;
  language: string;
  voiceId: string;
  hasUploadedJdFile: boolean;
}
```

Response:

```ts
{
  success: true,
  quote: {
    totalCredits: number;
    vndEquivalent: number;
    balanceCredits: number;
    remainingCredits: number;
    canAfford: boolean;
    breakdown: Array<{ label: string; credits: number }>;
  }
}
```

Frontend co the tinh optimistic local quote de UI muot, nhung khi bam start bat buoc goi server start de re-compute.

### API start va tru tien

Them route:

- `POST /api/practice/[id]/start`

Route nay:

1. Verify auth.
2. Validate practice thuoc user.
3. Re-compute `totalCredits` server-side, khong tin client.
4. Atomic tru credit:

```ts
User.findOneAndUpdate(
  { _id: userId, credits: { $gte: totalCredits } },
  { $inc: { credits: -totalCredits } },
  { new: true }
)
```

5. Tao `CreditLog` action `AI_INTERVIEW`.
6. Goi backend `3001` de sinh cau hoi.
7. Neu backend AI loi truoc khi tao run thanh cong, refund credit va tao log `AI_INTERVIEW_REFUND`.
8. Neu thanh cong, tra ve `runId`, `questions`, `quote`, `remainingCredits`.

Start response:

```ts
{
  success: true,
  runId: string;
  questions: Array<{
    id: string;
    text: string;
    competency: string;
  }>;
  quote: {
    totalCredits: number;
    remainingCredits: number;
  };
}
```

Sau khi start thanh cong:

- Frontend goi `refreshUser()` de cap nhat so du.
- `PracticePage` set `questionsList` tu API response.
- Chuyen sang `activePhase = "interview"`.

### Chong tru tien 2 lan

Can co idempotency:

- Frontend tao `idempotencyKey` khi bam start.
- Server luu idempotency key vao Redis hoac collection `PracticeRun`.
- Double click hoac retry cung key thi tra ve ket qua cu, khong tru tien lan 2.

## 8. Data model can bo sung

### PracticeSession

Them cac field cau hinh:

```ts
language?: string;
voiceId?: string;
difficulty?: string;
questionCount?: number;
```

### PracticeRun

Tao model moi de luu tung lan luyen tap:

```ts
interface PracticeRun {
  userId: ObjectId;
  sessionId: ObjectId;
  status: "STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "REFUNDED";
  language: string;
  voiceId: string;
  difficulty: string;
  questionCount: number;
  questions: Array<{
    id: string;
    text: string;
    competency: string;
    difficulty?: string;
  }>;
  answers: Array<{
    questionId: string;
    transcript: string;
    editedAnswer?: string;
    audioDurationSec?: number;
  }>;
  evaluation?: InterviewEvaluation;
  creditUsage: {
    quotedCredits: number;
    chargedCredits: number;
    refundedCredits: number;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  };
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### CreditLog

Mo rong action:

```ts
type CreditLogAction =
  | "RECHARGE"
  | "AI_INTERVIEW"
  | "AI_INTERVIEW_REFUND"
  | "AI_JD_EXTRACT"
  | "REGISTER_BONUS"
  | "ADMIN_ADJUST";
```

Them optional fields:

```ts
referenceId?: string;
metadata?: Record<string, unknown>;
```

## 9. Redis va Kafka

### Redis

Dung cho:

- TTS preview cache.
- Voice list cache theo language.
- Job progress.
- Rate limit per user.
- Idempotency key khi start interview.
- Short-lived interview token.

Key examples:

- `voice:list:vi-VN`
- `tts:preview:<hash>`
- `interview:start:idempotency:<userId>:<key>`
- `rate:user:<userId>:ai`

### Kafka

Topics de demo va tach system:

- `ai.job.requested`
- `ai.job.completed`
- `interview.event`
- `credit.ledger.updated`
- `notification.event`

Events quan trong:

- `INTERVIEW_STARTED`
- `QUESTION_GENERATED`
- `ANSWER_TRANSCRIBED`
- `INTERVIEW_EVALUATED`
- `CREDIT_CHARGED`
- `CREDIT_REFUNDED`

V1 co the produce events sau khi DB transaction thanh cong. Consumer ban dau co the chi log/monitor, sau do mo rong gui notification hoac analytics.

## 10. UX flow hoan chinh

1. User vao practice setup.
2. Nhap title, industry, JD, topic.
3. Chon difficulty va so cau.
4. Chon ngon ngu phong van.
5. Chon voice va nghe thu.
6. SetupPhase hien chi phi va so du sau khi tru.
7. User bam `Tru X Credits & Bat dau luyen tap`.
8. Frontend disable CTA, hien loading `Dang tru credits va khoi tao phong van...`.
9. API start tru credit truoc.
10. Backend sinh cau hoi.
11. Neu thanh cong, vao interview.
12. Neu loi, refund va bao user.
13. Sau phong van, backend cham diem, frontend luu ket qua va hien drawer.

## 11. Test plan

### Unit tests

- Tinh quote dung voi duration `3, 5, 7, 12, 16, 20, 25`.
- `hasUploadedJdFile` cong dung 10 credits.
- `canAfford` dung khi balance du/thieu.
- Atomic credit deduct khong cho balance am.
- Double start voi cung idempotency key khong tru 2 lan.
- Refund dung khi backend loi.

### Integration tests

- Upload PDF/DOCX/TXT -> MarkItDown -> jobDescription duoc fill.
- Lay voice list theo `vi-VN`, `en-US`, `zh-CN`.
- TTS preview co cache.
- Start interview du credit -> tru credit -> tao log -> tra questions.
- Start interview thieu credit -> 402/400 va khong goi backend AI.
- DeepSeek JSON loi -> retry -> validate/fail ro rang.

### E2E tests

- User tao practice, upload JD, chon ngon ngu/giong, thay chi phi, bat dau, bi tru credit, tra loi, nhan report.
- User khong du credit thay nut nap tien va khong vao interview.
- User double click CTA chi bi tru mot lan.

## 12. Bien moi truong

Frontend/Next.js:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_BACKEND_URL=http://localhost:3001
AI_BACKEND_INTERNAL_KEY=...
AI_CREDIT_VND_RATE=100
```

Backend:

```env
PORT=3001
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
AI_BACKEND_INTERNAL_KEY=...
WHISPER_MODEL=small
```

## 13. Assumptions

- `backend/` hien chua co implementation dang ke, nen tao FastAPI moi la huong mac dinh.
- Frontend Next.js tiep tuc so huu MongoDB user/session/payment/credit.
- Backend AI khong ghi truc tiep vao credit balance; credit tru/refund nam o Next.js API de giu ledger tap trung.
- V1 tinh tien fixed theo cau hoi de UX ro rang; token DeepSeek chi log noi bo.
- DeepSeek model/pricing can kiem tra lai truoc khi deploy that vi nha cung cap co the doi gia.
