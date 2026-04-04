"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

const STATUS_COLORS: Record<string, string> = {
  pending: "#888",
  running: "#3b82f6",
  completed: "#22c55e",
  failed: "#ef4444",
};

const AGENT_COLORS: Record<string, string> = {
  "research-agent": "#8b5cf6",
  "product-agent": "#3b82f6",
  "design-agent": "#ec4899",
  "tech-architect-agent": "#f59e0b",
  "fullstack-dev-agent": "#22c55e",
  "test-agent": "#ef4444",
  "design-reviewer-agent": "#06b6d4",
  "page-design-agent": "#a855f7",
};

export function AgentNode({ data }: NodeProps) {
  const d = data as { label: string; agentType: string; status: string; objective: string };
  const agentColor = AGENT_COLORS[d.agentType] || "#888";
  const statusColor = STATUS_COLORS[d.status] || "#888";

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        className="rounded-xl border px-4 py-3 min-w-[220px] shadow-lg"
        style={{
          borderColor: agentColor,
          borderWidth: 2,
          background: "var(--color-surface)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: statusColor,
              boxShadow: d.status === "running" ? `0 0 8px ${statusColor}` : "none",
            }}
          />
          <span className="text-xs font-semibold" style={{ color: agentColor }}>
            {d.agentType}
          </span>
        </div>
        <p className="text-xs leading-snug" style={{ color: "var(--color-text-secondary)" }}>
          {d.objective || d.label}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {d.status}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}
