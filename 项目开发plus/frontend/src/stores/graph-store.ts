import { create } from "zustand";

export interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    agentType: string;
    status: string;
    objective: string;
  };
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
}

interface GraphState {
  nodes: FlowNode[];
  edges: FlowEdge[];

  setDispatches: (dispatches: any[]) => void;
  reset: () => void;
}

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

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],

  setDispatches: (dispatches) => {
    if (!dispatches?.length) return;

    const nodes: FlowNode[] = dispatches.map((d: any, i: number) => ({
      id: d.task_id,
      type: "agent",
      data: {
        label: d.agent_type,
        agentType: d.agent_type,
        status: d.status,
        objective: d.objective,
      },
      position: { x: 200, y: i * 150 },
    }));

    const edges: FlowEdge[] = [];
    for (let i = 1; i < dispatches.length; i++) {
      edges.push({
        id: `e-${dispatches[i - 1].task_id}-${dispatches[i].task_id}`,
        source: dispatches[i - 1].task_id,
        target: dispatches[i].task_id,
        animated: dispatches[i].status === "running",
      });
    }

    set({ nodes, edges });
  },

  reset: () => set({ nodes: [], edges: [] }),
}));
