import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/ConnectDB";
import User from "@/app/models/User";
import Transaction from "@/app/models/Transaction";
import { verifyAccessToken } from "@/app/lib/Auth";
import payos from "@/app/lib/PayOS";

const RECHARGE_PACKAGES = [
  { amount: 10000, credit: 100, bonus: 0 },
  { amount: 20000, credit: 200, bonus: 10 },
  { amount: 50000, credit: 500, bonus: 40 },
  { amount: 100000, credit: 1000, bonus: 100 },
  { amount: 200000, credit: 2000, bonus: 250 },
  { amount: 500000, credit: 5000, bonus: 750 },
];

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy access token" },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Access token không hợp lệ hoặc đã hết hạn" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number") {
      return NextResponse.json(
        { success: false, message: "Số tiền nạp không hợp lệ" },
        { status: 400 }
      );
    }

    const matchedPkg = RECHARGE_PACKAGES.find((pkg) => pkg.amount === amount);
    if (!matchedPkg) {
      return NextResponse.json(
        { success: false, message: "Gói nạp không tồn tại" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const orderCode = Date.now();
    const totalCredits = matchedPkg.credit + matchedPkg.bonus;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/credit?status=success&orderCode=${orderCode}`;
    const cancelUrl = `${appUrl}/credit?status=cancel`;

    let paymentUrl = "";
    let paymentLinkId = "";
    let isMock = false;

    if (
      !process.env.PAYOS_CLIENT_ID ||
      process.env.PAYOS_CLIENT_ID === "MOCK_CLIENT_ID" ||
      process.env.PAYOS_CLIENT_ID.startsWith("MOCK_")
    ) {
      isMock = true;
    }

    if (!isMock) {
      try {
        const paymentLinkData = await payos.paymentRequests.create({
          orderCode,
          amount,
          description: `NAP ${totalCredits} CREDIT`,
          cancelUrl,
          returnUrl,
        });

        paymentUrl = paymentLinkData.checkoutUrl;
        paymentLinkId = paymentLinkData.paymentLinkId;
      } catch (payosError: any) {
        console.warn("PayOS API error, falling back to mock payment:", payosError.message || payosError);
        isMock = true;
      }
    }

    if (isMock) {
      paymentUrl = `${returnUrl}&mock=true`;
      paymentLinkId = `MOCK_LINK_${orderCode}`;
    }

    await Transaction.create({
      userId: user._id,
      orderCode,
      amount,
      credits: totalCredits,
      status: "PENDING",
      paymentLinkId,
      paymentUrl,
    });

    return NextResponse.json({
      success: true,
      paymentUrl,
      orderCode,
    });
  } catch (error: any) {
    console.error("POST /api/payment/create error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi tạo link thanh toán. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
