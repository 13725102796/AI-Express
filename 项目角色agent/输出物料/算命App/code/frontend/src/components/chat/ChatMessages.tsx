'use client';

import { useEffect, useRef } from 'react';
import FortuneCards from './FortuneCards';
import { useTypewriter } from '@/hooks/useTypewriter';
import type { ChatMessage } from '@/hooks/useChat';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

function AiMessageBubble({ message }: { message: ChatMessage }) {
  const showTypewriter = message.isStreaming;

  return (
    <div className="flex gap-3 animate-fade-rise" style={{ animationDelay: '0.1s' }}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-display text-sm"
        style={{
          background: 'var(--color-bg-tertiary)',
          color: 'var(--color-accent-gold)',
          border: '1px solid var(--color-accent-gold-dim)',
        }}
      >
        仙
      </div>

      <div className="max-w-[85%] flex flex-col gap-2">
        <div
          className="rounded-xl rounded-tl-sm px-4 py-3"
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-bg-tertiary)',
          }}
        >
          <p
            className="text-sm whitespace-pre-wrap"
            style={{
              color: 'var(--color-text-primary)',
              lineHeight: 1.9,
              fontFamily: 'var(--font-body)',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
            {showTypewriter && (
              <span
                className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom"
                style={{
                  background: 'var(--color-accent-gold)',
                  animation: 'blink 1s infinite',
                }}
              />
            )}
          </p>
        </div>

        {/* Fortune cards (only in first message) */}
        {message.fortunes && message.fortunes.length > 0 && (
          <FortuneCards fortunes={message.fortunes} />
        )}
      </div>
    </div>
  );
}

function UserMessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end animate-fade-rise">
      <div
        className="max-w-[75%] rounded-xl rounded-tr-sm px-4 py-3"
        style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-bg-tertiary)',
        }}
      >
        <p
          className="text-sm"
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: 1.7,
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-rise">
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-display text-sm"
        style={{
          background: 'var(--color-bg-tertiary)',
          color: 'var(--color-accent-gold)',
          border: '1px solid var(--color-accent-gold-dim)',
        }}
      >
        仙
      </div>
      <div
        className="rounded-xl rounded-tl-sm px-4 py-3 flex items-center gap-1"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-bg-tertiary)',
        }}
      >
        <span
          className="text-xs font-display mr-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          大师正在卜算
        </span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--color-accent-gold)',
              animation: `dotBounce 1.4s infinite ${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
      style={{ scrollBehavior: 'smooth' }}
    >
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {messages.map((msg) =>
        msg.role === 'assistant' ? (
          <AiMessageBubble key={msg.id} message={msg} />
        ) : (
          <UserMessageBubble key={msg.id} message={msg} />
        )
      )}

      {isLoading && messages.every((m) => !m.isStreaming) && (
        <TypingIndicator />
      )}
    </div>
  );
}
