'use client';

import { useState } from 'react';
import type { FortuneItem } from '@/hooks/useChat';

const DIMENSION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  overall: { icon: '☯', color: 'var(--color-accent-gold)', label: '总体运势' },
  personality: { icon: '⛰', color: 'var(--color-accent-green)', label: '性格分析' },
  career: { icon: '印', color: 'var(--color-accent-gold)', label: '事业运' },
  love: { icon: '鸳', color: 'var(--color-accent-red)', label: '感情运' },
  wealth: { icon: '钱', color: 'var(--color-accent-gold)', label: '财运' },
};

interface FortuneCardProps {
  fortune: FortuneItem;
  isExpanded: boolean;
  onToggle: () => void;
  delay?: number;
}

export default function FortuneCard({ fortune, isExpanded, onToggle, delay = 0 }: FortuneCardProps) {
  const config = DIMENSION_CONFIG[fortune.dimension] || DIMENSION_CONFIG.overall;

  return (
    <div
      className="rounded-lg overflow-hidden cursor-pointer transition-all animate-fade-rise"
      style={{
        background: 'var(--color-bg-card)',
        borderLeft: `3px solid ${config.color}`,
        animationDelay: `${delay}ms`,
      }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 p-4">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-display"
          style={{
            background: `color-mix(in oklch, ${config.color} 15%, transparent)`,
            color: config.color,
          }}
        >
          {config.icon}
        </span>

        <div className="flex-1 min-w-0">
          <h4
            className="font-display font-bold text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {fortune.title}
          </h4>
          <p
            className="text-xs mt-0.5 line-clamp-2"
            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
          >
            {fortune.summary}
          </p>
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          className="flex-shrink-0 transition-transform"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 300ms var(--ease-out-quart)',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Expandable detail */}
      <div
        className="overflow-hidden transition-all"
        style={{
          maxHeight: isExpanded ? '400px' : '0',
          transition: 'max-height 300ms var(--ease-out-quart)',
        }}
      >
        <div
          className="px-4 pb-4 pt-0"
          style={{
            borderTop: `1px solid var(--color-bg-tertiary)`,
          }}
        >
          <p
            className="text-sm pt-3"
            style={{
              color: 'var(--color-text-primary)',
              lineHeight: 1.9,
              fontFamily: 'var(--font-body)',
            }}
          >
            {fortune.detail}
          </p>
        </div>
      </div>
    </div>
  );
}
