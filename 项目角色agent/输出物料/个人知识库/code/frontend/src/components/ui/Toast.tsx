"use client";

import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const typeConfig: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "bg-success", icon: "M20 6L9 17l-5-5" },
  error: { bg: "bg-error", icon: "M18 6L6 18M6 6l12 12" },
  warning: { bg: "bg-accent", icon: "M12 9v4m0 4h.01M12 2L2 20h20L12 2z" },
  info: { bg: "bg-primary", icon: "M12 16v-4m0-4h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z" },
};

function ToastNotification({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(item.id), 3000);
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  const config = typeConfig[item.type];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] text-white shadow-lg",
        "animate-[slideIn_0.2s_ease-out]",
        config.bg
      )}
      role="alert"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={config.icon} />
      </svg>
      <span className="text-sm font-medium">{item.message}</span>
      <button
        onClick={() => onRemove(item.id)}
        className="ml-auto p-0.5 rounded hover:bg-white/20 transition-colors"
        aria-label="关闭"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastNotification key={t.id} item={t} onRemove={remove} />
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
