interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded-[var(--radius-sm)] h-4",
    circular: "rounded-full",
    rectangular: "rounded-[var(--radius-md)]",
  };

  return (
    <div
      className={`animate-shimmer ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

/** Pre-built skeleton for a chat message bubble */
export function MessageSkeleton({ isAi = true }: { isAi?: boolean }) {
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"} mb-4`}>
      <div className={`max-w-[75%] ${isAi ? "" : ""}`}>
        <Skeleton
          variant="rectangular"
          className="h-16"
          width={isAi ? "260px" : "200px"}
        />
      </div>
    </div>
  );
}

/** Pre-built skeleton for a fossil card */
export function FossilSkeleton() {
  return (
    <div className="bg-surface-1 rounded-[var(--radius-md)] p-4 mb-3">
      <Skeleton variant="text" width="40%" className="mb-2" />
      <Skeleton variant="text" width="100%" className="mb-1" />
      <Skeleton variant="text" width="80%" className="mb-3" />
      <div className="flex gap-2">
        <Skeleton variant="text" width="60px" className="h-6" />
        <Skeleton variant="text" width="50px" className="h-6" />
      </div>
    </div>
  );
}
