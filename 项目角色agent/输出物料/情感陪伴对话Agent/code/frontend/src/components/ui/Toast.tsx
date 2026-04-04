"use client";

import { useEffect } from "react";

type ToastType = "success" | "warning" | "error";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-success-subtle text-success border-success/20",
  warning: "bg-warning-subtle text-warning border-warning/20",
  error: "bg-error-subtle text-error border-error/20",
};

export function Toast({
  message,
  type = "success",
  visible,
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-float-up">
      <div
        className={`
          px-5 py-3 rounded-full border
          shadow-md text-sm font-medium
          ${typeStyles[type]}
        `}
      >
        {message}
      </div>
    </div>
  );
}
