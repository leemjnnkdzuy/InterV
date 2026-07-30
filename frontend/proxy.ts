import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = new Set([
  "/api/payment/webhook",
  "/api/security/csrf-blocked",
]);

function allowedOrigins(request: NextRequest): Set<string> {
  const values = new Set<string>();
  if (process.env.NODE_ENV !== "production") {
    values.add(request.nextUrl.origin);
    values.add("http://localhost:3000");
    values.add("http://127.0.0.1:3000");
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      values.add(new URL(configured).origin);
    } catch {
      // Startup validation in payment/config paths reports malformed values.
    }
  }
  return values;
}

function csrfAllowed(request: NextRequest): boolean {
  if (
    SAFE_METHODS.has(request.method) ||
    !request.nextUrl.pathname.startsWith("/api/") ||
    CSRF_EXEMPT_PATHS.has(request.nextUrl.pathname)
  ) {
    return true;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site" || fetchSite === "same-site") {
    return false;
  }
  if (fetchSite === "same-origin") {
    return true;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return allowedOrigins(request).has(origin);
  }
  return request.headers.get("x-requested-with") === "XMLHttpRequest";
}

function contentSecurityPolicy(nonce: string): string {
  const development = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      development ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "connect-src 'self' https://api.assemblyai.com wss://streaming.assemblyai.com" +
      (development
        ? " http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*"
        : ""),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    development ? "" : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}

function applySecurityHeaders(
  response: NextResponse,
  csp: string,
  isApi: boolean,
  requestId: string
) {
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=(self), usb=(), browsing-topics=()"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Origin-Agent-Cluster", "?1");
  response.headers.set("Vary", "Sec-Fetch-Site, Origin");
  if (isApi) {
    response.headers.set(
      "Cache-Control",
      "private, no-store, max-age=0, must-revalidate"
    );
  }
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(randomUUID()).toString("base64");
  const requestId = randomUUID();
  const csp = contentSecurityPolicy(nonce);
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-interv-original-path");
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-interv-request-id", requestId);
  requestHeaders.set("x-request-id", requestId);

  if (!csrfAllowed(request)) {
    requestHeaders.set(
      "x-interv-original-path",
      request.nextUrl.pathname.slice(0, 500)
    );
    const blockedUrl = request.nextUrl.clone();
    blockedUrl.pathname = "/api/security/csrf-blocked";
    blockedUrl.search = "";
    return applySecurityHeaders(
      NextResponse.rewrite(blockedUrl, {
        request: { headers: requestHeaders },
      }),
      csp,
      isApi,
      requestId
    );
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return applySecurityHeaders(response, csp, isApi, requestId);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
