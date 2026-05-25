"use client";

import React, { useState } from "react";
import { useAuthContext } from "@/app/contexts/AuthContext";
import { Button } from "@/app/components/ui/button";
import { User, Letter, Lock } from "@solar-icons/react";
import { UsernameDialog, EmailDialog, PasswordDialog } from "@/app/components/common/Dialog";
import { useLanguage } from "@/app/hooks/useLanguage";

export default function AccountSettingsPage() {
  const { user, refreshUser } = useAuthContext();
  const { t } = useLanguage();

  const [isUsernameOpen, setIsUsernameOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  return (
    <div className="space-y-8 w-full text-left">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("account.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("account.description")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Username Option */}
        <div className="flex items-center justify-between p-5 rounded-3xl border border-border/20 bg-card/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("account.username")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">@{user?.username}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-2xl cursor-pointer" onClick={() => setIsUsernameOpen(true)}>
            {t("common.change")}
          </Button>
        </div>

        {/* Email Option */}
        <div className="flex items-center justify-between p-5 rounded-3xl border border-border/20 bg-card/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-400">
              <Letter className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("account.email")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl cursor-pointer"
            onClick={() => setIsEmailOpen(true)}
          >
            {t("common.change")}
          </Button>
        </div>

        {/* Password Option */}
        <div className="flex items-center justify-between p-5 rounded-3xl border border-border/20 bg-card/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("account.password")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("account.passwordDesc")}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-2xl cursor-pointer" onClick={() => setIsPasswordOpen(true)}>
            {t("common.change")}
          </Button>
        </div>
      </div>

      <UsernameDialog
        isOpen={isUsernameOpen}
        onOpenChange={setIsUsernameOpen}
        currentUser={user}
        refreshUser={refreshUser}
      />

      <EmailDialog
        isOpen={isEmailOpen}
        onOpenChange={setIsEmailOpen}
        currentUser={user}
        refreshUser={refreshUser}
      />

      <PasswordDialog
        isOpen={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
      />
    </div>
  );
}
