"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    id: "chat",
    label: "对话",
    href: "/chat",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    id: "fossils",
    label: "化石层",
    href: "/fossils",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "memories",
    label: "回忆",
    href: "/fossils?tab=memories",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "我的",
    href: "/settings",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const activeTab = tabs.find((tab) => {
    if (tab.id === "memories") return false; // special handling
    return pathname.startsWith(tab.href);
  })?.id || "chat";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
      <div className="bg-surface-0/80 dark:bg-surface-0/90 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto h-16">
          {tabs.map((tab) => {
            const isActive =
              tab.id === "memories"
                ? pathname === "/fossils" && typeof window !== "undefined" && window.location.search.includes("tab=memories")
                : activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 w-16 py-1
                  transition-colors duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
                  ${isActive ? "text-primary" : "text-text-tertiary"}
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.icon(isActive)}
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-1.5 w-5 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
