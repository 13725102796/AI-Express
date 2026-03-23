"use client";

import Link from "next/link";
import { FileFormatIcon, type FileFormat } from "@/components/ui/FileFormatIcon";
import { Badge } from "@/components/ui/Badge";
import type { KnowledgeItem } from "@/stores/knowledgeStore";
import { formatRelativeTime } from "@/lib/utils";

interface KnowledgeCardProps {
  item: KnowledgeItem;
}

export function KnowledgeCard({ item }: KnowledgeCardProps) {
  return (
    <Link
      href={`/library/${item.id}`}
      className="block bg-bg-card border border-border rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-px cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <FileFormatIcon format={item.type as FileFormat} size={24} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-main line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
        </div>
      </div>

      {/* Summary */}
      <p className="text-[13px] text-text-sec leading-relaxed line-clamp-2 mb-3">
        {item.summary}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {item.tags.slice(0, 3).map((tag) => (
          <Badge key={tag.label} variant={tag.isAI ? "ai" : "default"}>
            {tag.label}
          </Badge>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-tert">
        <span>{formatRelativeTime(item.uploadedAt)}</span>
        <span>{item.fileSize || item.originalUrl ? "网页" : ""}</span>
      </div>

      {/* Parsing state */}
      {item.status === "parsing" && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-accent">
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            解析中...
          </div>
        </div>
      )}
    </Link>
  );
}
