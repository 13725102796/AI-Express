"use client";

import { useEffect, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  fullScreen?: boolean;
  title?: string;
}

export function Drawer({
  open,
  onClose,
  children,
  fullScreen = false,
  title,
}: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-surface-invert/40 backdrop-blur-sm transition-opacity duration-[var(--duration-normal)]" />

      {/* Drawer */}
      <div
        className={`
          absolute bottom-0 left-0 right-0
          bg-surface-0 rounded-t-[var(--radius-xl)]
          shadow-lg safe-area-bottom
          transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]
          ${fullScreen ? "top-0 rounded-t-none" : "max-h-[85vh]"}
          overflow-y-auto
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        {!fullScreen && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-surface-3" />
          </div>
        )}

        {/* Header */}
        {(title || fullScreen) && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h3 className="text-lg font-heading font-semibold text-text-primary">
              {title || ""}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2 text-text-tertiary transition-colors"
              aria-label="关闭"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
