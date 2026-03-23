"use client";

import { cn } from "@/lib/utils";

interface TagChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

export function TagChip({ label, selected = false, onClick }: TagChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-3 py-1 text-xs font-medium rounded-[var(--radius-pill)] transition-all",
        selected
          ? "bg-primary text-white"
          : "bg-bg-sec text-text-sec border border-border hover:border-text-tert hover:bg-bg-card"
      )}
    >
      {label}
    </button>
  );
}
