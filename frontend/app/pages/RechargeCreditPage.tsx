"use client";

import React, { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { WalletMoney, Copy, CheckCircle } from "@solar-icons/react";

interface RechargeCreditPageProps {
  setActiveTab: (tab: string) => void;
}

export default function RechargeCreditPage({ setActiveTab }: RechargeCreditPageProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);

  const bankDetails = {
    bankName: "MB Bank (Ngân hàng Quân đội)",
    accountNumber: "999988887777",
    accountName: "CONG TY CO PHAN INTERV VIET NAM",
    transferContent: "INTERV 58310", // Mock code unique to the user
  };

  const rechargeHistory = [
    {
      id: "REC-7921",
      method: "Chuyển khoản QR",
      date: "26/05/2026 10:15",
      amount: "50.000 đ",
      status: "completed",
    },
    {
      id: "REC-5412",
      method: "Chuyển khoản Ngân hàng",
      date: "12/05/2026 15:40",
      amount: "100.000 đ",
      status: "completed",
    },
    {
      id: "REC-2104",
      method: "Chuyển khoản QR",
      date: "05/05/2026 18:22",
      amount: "100.000 đ",
      status: "completed",
    },
  ];

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`Đã sao chép ${fieldName}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getQRUrl = () => {
    // Generates a mock VietQR URL for MB Bank
    return `https://api.vietqr.io/image/970422-${bankDetails.accountNumber}-qr_only.jpg?amount=${selectedAmount}&addInfo=${bankDetails.transferContent}`;
  };

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">Nạp tiền & Lịch sử nạp</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Nạp tiền vào ví qua chuyển khoản ngân hàng hoặc quét mã VietQR để tiếp tục luyện phỏng vấn AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Recharge Instructions */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border border-border/20 bg-card/25 backdrop-blur-md rounded-4xl p-6 space-y-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <WalletMoney className="w-5 h-5 text-primary" />
              Thông tin chuyển khoản ngân hàng
            </h3>

            {/* Quick Packages */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold">Chọn gói nạp nhanh:</p>
              <div className="grid grid-cols-4 gap-2">
                {[50000, 100000, 200000, 500000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      selectedAmount === amount
                        ? "bg-primary text-background border-primary shadow-sm"
                        : "bg-muted/15 border-border/10 text-muted-foreground hover:bg-muted/25"
                    }`}
                  >
                    {amount.toLocaleString("vi-VN")}đ
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {/* Bank Name */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/10">
                <span className="text-xs text-muted-foreground">Ngân hàng</span>
                <span className="text-sm font-semibold mt-1 sm:mt-0">{bankDetails.bankName}</span>
              </div>

              {/* Account Number */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/10">
                <span className="text-xs text-muted-foreground">Số tài khoản</span>
                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                  <span className="text-sm font-mono font-bold text-primary">{bankDetails.accountNumber}</span>
                  <button
                    onClick={() => handleCopy(bankDetails.accountNumber, "Số tài khoản")}
                    className="p-1.5 hover:bg-muted/30 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Account Owner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/10">
                <span className="text-xs text-muted-foreground">Tên người nhận</span>
                <span className="text-sm font-semibold uppercase mt-1 sm:mt-0">{bankDetails.accountName}</span>
              </div>

              {/* Transfer Content */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border/10">
                <span className="text-xs text-muted-foreground">Nội dung chuyển khoản</span>
                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                  <span className="text-sm font-mono font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-lg border border-orange-500/20">{bankDetails.transferContent}</span>
                  <button
                    onClick={() => handleCopy(bankDetails.transferContent, "Nội dung")}
                    className="p-1.5 hover:bg-muted/30 rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/10 border border-border/10 rounded-2xl p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-foreground">Lưu ý khi nạp:</p>
                <p className="mt-1 leading-relaxed">
                  Vui lòng chuyển khoản chính xác <strong>Số tài khoản</strong> và <strong>Nội dung</strong> ở trên. Hệ thống tự động cộng số dư vào ví trong vòng 1-3 phút kể từ khi nhận được tiền giao dịch.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: QR Code scan details */}
        <div className="lg:col-span-5 flex flex-col justify-center items-center">
          <Card className="border border-border/20 bg-card/25 backdrop-blur-md rounded-4xl p-6 flex flex-col items-center justify-center w-full text-center space-y-4">
            <p className="text-xs text-muted-foreground font-semibold">
              Quét mã để nạp nhanh <span className="text-primary font-bold">{selectedAmount.toLocaleString("vi-VN")} đ</span>
            </p>
            
            {/* QR Wrapper box with scanline animation style */}
            <div className="relative p-4 rounded-3xl bg-white border border-border/10 shadow-inner flex items-center justify-center w-52 h-52">
              <img
                src={getQRUrl()}
                alt="VietQR MBBank"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // If VietQR api has issues, show a nice styled backup SVG
                  e.currentTarget.style.display = "none";
                  const container = e.currentTarget.parentElement;
                  if (container) {
                    const fallback = document.createElement("div");
                    fallback.className = "flex flex-col items-center justify-center text-muted-foreground text-xs p-4 w-full h-full";
                    fallback.innerHTML = `
                      <svg class="w-16 h-16 text-muted-foreground/35 mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v1m0 11v1m5-5h1m-11 0h1m2.5-6h5A2.5 2.5 0 0119 8.5v5a2.5 2.5 0 01-2.5 2.5h-5A2.5 2.5 0 019 13.5v-5A2.5 2.5 0 0111.5 6z"></path></svg>
                      <span>Mã QR Chuyển khoản</span>
                    `;
                    container.appendChild(fallback);
                  }
                }}
              />
            </div>
            
            <p className="text-[10px] text-muted-foreground">
              Mã QR chứa sẵn thông tin chuyển khoản và số tiền đã chọn.
            </p>
          </Card>
        </div>
      </div>

      {/* Recharge History Table */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">Lịch sử giao dịch nạp</h3>
        <Card className="border border-border/20 bg-card/25 backdrop-blur-md rounded-4xl overflow-hidden shadow-lg p-1.5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/10 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Mã giao dịch</th>
                  <th className="px-6 py-4">Hình thức</th>
                  <th className="px-6 py-4">Thời gian nạp</th>
                  <th className="px-6 py-4 text-right">Số tiền</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 font-medium">
                {rechargeHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{item.id}</td>
                    <td className="px-6 py-4 text-foreground">{item.method}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{item.date}</td>
                    <td className="px-6 py-4 text-right font-bold text-green-500">+{item.amount}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                        Thành công
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
