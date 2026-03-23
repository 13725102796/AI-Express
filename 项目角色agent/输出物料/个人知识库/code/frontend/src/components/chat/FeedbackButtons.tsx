"use client";

import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback?: "helpful" | "unhelpful" | null;
  onFeedback?: (messageId: string, feedback: "helpful" | "unhelpful") => void;
}

export function FeedbackButtons({ messageId, currentFeedback, onFeedback }: FeedbackButtonsProps) {
  return (
    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-divider">
      <span className="text-xs text-text-tert mr-2">这个回答有帮助吗？</span>
      <button
        onClick={() => onFeedback?.(messageId, "helpful")}
        className={cn(
          "p-1.5 rounded-[var(--radius-btn)] transition-colors",
          currentFeedback === "helpful"
            ? "bg-success/10 text-success"
            : "text-text-tert hover:text-success hover:bg-success/5"
        )}
        aria-label="有帮助"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      </button>
      <button
        onClick={() => onFeedback?.(messageId, "unhelpful")}
        className={cn(
          "p-1.5 rounded-[var(--radius-btn)] transition-colors",
          currentFeedback === "unhelpful"
            ? "bg-error/10 text-error"
            : "text-text-tert hover:text-error hover:bg-error/5"
        )}
        aria-label="无帮助"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
      </button>
    </div>
  );
}
