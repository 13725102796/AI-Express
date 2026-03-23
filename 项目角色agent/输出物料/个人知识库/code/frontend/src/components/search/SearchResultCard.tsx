"use client";

import Link from "next/link";
import { FileFormatIcon, type FileFormat } from "@/components/ui/FileFormatIcon";
import { Badge } from "@/components/ui/Badge";
import type { KnowledgeItem } from "@/stores/knowledgeStore";
import { formatRelativeTime } from "@/lib/utils";

interface SearchResultCardProps {
  item: KnowledgeItem;
  query?: string;
}

function highlightText(text: string, query?: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query?.toLowerCase() ? (
      <mark key={i} className="bg-accent-light text-text-main px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SearchResultCard({ item, query }: SearchResultCardProps) {
  return (
    <Link
      href={`/library/${item.id}`}
      className="block bg-bg-card border border-border rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all"
    >
      <div className="flex items-start gap-3">
        <FileFormatIcon format={item.type as FileFormat} size={22} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-main mb-1">
            {highlightText(item.title, query)}
          </h3>
          <p className="text-[13px] text-text-sec leading-relaxed line-clamp-2 mb-2">
            {highlightText(item.summary, query)}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.label} variant={tag.isAI ? "ai" : "default"}>
                {tag.label}
              </Badge>
            ))}
            <span className="text-xs text-text-tert ml-auto">
              {formatRelativeTime(item.uploadedAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
