'use client';

import { useState } from 'react';
import type { BaziResult } from '@/lib/bazi';
import { ELEMENT_COLORS } from '@/lib/constants';

interface BaziPanelProps {
  bazi: BaziResult;
}

function PillarDisplay({ label, stem, branch, element }: {
  label: string;
  stem: string;
  branch: string;
  element: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </span>
      <span
        className="font-display font-bold text-xl"
        style={{ color: 'var(--color-accent-gold)' }}
      >
        {stem}
      </span>
      <span
        className="font-display text-base"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {branch}
      </span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {element}
      </span>
    </div>
  );
}

export default function BaziPanel({ bazi }: BaziPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div
        className="px-4 py-2 flex items-center justify-between cursor-pointer"
        style={{
          background: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-accent-gold-dim)',
        }}
        onClick={() => setIsCollapsed(false)}
      >
        <span
          className="font-display text-sm"
          style={{ color: 'var(--color-accent-gold)' }}
        >
          {bazi.yearPillar.stem}{bazi.yearPillar.branch}{' '}
          {bazi.monthPillar.stem}{bazi.monthPillar.branch}{' '}
          {bazi.dayPillar.stem}{bazi.dayPillar.branch}{' '}
          {bazi.hourPillar ? `${bazi.hourPillar.stem}${bazi.hourPillar.branch}` : '??'}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    );
  }

  // Collect five elements with colors
  const elementLabels = [
    { name: '金', count: bazi.fiveElements.metal, color: ELEMENT_COLORS['金'] },
    { name: '木', count: bazi.fiveElements.wood, color: ELEMENT_COLORS['木'] },
    { name: '水', count: bazi.fiveElements.water, color: ELEMENT_COLORS['水'] },
    { name: '火', count: bazi.fiveElements.fire, color: ELEMENT_COLORS['火'] },
    { name: '土', count: bazi.fiveElements.earth, color: ELEMENT_COLORS['土'] },
  ];

  return (
    <div
      className="px-4 py-4"
      style={{
        background: 'var(--color-bg-card)',
        borderBottom: '1px solid var(--color-accent-gold-dim)',
      }}
    >
      {/* Four Pillars */}
      <div className="flex items-center justify-around mb-3">
        <PillarDisplay
          label="年柱"
          stem={bazi.yearPillar.stem}
          branch={bazi.yearPillar.branch}
          element={bazi.yearPillar.element}
        />
        <div
          className="w-px h-12"
          style={{ background: 'var(--color-bg-tertiary)' }}
        />
        <PillarDisplay
          label="月柱"
          stem={bazi.monthPillar.stem}
          branch={bazi.monthPillar.branch}
          element={bazi.monthPillar.element}
        />
        <div
          className="w-px h-12"
          style={{ background: 'var(--color-bg-tertiary)' }}
        />
        <PillarDisplay
          label="日柱"
          stem={bazi.dayPillar.stem}
          branch={bazi.dayPillar.branch}
          element={bazi.dayPillar.element}
        />
        <div
          className="w-px h-12"
          style={{ background: 'var(--color-bg-tertiary)' }}
        />
        <PillarDisplay
          label="时柱"
          stem={bazi.hourPillar?.stem || '?'}
          branch={bazi.hourPillar?.branch || '?'}
          element={bazi.hourPillar?.element || '未知'}
        />
      </div>

      {/* Five Elements Badges */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {elementLabels.map((el) => (
          <span
            key={el.name}
            className="text-xs px-2 py-0.5 rounded-full font-display"
            style={{
              background: `color-mix(in oklch, ${el.color} 15%, transparent)`,
              color: el.color,
              border: `1px solid color-mix(in oklch, ${el.color} 30%, transparent)`,
            }}
          >
            {el.name}{el.count}
          </span>
        ))}
      </div>

      {/* Summary + Collapse */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {bazi.summary}
        </span>
        <button
          className="p-1"
          onClick={() => setIsCollapsed(true)}
          aria-label="折叠八字排盘"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
