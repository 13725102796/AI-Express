"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/stores/chatStore";
import { CitationPill } from "./CitationPill";
import { SourceItem } from "./SourceItem";
import { FeedbackButtons } from "./FeedbackButtons";

interface ChatBubbleProps {
  message: Message;
  onFeedback?: (messageId: string, feedback: "helpful" | "unhelpful") => void;
}

function renderContentWithCitations(content: string) {
  // Replace [N] with citation pills
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      return <CitationPill key={i} index={parseInt(match[1])} />;
    }
    // Handle markdown-like bold
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith("**") && bp.endsWith("**")) {
        return <strong key={`${i}-${j}`}>{bp.slice(2, -2)}</strong>;
      }
      // Handle newlines
      return bp.split("\n").map((line, k, arr) => (
        <span key={`${i}-${j}-${k}`}>
          {line}
          {k < arr.length - 1 && <br />}
        </span>
      ));
    });
  });
}

export function ChatBubble({ message, onFeedback }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      )}

      <div className={cn("max-w-[720px]", isUser ? "max-w-[480px]" : "flex-1")}>
        {isUser ? (
          <div className="bg-primary text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
        ) : (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)]">
            <div className="text-[15px] leading-[1.75] text-text-main">
              {renderContentWithCitations(message.content)}
            </div>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-divider space-y-2">
                <p className="text-xs font-medium text-text-tert mb-2">引用来源</p>
                {message.citations.map((citation) => (
                  <SourceItem key={citation.id} citation={citation} />
                ))}
              </div>
            )}

            {/* Feedback */}
            {message.content && (
              <FeedbackButtons
                messageId={message.id}
                currentFeedback={message.feedback}
                onFeedback={onFeedback}
              />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-light text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-medium">
          U
        </div>
      )}
    </div>
  );
}
