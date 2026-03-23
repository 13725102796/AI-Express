"use client";

import { FileFormatIcon, type FileFormat } from "@/components/ui/FileFormatIcon";
import type { Citation } from "@/stores/chatStore";

interface SourceItemProps {
  citation: Citation;
}

export function SourceItem({ citation }: SourceItemProps) {
  const formatMap: Record<string, FileFormat> = {
    pdf: "pdf",
    word: "word",
    web: "web",
    markdown: "markdown",
    txt: "txt",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-[var(--radius-btn)] bg-bg-sec hover:bg-[#E2E8F0] transition-colors cursor-pointer">
      <FileFormatIcon format={formatMap[citation.sourceType] || "txt"} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-main truncate">
            {citation.sourceTitle}
          </p>
          <span className="text-[11px] text-accent font-semibold bg-accent-light px-1.5 rounded-full flex-shrink-0">
            [{citation.id}]
          </span>
        </div>
        <p className="text-xs text-text-sec mt-0.5 line-clamp-2 leading-relaxed">
          {citation.excerpt}
        </p>
        {citation.pageNum && (
          <p className="text-[11px] text-text-tert mt-1">第 {citation.pageNum} 页</p>
        )}
      </div>
      <span className="text-[10px] text-text-tert flex-shrink-0 mt-0.5">
        {Math.round(citation.confidence * 100)}%
      </span>
    </div>
  );
}
