import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  agentType?: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  progressText: string;       // 实时进度文本（显示在加载气泡中）
  threadId: string | null;
  projectName: string;
  currentPhase: number;
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;

  addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  setLoading: (loading: boolean) => void;
  setProgressText: (text: string) => void;
  setThreadId: (id: string) => void;
  setProjectName: (name: string) => void;
  setCurrentPhase: (phase: number) => void;
  addTokenUsage: (input: number, output: number, cacheCreation: number, cacheRead: number) => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  progressText: "",
  threadId: null,
  projectName: "",
  currentPhase: -1,
  totalCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
      ],
    })),

  setLoading: (loading) => set({ isLoading: loading, progressText: loading ? "" : "" }),
  setProgressText: (text) => set({ progressText: text }),
  setThreadId: (id) => set({ threadId: id }),
  setProjectName: (name) => set({ projectName: name }),
  setCurrentPhase: (phase) => set({ currentPhase: phase }),
  addTokenUsage: (input, output, cacheCreation, cacheRead) =>
    set((s) => ({
      totalCalls: s.totalCalls + 1,
      inputTokens: s.inputTokens + input,
      outputTokens: s.outputTokens + output,
      cacheCreationTokens: s.cacheCreationTokens + cacheCreation,
      cacheReadTokens: s.cacheReadTokens + cacheRead,
    })),
  reset: () =>
    set({
      messages: [],
      isLoading: false,
      progressText: "",
      threadId: null,
      projectName: "",
      currentPhase: -1,
      totalCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    }),
}));
