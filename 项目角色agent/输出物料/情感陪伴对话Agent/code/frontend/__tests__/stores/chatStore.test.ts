import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "@/stores/chatStore";

describe("chatStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useChatStore.setState({
      currentConversationId: null,
      isBreathingMode: false,
      showFossilPreview: false,
      fossilPreviewData: null,
    });
  });

  it("has correct initial state", () => {
    const state = useChatStore.getState();
    expect(state.currentConversationId).toBeNull();
    expect(state.isBreathingMode).toBe(false);
    expect(state.showFossilPreview).toBe(false);
    expect(state.fossilPreviewData).toBeNull();
  });

  it("sets current conversation", () => {
    useChatStore.getState().setCurrentConversation("conv-123");
    expect(useChatStore.getState().currentConversationId).toBe("conv-123");
  });

  it("clears current conversation", () => {
    useChatStore.getState().setCurrentConversation("conv-123");
    useChatStore.getState().setCurrentConversation(null);
    expect(useChatStore.getState().currentConversationId).toBeNull();
  });

  it("enters breathing mode", () => {
    useChatStore.getState().enterBreathingMode();
    expect(useChatStore.getState().isBreathingMode).toBe(true);
  });

  it("exits breathing mode", () => {
    useChatStore.getState().enterBreathingMode();
    useChatStore.getState().exitBreathingMode();
    expect(useChatStore.getState().isBreathingMode).toBe(false);
  });

  it("shows fossil preview", () => {
    const fossilData = {
      fossilId: "fossil-1",
      inscription: "A test fossil",
      emotionTags: ["sad", "lonely"],
      emotionColor: "emotion-sad",
    };
    useChatStore.getState().showFossil(fossilData);
    const state = useChatStore.getState();
    expect(state.showFossilPreview).toBe(true);
    expect(state.fossilPreviewData).toEqual(fossilData);
  });

  it("hides fossil preview and clears data", () => {
    useChatStore.getState().showFossil({
      fossilId: "fossil-1",
      inscription: "test",
      emotionTags: [],
      emotionColor: "emotion-calm",
    });
    useChatStore.getState().hideFossil();
    const state = useChatStore.getState();
    expect(state.showFossilPreview).toBe(false);
    expect(state.fossilPreviewData).toBeNull();
  });
});
