"use client";

import Link from "next/link";
import { FileFormatIcon, type FileFormat } from "@/components/ui/FileFormatIcon";
import { Badge } from "@/components/ui/Badge";
import type { KnowledgeItem } from "@/stores/knowledgeStore";
import { formatRelativeTime } from "@/lib/utils";

interface KnowledgeListRowProps {
  item: KnowledgeItem;
}

export function KnowledgeListRow({ item }: KnowledgeListRowProps) {
  return (
    <Link
      href={`/library/${item.id}`}
      className="flex items-center gap-4 px-4 py-3 bg-bg-card border border-border rounded-[var(--radius-btn)] hover:bg-bg-sec hover:shadow-[var(--shadow-card)] transition-all cursor-pointer"
    >
      <FileFormatIcon format={item.type as FileFormat} size={20} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-main truncate">{item.title}</p>
      </div>
      <div className="hidden md:flex items-center gap-2">
        {item.tags.slice(0, 2).map((tag) => (
          <Badge key={tag.label} variant={tag.isAI ? "ai" : "default"}>
            {tag.label}
          </Badge>
        ))}
      </div>
      <span className="text-xs text-text-tert w-20 text-right hidden sm:block">
        {item.fileSize || "-"}
      </span>
      <span className="text-xs text-text-tert w-24 text-right">
        {formatRelativeTime(item.uploadedAt)}
      </span>
    </Link>
  );
}
