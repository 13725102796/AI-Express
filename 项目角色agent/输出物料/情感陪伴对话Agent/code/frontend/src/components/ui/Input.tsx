"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, label, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-text-secondary mb-1.5 font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-3 bg-surface-1 text-text-primary
            border-b-2 border-border
            focus:border-border-focus focus:outline-none
            placeholder:text-text-tertiary
            transition-colors duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
            text-base rounded-[var(--radius-sm)]
            ${error ? "border-error" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-error animate-float-up">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
