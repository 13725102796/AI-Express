"use client";

import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const MAX_LENGTH = 1000;

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOverLimit = text.length > MAX_LENGTH;
  const isEmpty = !text.trim();

  const handleSend = useCallback(() => {
    if (isEmpty || isOverLimit || disabled) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, isEmpty, isOverLimit, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize textarea (max 5 lines)
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }, []);

  return (
    <div className="border-t border-border bg-surface-0 safe-area-bottom">
      {/* Over limit warning */}
      {isOverLimit && (
        <div className="px-4 py-1.5 text-xs text-text-secondary bg-surface-1 animate-float-up">
          消息太长了，分开说好不好，我不会走的
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-3">
        {/* Voice input button */}
        <button
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center
            rounded-full bg-surface-1 text-text-tertiary
            hover:bg-surface-2 transition-colors duration-[var(--duration-fast)]"
          aria-label="语音输入"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="想说点什么..."
          rows={1}
          disabled={disabled}
          className="flex-1 px-4 py-2.5 bg-surface-1 text-text-primary text-sm
            rounded-[var(--radius-lg)] resize-none
            placeholder:text-text-tertiary
            focus:outline-none focus:ring-1 focus:ring-border-focus
            transition-all duration-[var(--duration-normal)]
            disabled:opacity-50"
          style={{ maxHeight: "120px" }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isEmpty || isOverLimit || disabled}
          className={`
            flex-shrink-0 w-10 h-10 flex items-center justify-center
            rounded-full transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
            ${
              isEmpty || isOverLimit || disabled
                ? "bg-surface-2 text-text-tertiary"
                : "bg-primary text-text-on-primary hover:bg-primary-hover"
            }
          `}
          aria-label="发送"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
