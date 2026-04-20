'use client';

import { useState } from 'react';
import FortuneCard from './FortuneCard';
import type { FortuneItem } from '@/hooks/useChat';

interface FortuneCardsProps {
  fortunes: FortuneItem[];
}

export default function FortuneCards({ fortunes }: FortuneCardsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  if (fortunes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-3">
      {fortunes.map((fortune, idx) => (
        <FortuneCard
          key={fortune.dimension}
          fortune={fortune}
          isExpanded={expandedIndex === idx}
          onToggle={() => handleToggle(idx)}
          delay={idx * 200}
        />
      ))}
    </div>
  );
}
