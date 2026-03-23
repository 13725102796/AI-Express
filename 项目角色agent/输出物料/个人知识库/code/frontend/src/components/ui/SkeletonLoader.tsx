import { cn } from "@/lib/utils";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "circle" | "rect";
  width?: string;
  height?: string;
}

export function Skeleton({ className, variant = "rect", width, height }: SkeletonProps) {
  const variantStyles = {
    text: "h-4 rounded",
    card: "h-48 rounded-[var(--radius-card)]",
    circle: "rounded-full",
    rect: "rounded-[var(--radius-btn)]",
  };

  return (
    <div
      className={cn("animate-shimmer", variantStyles[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" variant="rect" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="w-16 h-5" variant="rect" />
        <Skeleton className="w-16 h-5" variant="rect" />
        <Skeleton className="w-16 h-5" variant="rect" />
      </div>
    </div>
  );
}
