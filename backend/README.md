# InterV AI Backend

FastAPI service for AI-specific interview work on port `3001`.

## Setup

Start optional infrastructure:

```powershell
docker compose up -d redis kafka
```

Create and run the backend:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 3001
```

Copy `.env.example` to `.env` and set `DEEPSEEK_API_KEY` for real AI generation/evaluation. Without a key, the API still returns deterministic fallback questions and scoring so the frontend flow remains testable.

## Runtime responsibilities

- DeepSeek: generate interview questions and evaluate candidate answers.
- MarkItDown: extract and normalize uploaded JD documents.
- Edge TTS: list voices and generate question audio previews.
- faster-whisper: transcribe recorded candidate answers when the local model is available.
- Redis: cache voice lists, TTS audio, and other repeated AI responses.
- Kafka: publish interview lifecycle events for audit/analytics extensions.

The service has deterministic fallbacks when optional external dependencies are unavailable:

- Missing `DEEPSEEK_API_KEY`: generated questions and evaluation use local structured fallback.
- Redis/Kafka unavailable: service still runs with in-memory cache and no-op event publishing.
- Whisper model unavailable: transcription endpoint returns a clear fallback response.
