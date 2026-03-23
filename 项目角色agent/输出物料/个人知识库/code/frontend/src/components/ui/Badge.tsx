import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type BadgeVariant = "ai" | "format" | "status" | "default";

export interface BadgeProps {
  variant?: BadgeVariant;
  color?: string;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  ai: "bg-accent-light text-[#B45309] border border-[#FDE68A]",
  format: "border",
  status: "border",
  default: "bg-bg-sec text-text-sec border border-border",
};

export function Badge({ variant = "default", color, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-[var(--radius-badge)]",
        variantStyles[variant],
        className
      )}
      style={color ? { backgroundColor: `${color}15`, color, borderColor: `${color}30` } : undefined}
    >
      {variant === "ai" && (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z" />
        </svg>
      )}
      {children}
    </span>
  );
}
