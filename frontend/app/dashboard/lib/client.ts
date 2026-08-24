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

let isRefreshingDashboard = false;
let dashboardRefreshPromise: Promise<boolean> | null = null;

async function refreshDashboardToken(): Promise<boolean> {
  if (isRefreshingDashboard && dashboardRefreshPromise) {
    return dashboardRefreshPromise;
  }
  isRefreshingDashboard = true;
  dashboardRefreshPromise = fetch("/api/auth/refresh?soft=true", {
    method: "POST",
    credentials: "include",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return Boolean(data.success);
    })
    .catch(() => false)
    .finally(() => {
      isRefreshingDashboard = false;
      dashboardRefreshPromise = null;
    });

  return dashboardRefreshPromise;
}

export async function dashboardRequest<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const doFetch = () =>
    fetch(url, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        "X-Requested-With": "XMLHttpRequest",
        ...init?.headers,
      },
    });

  let response = await doFetch();
  let payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  // If 401 (access token expired), try refreshing token once before giving up
  if (response.status === 401) {
    const refreshed = await refreshDashboardToken();
    if (refreshed) {
      response = await doFetch();
      payload = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
    }
  }

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
