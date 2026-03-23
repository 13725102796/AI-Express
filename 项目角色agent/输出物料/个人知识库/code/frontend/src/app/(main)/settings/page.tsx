"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PasswordModal } from "@/components/settings/PasswordModal";
import { UsageBars } from "@/components/settings/UsageBars";
import { DangerZone } from "@/components/settings/DangerZone";
import { ImportExport } from "@/components/settings/ImportExport";
import { fetchSettings, type UserSettings } from "@/services/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="p-4 md:p-6 max-w-2xl space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-bg-sec rounded-[var(--radius-card)] animate-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-text-main mb-6">设置</h1>

      <div className="space-y-4">
        {/* Profile */}
        <ProfileSection name={settings.name} email={settings.email} />

        {/* Password */}
        <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-main">密码</h3>
              <p className="text-xs text-text-tert mt-0.5">修改登录密码</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setPasswordOpen(true)}>
              修改密码
            </Button>
          </div>
        </div>

        {/* Spaces shortcut */}
        <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-main">知识空间管理</h3>
              <p className="text-xs text-text-tert mt-0.5">创建和管理你的知识空间</p>
            </div>
            <Link href="/settings/spaces">
              <Button variant="secondary" size="sm">管理</Button>
            </Link>
          </div>
        </div>

        {/* Usage */}
        <UsageBars usage={settings.usage} />

        {/* Plan */}
        <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-main">
                当前套餐：
                <span className="text-primary ml-1">
                  {settings.plan === "free" ? "免费版" : "专业版"}
                </span>
              </h3>
              <p className="text-xs text-text-tert mt-0.5">
                {settings.plan === "free"
                  ? "升级 Pro 获得更多文档空间和问答次数"
                  : "感谢支持 KnowBase"}
              </p>
            </div>
            {settings.plan === "free" && (
              <Button size="sm">升级 Pro</Button>
            )}
          </div>
        </div>

        {/* Import/Export */}
        <ImportExport />

        {/* Danger zone */}
        <DangerZone />
      </div>

      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
