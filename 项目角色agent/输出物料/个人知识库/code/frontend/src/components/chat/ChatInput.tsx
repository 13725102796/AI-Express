"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, onStop, isGenerating, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!value.trim() || isGenerating || disabled) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="border-t border-border bg-bg-card p-4">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="基于你的知识库提问..."
            disabled={isGenerating || disabled}
            rows={1}
            className={cn(
              "w-full resize-none px-4 py-2.5 text-sm bg-bg-sec border border-border rounded-[var(--radius-card)]",
              "text-text-main placeholder:text-text-tert",
              "focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-primary",
              "transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
        </div>
        {isGenerating ? (
          <button
            onClick={onStop}
            className="h-10 px-4 rounded-[var(--radius-btn)] bg-error text-white text-sm font-medium hover:bg-[#DC2626] transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            停止
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "h-10 px-4 rounded-[var(--radius-btn)] text-sm font-medium transition-all flex items-center gap-1.5",
              value.trim()
                ? "bg-primary text-white hover:bg-primary-dark"
                : "bg-bg-sec text-text-tert cursor-not-allowed"
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22,2 15,22 11,13 2,9" />
            </svg>
          </button>
        )}
      </div>
      <p className="text-[11px] text-text-tert text-center mt-2">
        Enter 发送 · Shift + Enter 换行 · AI 回答基于你的知识库内容
      </p>
    </div>
  );
}
