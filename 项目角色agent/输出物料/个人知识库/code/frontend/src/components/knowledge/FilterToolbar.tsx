"use client";

import { cn } from "@/lib/utils";
import { useKnowledgeStore, type ViewMode, type SortBy } from "@/stores/knowledgeStore";

const formats = [
  { value: "all", label: "全部格式" },
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "web", label: "网页" },
  { value: "markdown", label: "Markdown" },
  { value: "txt", label: "纯文本" },
];

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "recent", label: "最近上传" },
  { value: "oldest", label: "最早上传" },
  { value: "title", label: "标题 A-Z" },
];

export function FilterToolbar() {
  const { viewMode, sortBy, filterFormat, setViewMode, setSortBy, setFilterFormat } =
    useKnowledgeStore();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Format filter */}
      <select
        value={filterFormat}
        onChange={(e) => setFilterFormat(e.target.value)}
        className="h-8 px-2 text-xs bg-bg-card border border-border rounded-[var(--radius-btn)] text-text-sec focus:outline-none focus:shadow-[var(--shadow-focus)]"
      >
        {formats.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortBy)}
        className="h-8 px-2 text-xs bg-bg-card border border-border rounded-[var(--radius-btn)] text-text-sec focus:outline-none focus:shadow-[var(--shadow-focus)]"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* View toggle */}
      <div className="flex border border-border rounded-[var(--radius-btn)] overflow-hidden ml-auto">
        {(["grid", "list"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === mode ? "bg-primary text-white" : "bg-bg-card text-text-tert hover:text-text-sec"
            )}
            aria-label={mode === "grid" ? "卡片视图" : "列表视图"}
          >
            {mode === "grid" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
