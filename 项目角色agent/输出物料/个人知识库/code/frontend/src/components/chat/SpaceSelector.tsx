"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chatStore";
import { fetchSpaces, type Space } from "@/services/spaces";

export function SpaceSelector() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [open, setOpen] = useState(false);
  const selectedSpaceId = useChatStore((s) => s.selectedSpaceId);
  const setSelectedSpace = useChatStore((s) => s.setSelectedSpace);

  useEffect(() => {
    fetchSpaces().then(setSpaces);
  }, []);

  const allSpaces = [
    { id: "all", name: "全部空间", docCount: spaces.reduce((s, sp) => s + sp.docCount, 0) },
    ...spaces,
  ];

  const selected = allSpaces.find((s) => s.id === selectedSpaceId) || allSpaces[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 h-8 px-3 rounded-[var(--radius-btn)] text-sm font-medium",
          "border border-border bg-bg-card hover:bg-bg-sec transition-colors"
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
        <span>{selected.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("transition-transform", open && "rotate-180")}>
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-bg-card border border-border rounded-[var(--radius-card)] shadow-[var(--shadow-modal)] z-20 py-1">
            {allSpaces.map((space) => (
              <button
                key={space.id}
                onClick={() => {
                  setSelectedSpace(space.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-bg-sec transition-colors",
                  space.id === selectedSpaceId && "bg-primary/5 text-primary"
                )}
              >
                <span>{space.name}</span>
                <span className="text-xs text-text-tert">{space.docCount}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
