"use client";

interface CitationTooltipProps {
  index: number;
}

export function CitationTooltip({ index }: CitationTooltipProps) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-bg-card border border-border rounded-[var(--radius-card)] shadow-[var(--shadow-modal)] p-3 z-50">
      <p className="text-xs font-medium text-text-main mb-1">
        引用来源 [{index}]
      </p>
      <p className="text-xs text-text-sec leading-relaxed line-clamp-3">
        此处显示引用段落的预览内容。悬浮查看来源摘要，点击跳转到原文详情页面。
      </p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
        <div className="w-2 h-2 bg-bg-card border-b border-r border-border rotate-45 -translate-y-1" />
      </div>
    </div>
  );
}
