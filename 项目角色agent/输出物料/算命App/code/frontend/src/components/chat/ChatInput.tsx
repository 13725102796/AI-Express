'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = '请问大师...',
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        className="input-field flex-1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={500}
      />
      <button
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: value.trim() && !disabled ? 'var(--color-accent-gold)' : 'var(--color-bg-tertiary)',
          color: value.trim() && !disabled ? 'var(--color-text-on-gold)' : 'var(--color-text-muted)',
          cursor: value.trim() && !disabled ? 'pointer' : 'not-allowed',
        }}
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        aria-label="发送消息"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  );
}
