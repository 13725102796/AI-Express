'use client';

import { useState } from 'react';
import { QUICK_TAGS } from '@/lib/constants';

interface QuickTagsProps {
  onSelect: (tag: string) => void;
  disabled?: boolean;
}

export default function QuickTags({ onSelect, disabled = false }: QuickTagsProps) {
  const [usedTags, setUsedTags] = useState<Set<string>>(new Set());

  const handleClick = (tag: string) => {
    if (usedTags.has(tag) || disabled) return;
    setUsedTags((prev) => new Set(prev).add(tag));
    onSelect(tag);
  };

  return (
    <div
      className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-none"
      style={{
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      }}
    >
      {QUICK_TAGS.map((tag) => {
        const isUsed = usedTags.has(tag);
        return (
          <button
            key={tag}
            className="badge badge-gold flex-shrink-0 transition-all"
            style={{
              opacity: isUsed ? 0.4 : 1,
              cursor: isUsed || disabled ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem',
              padding: '6px 14px',
            }}
            onClick={() => handleClick(tag)}
            disabled={isUsed || disabled}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
