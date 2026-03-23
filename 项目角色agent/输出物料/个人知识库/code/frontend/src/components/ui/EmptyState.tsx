import { Button } from "./Button";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon ? (
        <div className="mb-4">{icon}</div>
      ) : (
        <svg
          className="mb-4 text-text-tert"
          width="80"
          height="80"
          viewBox="0 0 120 120"
          fill="none"
        >
          <rect x="20" y="30" width="80" height="60" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="60" cy="55" r="12" stroke="currentColor" strokeWidth="2" />
          <path d="M56 55h8M60 51v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M35 80l15-15M85 80L70 65" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </svg>
      )}
      <h3 className="text-lg font-semibold text-text-main mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-sec mb-4 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
