"use client";

import { cn } from "@/lib/utils";

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

function UsageBar({ label, used, limit, unit }: UsageBarProps) {
  const pct = Math.min((used / limit) * 100, 100);
  const color =
    pct >= 90 ? "bg-error" : pct >= 70 ? "bg-accent" : "bg-primary";

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-text-main">{label}</span>
        <span className="text-xs text-text-sec">
          {used} / {limit} {unit}
        </span>
      </div>
      <div className="progress-bar h-2 bg-bg-sec rounded-full overflow-hidden">
        <div
          className={cn("progress-bar-fill h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface UsageBarsProps {
  usage: {
    documents: { used: number; limit: number };
    storage: { used: number; limit: number };
    queries: { used: number; limit: number };
  };
}

export function UsageBars({ usage }: UsageBarsProps) {
  return (
    <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
      <h3 className="text-sm font-semibold text-text-main mb-4">用量统计</h3>
      <UsageBar label="文档数量" used={usage.documents.used} limit={usage.documents.limit} unit="个" />
      <UsageBar label="存储空间" used={usage.storage.used} limit={usage.storage.limit} unit="MB" />
      <UsageBar label="本月问答" used={usage.queries.used} limit={usage.queries.limit} unit="次" />
      <p className="text-xs text-text-tert mt-2">
        免费版限额。升级 Pro 可获得更多用量。
      </p>
    </div>
  );
}
