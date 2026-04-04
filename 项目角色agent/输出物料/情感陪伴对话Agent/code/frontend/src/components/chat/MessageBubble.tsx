"use client";

import { Pill } from "@/components/ui/Pill";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-text-tertiary font-medium">{message.content}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 animate-float-up`}
    >
      <div
        className={`
          max-w-[80%] px-4 py-3
          ${isUser
            ? "bg-primary/15 rounded-[var(--radius-lg)] rounded-br-[var(--radius-sm)]"
            : "bg-secondary rounded-[var(--radius-lg)] rounded-bl-[var(--radius-sm)]"
          }
        `}
      >
        {/* Message text */}
        <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-text-tertiary animate-breathing rounded-sm" />
          )}
        </p>

        {/* Emotion tag (AI messages only) */}
        {!isUser && message.emotion && !isStreaming && (
          <div className="mt-2 animate-float-up" style={{ animationDelay: "200ms" }}>
            <Pill
              size="sm"
              color={`var(--color-${message.emotionColor || "emotion-calm"})`}
            >
              {message.emotion}
            </Pill>
          </div>
        )}
      </div>
    </div>
  );
}
