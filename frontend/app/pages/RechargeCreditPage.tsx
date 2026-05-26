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

      {/* Recharge History Table */}
      <div className="space-y-4">
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
