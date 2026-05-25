"use client";

import React, { useEffect, useState } from "react";
import { userService } from "@/app/services/UserService";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { toast } from "sonner";
import { Monitor, Smartphone, ShieldKeyhole, TrashBinMinimalistic } from "@solar-icons/react";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Spinner } from "@/app/components/ui/spinner";

interface SessionData {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export default function SecuritySettingsPage() {
  const { logout } = useAuthContext();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await userService.getSessions();
      if (res.success) {
        setSessions(res.sessions);
      } else {
        toast.error(res.message || "Không thể tải danh sách thiết bị");
      }
    } catch (err) {
      toast.error("Lỗi tải danh sách thiết bị");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const res = await userService.revokeSession(sessionId);
      if (res.success) {
        toast.success("Đã đăng xuất thiết bị thành công!");
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        toast.error(res.message || "Đăng xuất thiết bị thất bại");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi đăng xuất thiết bị");
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    if (!confirm("Bạn có chắc chắn muốn đăng xuất khỏi tất cả thiết bị (bao gồm thiết bị này)?")) {
      return;
    }
    try {
      setIsRevokingAll(true);
      const res = await userService.revokeAllSessions();
      if (res.success) {
        toast.success("Đã đăng xuất khỏi tất cả thiết bị!");
        await logout(); // logs out the current user session on client-side
      } else {
        toast.error(res.message || "Lỗi đăng xuất tất cả thiết bị");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi đăng xuất tất cả thiết bị");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const info = deviceInfo.toLowerCase();
    if (info.includes("mobi") || info.includes("android") || info.includes("iphone")) {
      return <Smartphone className="w-6 h-6 text-violet-400" />;
    }
    return <Monitor className="w-6 h-6 text-primary" />;
  };

  const formatDeviceName = (deviceInfo: string) => {
    if (deviceInfo.includes("Windows")) return "Windows PC";
    if (deviceInfo.includes("Macintosh")) return "macOS Device";
    if (deviceInfo.includes("iPhone")) return "iPhone";
    if (deviceInfo.includes("Android")) return "Android Phone";
    if (deviceInfo.includes("Linux")) return "Linux PC";
    return deviceInfo;
  };

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">Bảo mật tài khoản</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Quản lý các phiên đăng nhập đang hoạt động. Bạn chỉ được phép đăng nhập tối đa 2 thiết bị cùng lúc.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Thiết bị đang kết nối ({sessions.length}/2)</h3>
            {sessions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevokeAll}
                disabled={isRevokingAll}
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer"
              >
                Đăng xuất tất cả thiết bị
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-4 border bg-card/25 backdrop-blur-md rounded-3xl flex items-center justify-between transition-all ${
                  session.isCurrent ? "border-primary/30 shadow-[0_0_15px_rgba(187,244,81,0.05)]" : "border-border/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-muted/40">
                    {getDeviceIcon(session.deviceInfo)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatDeviceName(session.deviceInfo)}</span>
                      {session.isCurrent && (
                        <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold">
                          Thiết bị này
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      IP: {session.ipAddress || "Không rõ"} • Hoạt động:{" "}
                      {new Date(session.lastActiveAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                  >
                    <TrashBinMinimalistic className="w-5 h-5" />
                  </Button>
                )}
              </Card>
            ))}
          </div>

          <div className="p-4 rounded-3xl border border-border/10 bg-muted/10 flex items-start gap-3 mt-6">
            <ShieldKeyhole className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold">Khuyến cáo bảo mật</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Khi nhận thấy thiết bị lạ đăng nhập trái phép vào tài khoản của mình, hãy thực hiện Đăng xuất tất cả thiết bị
                và ngay lập tức tiến hành thay đổi mật khẩu của bạn để bảo vệ an toàn thông tin cá nhân.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
