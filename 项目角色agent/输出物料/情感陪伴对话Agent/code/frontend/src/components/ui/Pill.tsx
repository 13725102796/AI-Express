"use client";

import type { ReactNode } from "react";

interface PillProps {
  children: ReactNode;
  color?: string;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function Pill({
  children,
  color,
  active = false,
  onClick,
  size = "sm",
  className = "",
}: PillProps) {
  const isInteractive = !!onClick;
  const sizeClasses = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";

  const baseClasses = `
    inline-flex items-center rounded-full font-medium
    transition-all duration-[var(--duration-fast)] ease-[var(--ease-out-quart)]
    ${sizeClasses}
    ${isInteractive ? "cursor-pointer" : ""}
    ${active
      ? "bg-primary text-text-on-primary"
      : "bg-surface-2 text-text-secondary hover:bg-surface-3"
    }
    ${className}
  `;

  const style = color && !active ? { backgroundColor: `${color}20`, color } : undefined;

  if (isInteractive) {
    return (
      <button type="button" className={baseClasses} style={style} onClick={onClick}>
        {children}
      </button>
    );
  }

  return (
    <span className={baseClasses} style={style}>
      {children}
    </span>
  );
}
