"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full
        transition-colors duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
        ${checked ? "bg-primary" : "bg-surface-3"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 rounded-full bg-white shadow-sm
          transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}
