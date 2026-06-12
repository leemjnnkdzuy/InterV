const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:3001";
const AI_BACKEND_INTERNAL_KEY =
  process.env.AI_BACKEND_INTERNAL_KEY || "dev-internal-key";

export class AiBackendError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AiBackendError";
    this.status = status;
  }
}

export async function callAiBackend<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Internal-Api-Key", AI_BACKEND_INTERNAL_KEY);

  const response = await fetch(`${AI_BACKEND_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `AI backend request failed with ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.detail || payload.message || message;
    } catch {
      // Keep default message.
    }
    throw new AiBackendError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function getAiBackendUrl(path: string): string {
  return `${AI_BACKEND_URL}${path}`;
}

export function getAiBackendHeaders(): Headers {
  return new Headers({
    "X-Internal-Api-Key": AI_BACKEND_INTERNAL_KEY,
  });
}
