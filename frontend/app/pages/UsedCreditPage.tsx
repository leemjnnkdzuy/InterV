"use client";

import React from "react";
import { Card } from "@/app/components/ui/card";
import { History, CpuBolt } from "@solar-icons/react";

interface UsedCreditPageProps {
  setActiveTab: (tab: string) => void;
  creditLogs: any[];
  isLoading: boolean;
}

export default function UsedCreditPage({ setActiveTab, creditLogs, isLoading }: UsedCreditPageProps) {
  const usageLogs = creditLogs.filter((log) => log.credits < 0);

  const getActionName = (action: string) => {
    switch (action) {
      case "REGISTER_BONUS":
        return "Quà tặng đăng ký";
      case "RECHARGE":
        return "Nạp Credits";
      case "AI_INTERVIEW":
        return "Phỏng vấn AI";
      case "ADMIN_ADJUST":
        return "Điều chỉnh bởi Admin";
      default:
        return action;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

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
                <th className="px-6 py-4">Chi tiết giao dịch</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4 text-right">Biến động</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                    Đang tải lịch sử sử dụng...
                  </td>
                </tr>
              ) : usageLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                    Chưa có giao dịch sử dụng nào.
                  </td>
                </tr>
              ) : (
                usageLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4.5 font-mono text-xs text-muted-foreground">
                      {item.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <CpuBolt className="w-4 h-4 text-primary shrink-0" />
                        <span>{getActionName(item.action)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-muted-foreground text-xs">
                      {item.description || "Không có chi tiết"}
                    </td>
                    <td className="px-6 py-4.5 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className={`px-6 py-4.5 text-right font-bold ${
                      item.credits > 0 ? "text-green-500" : "text-foreground"
                    }`}>
                      {item.credits > 0 ? `+${item.credits}` : item.credits} Credits
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                        Thành công
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
