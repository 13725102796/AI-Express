"use client";

import { useState } from "react";
import { CitationTooltip } from "./CitationTooltip";

interface CitationPillProps {
  index: number;
}

export function CitationPill({ index }: CitationPillProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => {
          setTimeout(() => setShowTooltip(true), 200);
        }}
        onMouseLeave={() => {
          setTimeout(() => setShowTooltip(false), 300);
        }}
        className="inline-flex items-center justify-center bg-accent-light text-[#B45309] text-[11px] font-semibold px-1.5 py-0 rounded-full align-super mx-0.5 cursor-pointer transition-all hover:scale-105 hover:bg-[#FDE68A] hover:text-[#D97706]"
      >
        {index}
      </button>
      {showTooltip && <CitationTooltip index={index} />}
    </span>
  );
}
