"use client";

import { useChatStore } from "@/stores/chat-store";
import { useGraphStore } from "@/stores/graph-store";

const PHASE_NAMES = ["Phase 0: 需求+设计", "Phase 1: 页面设计", "Phase 2: 开发"];

export function DashboardPanel() {
  const { projectName, currentPhase, totalCalls, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens } = useChatStore();
  const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
  const { nodes } = useGraphStore();

  return (
    <div className="space-y-4">
      {/* 项目信息 */}
      <section>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
          项目
        </h3>
        <p className="text-sm" style={{ color: "var(--color-text)" }}>
          {projectName || "未启动"}
        </p>
      </section>

      {/* Token 消耗统计 */}
      {totalCalls > 0 && (
        <section>
          <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
            Token 消耗
          </h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs"
              style={{ background: "var(--color-surface-2)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>总计</span>
              <span style={{ color: "var(--color-warning)" }}>{totalTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>输入</span>
              <span style={{ color: "var(--color-text)" }}>{inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>输出</span>
              <span style={{ color: "var(--color-text)" }}>{outputTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>缓存创建</span>
              <span style={{ color: "var(--color-text)" }}>{cacheCreationTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>缓存命中</span>
              <span style={{ color: "var(--color-success)" }}>{cacheReadTokens.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs"
              style={{ background: "var(--color-surface-2)" }}>
              <span style={{ color: "var(--color-text-secondary)" }}>调用次数</span>
              <span style={{ color: "var(--color-text)" }}>{totalCalls} 次</span>
            </div>
          </div>
        </section>
      )}

      {/* Phase 进度 */}
      <section>
        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
          Phase 进度
        </h3>
        <div className="space-y-1.5">
          {PHASE_NAMES.map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs"
              style={{
                background: i === currentPhase ? "var(--color-surface-2)" : "transparent",
                color: i === currentPhase ? "var(--color-primary)" : i < currentPhase ? "var(--color-success)" : "var(--color-text-secondary)",
              }}
            >
              <span>
                {i < currentPhase ? "✓" : i === currentPhase ? "●" : "○"}
              </span>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Agent 状态 */}
      {nodes.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
            Agent 状态
          </h3>
          <div className="space-y-1">
            {nodes.map((n) => (
              <div key={n.id} className="flex items-center gap-2 px-2 py-1 text-xs">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      n.data.status === "completed" ? "var(--color-success)"
                      : n.data.status === "running" ? "var(--color-primary)"
                      : n.data.status === "failed" ? "var(--color-error)"
                      : "var(--color-text-secondary)",
                  }}
                />
                <span style={{ color: "var(--color-text)" }}>{n.data.agentType || n.data.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
