export class DashboardApiError extends Error {
  status: number;
  payload?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    payload?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DashboardApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function dashboardRequest<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      "X-Requested-With": "XMLHttpRequest",
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok || payload.success === false) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("session-revoked"));
    }
    throw new DashboardApiError(
      typeof payload.message === "string"
        ? payload.message
        : "Yêu cầu không thành công",
      response.status,
      payload
    );
  }
  return payload as T;
}
