import { NextResponse } from "next/server";

import { withApiLogging } from "@/app/lib/ApiLogging";

async function blockedHandler() {
  return NextResponse.json(
    { success: false, message: "Nguồn yêu cầu không hợp lệ" },
    { status: 403 }
  );
}

export const POST = withApiLogging(blockedHandler);
export const PUT = withApiLogging(blockedHandler);
export const PATCH = withApiLogging(blockedHandler);
export const DELETE = withApiLogging(blockedHandler);
