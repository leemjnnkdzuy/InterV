"use client";

import React from "react";
import { Card } from "@/app/components/ui/card";
import { History, CpuBolt } from "@solar-icons/react";

interface UsedCreditPageProps {
  setActiveTab: (tab: string) => void;
}

export default function UsedCreditPage({ setActiveTab }: UsedCreditPageProps) {
  // Mock usage data
  const usageHistory = [
    {
      id: "USG-4821",
      type: "AI Interview (Nâng cao)",
      target: "Front-End Developer",
      date: "26/05/2026 14:30",
      amount: "-30.000 đ",
      status: "success",
    },
    {
      id: "USG-3910",
      type: "AI Interview (Nâng cao)",
      target: "Product Manager",
      date: "20/05/2026 09:15",
      amount: "-30.000 đ",
      status: "success",
    },
    {
      id: "USG-2831",
      type: "Đánh giá & Gợi ý chuyên sâu",
      target: "Cải thiện kỹ năng giao tiếp",
      date: "18/05/2026 16:45",
      amount: "-20.000 đ",
      status: "success",
    },
    {
      id: "USG-1784",
      type: "AI Interview (Cơ bản)",
      target: "Back-End Developer",
      date: "15/05/2026 11:00",
      amount: "-10.000 đ",
      status: "success",
    },
    {
      id: "USG-0921",
      type: "Hoàn trả chi phí sự cố",
      target: "Phỏng vấn AI System Architect",
      date: "10/05/2026 10:20",
      amount: "+30.000 đ",
      status: "refunded",
    },
  ];

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">Lịch sử sử dụng</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Theo dõi lịch sử tiêu dùng tài khoản cho các buổi phỏng vấn AI và đánh giá năng lực.
        </p>
      </div>

      <Card className="border border-border/20 bg-card/25 backdrop-blur-md rounded-4xl overflow-hidden shadow-lg p-1.5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border/10 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Mã giao dịch</th>
                <th className="px-6 py-4">Loại dịch vụ</th>
                <th className="px-6 py-4">Chi tiết phỏng vấn</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4 text-right">Chi phí</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-medium">
              {usageHistory.map((item) => (
                <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4.5 font-mono text-xs text-muted-foreground">
                    {item.id}
                  </td>
                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-2">
                      <CpuBolt className="w-4 h-4 text-primary shrink-0" />
                      <span>{item.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4.5 text-muted-foreground">
                    {item.target}
                  </td>
                  <td className="px-6 py-4.5 text-xs text-muted-foreground">
                    {item.date}
                  </td>
                  <td className={`px-6 py-4.5 text-right font-bold ${
                    item.amount.startsWith("+") ? "text-green-500" : "text-foreground"
                  }`}>
                    {item.amount}
                  </td>
                  <td className="px-6 py-4.5 text-center">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      item.status === "success"
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                        : "bg-blue-500/10 text-blue-500 border border-blue-500/10"
                    }`}>
                      {item.status === "success" ? "Thành công" : "Đã hoàn tiền"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
