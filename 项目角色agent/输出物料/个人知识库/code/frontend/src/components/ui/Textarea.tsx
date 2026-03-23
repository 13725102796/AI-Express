"use client";

import { forwardRef, useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  autoGrow?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, label, autoGrow = true, className, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    useEffect(() => {
      if (!autoGrow || !textareaRef.current) return;
      const el = textareaRef.current;
      const resize = () => {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      };
      el.addEventListener("input", resize);
      resize();
      return () => el.removeEventListener("input", resize);
    }, [autoGrow, textareaRef]);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-main mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={textareaRef}
          className={cn(
            "w-full min-h-[80px] px-3 py-2 text-sm bg-bg-card border rounded-[var(--radius-input)]",
            "text-text-main placeholder:text-text-tert resize-none",
            "transition-all duration-[var(--transition-base)]",
            "focus:outline-none focus:shadow-[var(--shadow-focus)] focus:border-primary",
            error
              ? "border-error focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
              : "border-border",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
