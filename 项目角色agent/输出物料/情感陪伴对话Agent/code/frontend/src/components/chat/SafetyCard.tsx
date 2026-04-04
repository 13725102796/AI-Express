"use client";

import { SAFETY_RESOURCES } from "@/types/chat";

export function SafetyCard() {
  return (
    <div className="mx-4 my-3 p-4 bg-accent-subtle rounded-[var(--radius-lg)] border border-accent/10 animate-float-up">
      <p className="text-sm text-text-primary font-medium mb-3">
        如果你正在经历困难，这些资源可以帮到你：
      </p>
      <div className="space-y-2">
        {SAFETY_RESOURCES.map((resource) => (
          <a
            key={resource.phone}
            href={`tel:${resource.phone}`}
            className="flex items-center justify-between p-2.5 bg-surface-0 rounded-[var(--radius-md)]
              hover:bg-surface-1 transition-colors duration-[var(--duration-fast)]"
          >
            <span className="text-sm text-text-primary">{resource.name}</span>
            <span className="text-sm text-accent font-medium">{resource.phone}</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-text-tertiary text-center">
        留白不是专业心理咨询服务。如果你正在经历严重的心理困扰，请寻求专业帮助。
      </p>
    </div>
  );
}
