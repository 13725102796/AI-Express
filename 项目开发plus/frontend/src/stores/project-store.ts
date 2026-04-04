import { create } from "zustand";

export interface Project {
  threadId: string;
  name: string;
  createdAt: number;
  currentPhase: number;
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;

  addProject: (project: Project) => void;
  setActiveProject: (threadId: string) => void;
  updateProject: (threadId: string, updates: Partial<Project>) => void;
  removeProject: (threadId: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProjectId: null,

  addProject: (project) =>
    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: project.threadId,
    })),

  setActiveProject: (threadId) => set({ activeProjectId: threadId }),

  updateProject: (threadId, updates) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.threadId === threadId ? { ...p, ...updates } : p
      ),
    })),

  removeProject: (threadId) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.threadId !== threadId),
      activeProjectId: s.activeProjectId === threadId ? null : s.activeProjectId,
    })),
}));
