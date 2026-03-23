import { create } from "zustand";

export interface Citation {
  id: number;
  sourceTitle: string;
  sourceType: "pdf" | "word" | "web" | "markdown" | "txt";
  excerpt: string;
  confidence: number;
  pageNum?: number | null;
  originalUrl?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
  feedback?: "helpful" | "unhelpful" | null;
}

export interface Conversation {
  id: string;
  title: string;
  date: string;
  messageCount: number;
}

interface ChatState {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  selectedSpaceId: string;
  isGenerating: boolean;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setSelectedSpace: (id: string) => void;
  setIsGenerating: (generating: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  conversations: [],
  activeConversationId: null,
  selectedSpaceId: "all",
  isGenerating: false,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  setSelectedSpace: (selectedSpaceId) => set({ selectedSpaceId }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  clearMessages: () => set({ messages: [], activeConversationId: null }),
}));
