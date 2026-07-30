import { withApiLogging } from "@/app/lib/ApiLogging";
import { NextRequest, NextResponse } from "next/server";

import { aiBackend } from "@/app/lib/AiBackend";
import { authorizeRequest } from "@/app/lib/Auth";
import connectDB from "@/app/lib/ConnectDB";
import { getDeepSeekProviderConfig } from "@/app/lib/DeepSeekUsage";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitResponse,
} from "@/app/lib/ServerSecurity";

export const dynamic = "force-dynamic";

async function GETHandler(request: NextRequest) {
  try {
    const authorization = await authorizeRequest(request, ["admin"]);
    if (!authorization.authorized) {
      return NextResponse.json(
        { success: false, message: authorization.message },
        { status: authorization.status }
      );
    }
    await connectDB();
    await enforceRateLimit(
      "admin:deepseek-balance",
      authorization.principal.payload.userId,
      60,
      10 * 60 * 1000
    );

    const [healthResult, balanceResult, config] = await Promise.all([
      aiBackend.health().then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const })
      ),
      aiBackend.getDeepSeekBalance().then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const })
      ),
      getDeepSeekProviderConfig(),
    ]);

    const usdBalance =
      balanceResult.ok
        ? balanceResult.value.balances.find(
            (item) => item.currency === "USD"
          )
        : undefined;
    const totalUsd = Number(usdBalance?.totalBalance || "0");
    return NextResponse.json({
      success: true,
      service: {
        reachable: healthResult.ok,
        transport: healthResult.ok ? healthResult.value.transport : "grpc",
        deepseekConfigured:
          healthResult.ok && healthResult.value.deepseekConfigured,
        ragReady: healthResult.ok && healthResult.value.ragReady,
      },
      provider: balanceResult.ok
        ? {
            reachable: true,
            isAvailable: balanceResult.value.isAvailable,
            balances: balanceResult.value.balances,
            fastModel: balanceResult.value.fastModel,
            evalModel: balanceResult.value.evalModel,
            checkedAt: balanceResult.value.checkedAt,
            lowBalance:
              Boolean(usdBalance) &&
              Number.isFinite(totalUsd) &&
              totalUsd <= config.lowBalanceThresholdUsd,
          }
        : {
            reachable: false,
            isAvailable: false,
            balances: [],
            fastModel: "",
            evalModel: "",
            checkedAt: new Date().toISOString(),
            lowBalance: false,
          },
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, message: "Bạn kiểm tra số dư quá nhanh" },
        rateLimitResponse(error)
      );
    }
    console.error("GET /api/admin/ai/balance error:", error);
    return NextResponse.json(
      { success: false, message: "Không thể kiểm tra DeepSeek" },
      { status: 500 }
    );
  }
}

export const GET = withApiLogging(GETHandler);
