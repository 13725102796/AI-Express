"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTheme } from "next-themes";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { SafetyCard } from "@/components/chat/SafetyCard";
import { BreathingOverlay } from "@/components/breathing/BreathingOverlay";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { Modal } from "@/components/ui/Modal";
import { useSentenceTTS } from "@/hooks/useSentenceTTS";
import { getTTSEmotion } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/types/chat";

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const {
    isBreathingMode,
    enterBreathingMode,
    showFossilPreview,
    fossilPreviewData,
    hideFossil,
  } = useChatStore();

  const [showSafetyCard, setShowSafetyCard] = useState(false);
  const [showBreathingConfirm, setShowBreathingConfirm] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // TTS 逐句调度
  const { feedText, flush, stopAll, isSpeaking } = useSentenceTTS();
  const ttsEmotion = getTTSEmotion(user?.companionStyle || "warm");
  const streamedTextRef = useRef("");

  // Timing tracking
  const sendTimeRef = useRef<number>(0);
  const serverStartRef = useRef<number>(0);
  const firstTokenTimeRef = useRef<number>(0);
  const [latency, setLatency] = useState<{
    clientToServer: number;
    prefill: number;
    generation: number;
    total: number;
  } | null>(null);
  const prevStatusRef = useRef<string>("ready");

  // Custom transport to capture X-Server-Start header
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    fetch: async (url, init) => {
      const resp = await fetch(url, init);
      const serverStart = resp.headers.get("X-Server-Start");
      if (serverStart) serverStartRef.current = Number(serverStart);
      return resp;
    },
  }), []);

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{
          type: "text" as const,
          text: user?.nickname
            ? `${user.nickname}，以后我就在这里。想聊什么都可以。`
            : "你好，这里是留白。想聊什么都可以。",
        }],
        createdAt: new Date(),
      },
    ],
  });

  const isStreaming = status === "streaming";
  const isSubmitting = status === "submitted";
  const isBusy = isStreaming || isSubmitting;

  // Track status transitions for timing + TTS
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== "streaming" && status === "streaming") {
      firstTokenTimeRef.current = Date.now();
      streamedTextRef.current = "";
    }
    // LLM 流式输出中：逐句喂给 TTS
    if (status === "streaming" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        const text = getMessageText(lastMsg);
        if (text !== streamedTextRef.current) {
          streamedTextRef.current = text;
          feedText(text, ttsEmotion);
        }
      }
    }
    // LLM 流结束：flush 剩余文本 + 记录延迟
    if (prev === "streaming" && status === "ready") {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant") {
        flush(getMessageText(lastMsg), ttsEmotion);
      }
      const tEnd = Date.now();
      const tSend = sendTimeRef.current;
      const tServer = serverStartRef.current || tSend;
      const tFirst = firstTokenTimeRef.current;
      setLatency({
        clientToServer: tServer - tSend,
        prefill: tFirst - tServer,
        generation: tEnd - tFirst,
        total: tEnd - tSend,
      });
    }
    prevStatusRef.current = status;
  }, [status, messages, feedText, flush, ttsEmotion]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  // Detect scroll position
  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsAtBottom(true);
  }, []);

  const handleSendMessage = useCallback(
    (text: string) => {
      stopAll(); // 中止正在播放的 TTS
      sendTimeRef.current = Date.now();
      firstTokenTimeRef.current = 0;
      setLatency(null);
      sendMessage({ text });
    },
    [sendMessage, stopAll]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Extract text content from UIMessage parts
  const getMessageText = (msg: (typeof messages)[0]): string => {
    if (!msg.parts) return "";
    return msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  };

  // Map AI SDK messages to our ChatMessage type
  const chatMessages: ChatMessage[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role as ChatMessage["role"],
    content: getMessageText(msg),
    createdAt: msg.createdAt || new Date(),
  }));

  return (
    <div className="flex-1 flex flex-col h-dvh relative">
      {/* Header bar */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-border/50 bg-surface-0/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg text-text-primary">留白</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success animate-breathing" />
            <span className="text-xs text-text-tertiary">
              {isBusy ? "在想..." : "在的"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBreathingConfirm(true)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors px-2 py-1"
          >
            我需要冷静一下
          </button>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full
              hover:bg-surface-1 transition-colors text-text-tertiary"
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Message list */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {chatMessages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && i === chatMessages.length - 1 && msg.role === "assistant"}
          />
        ))}

        {/* Timing display */}
        {latency && !isBusy && (
          <div className="flex justify-start px-2 pb-1">
            <span className="text-[10px] text-text-tertiary/50 font-mono leading-relaxed">
              网络 {latency.clientToServer}ms · prefill {latency.prefill}ms · 生成 {latency.generation}ms · 合计 {latency.total}ms
            </span>
          </div>
        )}

        {/* Typing indicator */}
        {isSubmitting && (
          <TypingIndicator />
        )}

        {/* Safety card */}
        {showSafetyCard && <SafetyCard />}

        {/* Fossil preview */}
        {showFossilPreview && fossilPreviewData && (
          <div className="mx-2 my-3 p-4 bg-surface-1 rounded-[var(--radius-lg)] border border-border animate-float-up">
            <p className="text-xs text-text-tertiary mb-2">{fossilPreviewData.emotionTags.join(" + ")}</p>
            <p className="text-sm text-text-primary leading-relaxed font-[var(--font-display)] italic">
              {fossilPreviewData.inscription}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { /* navigate to fossils */ }}
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                查看化石
              </button>
              <button className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                写一封回声信
              </button>
              <button
                onClick={hideFossil}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors ml-auto"
              >
                关闭
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* New message indicator */}
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2
            bg-surface-0 rounded-full shadow-md text-xs text-text-secondary
            border border-border hover:bg-surface-1 transition-all
            animate-float-up z-20"
        >
          有新消息
        </button>
      )}

      {/* Chat input */}
      <ChatInput onSend={handleSendMessage} disabled={isBusy} />

      {/* Breathing mode confirmation */}
      <Modal
        open={showBreathingConfirm}
        onClose={() => setShowBreathingConfirm(false)}
        title="要不要先停一下？"
        description="我可以陪你做几次深呼吸。"
        confirmText="好的"
        cancelText="不用了"
        onConfirm={() => {
          setShowBreathingConfirm(false);
          enterBreathingMode();
        }}
      />

      {/* Breathing overlay */}
      <BreathingOverlay />
    </div>
  );
}
