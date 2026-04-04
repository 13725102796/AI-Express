"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary animate-float-up">
      <span>留白在想</span>
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-breathing" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-breathing" style={{ animationDelay: "200ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-breathing" style={{ animationDelay: "400ms" }} />
      </span>
    </div>
  );
}
