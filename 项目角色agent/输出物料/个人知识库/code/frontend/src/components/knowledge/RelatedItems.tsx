"use client";

import { FileFormatIcon, type FileFormat } from "@/components/ui/FileFormatIcon";
import Link from "next/link";

interface RelatedItem {
  id: string;
  title: string;
  type: string;
  relevance: number;
}

interface RelatedItemsProps {
  items: RelatedItem[];
}

export function RelatedItems({ items }: RelatedItemsProps) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-main mb-3">相关推荐</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/library/${item.id}`}
            className="flex items-center gap-3 p-3 bg-bg-sec rounded-[var(--radius-btn)] hover:bg-[#E2E8F0] transition-colors"
          >
            <FileFormatIcon format={item.type as FileFormat} size={18} />
            <span className="flex-1 text-sm text-text-main truncate">{item.title}</span>
            <span className="text-[10px] text-text-tert">
              {Math.round(item.relevance * 100)}% 相关
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
