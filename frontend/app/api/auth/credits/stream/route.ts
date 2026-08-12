import { NextRequest, NextResponse } from "next/server";

import { authenticatePrincipal } from "@/app/lib/Auth";
import {
  subscribeCreditUpdated,
  type CreditUpdatedEvent,
} from "@/app/lib/CreditEvents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeEvent(event: CreditUpdatedEvent): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `event: credit.updated\ndata: ${JSON.stringify(event)}\n\n`
  );
}

export async function GET(request: NextRequest) {
  const principal = await authenticatePrincipal(request);
  if (!principal) {
    return NextResponse.json(
      { success: false, message: "Phiên đăng nhập không hợp lệ" },
      { status: 401 }
    );
  }

  const userId = principal.user._id.toString();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const heartbeat = setInterval(() => {
        if (!closed) {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        }
      }, 25_000);

      const cleanup = subscribeCreditUpdated(userId, (event) => {
        if (!closed) {
          controller.enqueue(encodeEvent(event));
        }
      });

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        cleanup();
      };

      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel() {
      // The request abort handler performs listener and heartbeat cleanup.
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
