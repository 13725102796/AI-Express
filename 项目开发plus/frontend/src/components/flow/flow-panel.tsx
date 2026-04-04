"use client";

import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGraphStore } from "@/stores/graph-store";
import { AgentNode } from "./agent-node";

const nodeTypes = { agent: AgentNode };

export function FlowPanel() {
  const { nodes, edges } = useGraphStore();

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-secondary)" }}>
        <p className="text-sm">启动 Phase 后，Agent 流程图将在此显示</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: "var(--color-bg)" }}
      >
        <Background color="var(--color-border)" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
