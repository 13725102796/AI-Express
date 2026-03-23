"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-dark hover:-translate-y-px hover:shadow-[0_4px_6px_rgba(37,99,235,0.2)] disabled:bg-bg-sec disabled:text-text-tert",
  secondary:
    "bg-bg-card text-text-main border border-border hover:bg-bg-sec hover:border-text-tert disabled:bg-bg-sec disabled:text-text-tert",
  ghost:
    "bg-transparent text-text-sec hover:bg-bg-sec hover:text-text-main disabled:text-text-tert",
  danger:
    "bg-error text-white hover:bg-[#DC2626] hover:-translate-y-px hover:shadow-[0_4px_6px_rgba(239,68,68,0.2)] disabled:bg-bg-sec disabled:text-text-tert",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      icon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-[var(--radius-btn)] transition-all duration-[var(--transition-hover)] cursor-pointer",
          "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
          "disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? <Spinner className="w-4 h-4" /> : icon}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
