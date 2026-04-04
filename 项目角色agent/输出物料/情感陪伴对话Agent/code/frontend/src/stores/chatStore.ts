import { create } from "zustand";

interface ChatState {
  currentConversationId: string | null;
  isBreathingMode: boolean;
  showFossilPreview: boolean;
  fossilPreviewData: {
    fossilId: string;
    inscription: string;
    emotionTags: string[];
    emotionColor: string;
  } | null;

  setCurrentConversation: (id: string | null) => void;
  enterBreathingMode: () => void;
  exitBreathingMode: () => void;
  showFossil: (data: ChatState["fossilPreviewData"]) => void;
  hideFossil: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  currentConversationId: null,
  isBreathingMode: false,
  showFossilPreview: false,
  fossilPreviewData: null,

  setCurrentConversation: (id) => set({ currentConversationId: id }),
  enterBreathingMode: () => set({ isBreathingMode: true }),
  exitBreathingMode: () => set({ isBreathingMode: false }),
  showFossil: (data) => set({ showFossilPreview: true, fossilPreviewData: data }),
  hideFossil: () => set({ showFossilPreview: false, fossilPreviewData: null }),
}));
