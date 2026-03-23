"use client";

import { useCallback, useRef } from "react";
import { useChatStore, type Message, type Citation } from "@/stores/chatStore";
import { streamChat, submitFeedback } from "@/services/chat";

export function useChat() {
  const {
    messages,
    isGenerating,
    selectedSpaceId,
    addMessage,
    updateMessage,
    setIsGenerating,
    clearMessages,
  } = useChatStore();

  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return;

      // Add user message
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);

      // Add placeholder assistant message
      const assistantId = `msg-${Date.now()}-ai`;
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        citations: [],
        feedback: null,
      };
      addMessage(assistantMsg);

      setIsGenerating(true);
      abortRef.current = false;

      try {
        let fullContent = "";
        const generator = streamChat(content, selectedSpaceId);

        for await (const chunk of generator) {
          if (abortRef.current) break;

          if (chunk.type === "text") {
            fullContent += chunk.data;
            updateMessage(assistantId, { content: fullContent });
            scrollToBottom();
          } else if (chunk.type === "citations") {
            updateMessage(assistantId, {
              citations: chunk.data as unknown as Citation[],
            });
          }
        }
      } catch (error) {
        updateMessage(assistantId, {
          content: "抱歉，回答生成失败。请稍后重试。",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, selectedSpaceId, addMessage, updateMessage, setIsGenerating, scrollToBottom]
  );

  const stopGenerating = useCallback(() => {
    abortRef.current = true;
    setIsGenerating(false);
  }, [setIsGenerating]);

  const handleFeedback = useCallback(
    async (messageId: string, feedback: "helpful" | "unhelpful") => {
      updateMessage(messageId, { feedback });
      await submitFeedback(messageId, feedback);
    },
    [updateMessage]
  );

  const startNewChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  return {
    messages,
    isGenerating,
    scrollRef,
    sendMessage,
    stopGenerating,
    handleFeedback,
    startNewChat,
  };
}
