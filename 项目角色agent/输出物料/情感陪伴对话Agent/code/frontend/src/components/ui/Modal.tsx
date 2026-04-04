"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  danger?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  confirmText = "确定",
  cancelText = "取消",
  onConfirm,
  danger = false,
}: ModalProps) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-surface-invert/40 backdrop-blur-sm" />

      {/* Content */}
      <div
        className="relative bg-surface-0 rounded-[var(--radius-xl)] p-6 w-full max-w-sm shadow-lg animate-float-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-heading font-semibold text-text-primary mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-text-secondary mb-4">{description}</p>
        )}
        {children}
        <div className="flex gap-3 mt-6">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm || onClose}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
