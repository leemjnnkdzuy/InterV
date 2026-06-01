"use client";

import { Card } from "@/app/components/ui/card";
import type { RechargeCreditPageProps } from "@/app/types";

export default function RechargeCreditPage({ transactions, isLoading }: RechargeCreditPageProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
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
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            Thành công
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-500 border border-amber-500/10">
            Chờ thanh toán
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-500/10 text-red-500 border border-red-500/10">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-muted/10 text-muted border border-muted/10">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">Nạp tiền & Lịch sử nạp</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Nạp tiền vào ví qua chuyển khoản ngân hàng hoặc cổng PayOS trực tuyến để tiếp tục luyện phỏng vấn AI.
        </p>
      </div>

      {/* Recharge History Table */}
      <div className="space-y-4">
        <Card className="border border-border/20 bg-card/25 backdrop-blur-md rounded-4xl overflow-hidden shadow-lg p-1.5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border/10 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Mã đơn hàng</th>
                  <th className="px-6 py-4">Hình thức</th>
                  <th className="px-6 py-4">Thời gian nạp</th>
                  <th className="px-6 py-4 text-right">Số tiền</th>
                  <th className="px-6 py-4 text-right">Credits nhận</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                      Đang tải lịch sử nạp tiền...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground font-medium">
                      Chưa có lịch sử nạp tiền nào.
                    </td>
                  </tr>
                ) : (
                  transactions.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        #{item.orderCode}
                      </td>
                      <td className="px-6 py-4 text-foreground">
                        {item.amount === 0 ? "Quà tặng hệ thống" : "Thanh toán PayOS"}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-foreground text-xs">
                        {item.amount === 0 ? "Miễn phí" : formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-500">
                        +{item.credits.toLocaleString("vi-VN")} Credits
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
