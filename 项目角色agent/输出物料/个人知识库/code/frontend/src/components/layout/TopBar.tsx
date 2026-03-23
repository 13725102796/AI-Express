"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SearchModal } from "./SearchModal";
import { useAuthStore } from "@/stores/authStore";
import { useUploadStore } from "@/stores/uploadStore";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const openUpload = useUploadStore((s) => s.setModalOpen);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-bg-card border-b border-border flex items-center px-4 md:px-8 z-50">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="var(--font-ui)">K</text>
          </svg>
          <span className="hidden md:inline text-base font-semibold text-text-main">KnowBase</span>
        </div>

        {/* Search box trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            "flex items-center gap-2 h-9 px-3 rounded-[var(--radius-input)] border border-border",
            "bg-bg-sec text-text-tert text-sm flex-1 max-w-md mx-auto",
            "hover:border-text-tert transition-colors cursor-pointer"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>搜索知识库...</span>
          <kbd className="hidden md:inline ml-auto text-xs bg-bg-card border border-border rounded px-1.5 py-0.5 font-[var(--font-code)]">
            ⌘K
          </kbd>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => openUpload(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium bg-primary text-white rounded-[var(--radius-btn)] hover:bg-primary-dark transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="hidden md:inline">上传</span>
          </button>

          {/* Avatar */}
          <button className="w-8 h-8 rounded-full bg-primary-light text-white text-sm font-medium flex items-center justify-center hover:opacity-90 transition-opacity">
            {user?.name?.charAt(0) || "U"}
          </button>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
