"use client";

import { useEffect, useMemo } from "react";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { fetchKnowledgeItems } from "@/services/knowledge";
import { KnowledgeCard } from "@/components/knowledge/KnowledgeCard";
import { KnowledgeListRow } from "@/components/knowledge/KnowledgeListRow";
import { FilterToolbar } from "@/components/knowledge/FilterToolbar";
import { TagChip } from "@/components/knowledge/TagChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/SkeletonLoader";
import { useUploadStore } from "@/stores/uploadStore";

export default function LibraryPage() {
  const {
    items, viewMode, sortBy, filterFormat, filterSpace, filterTags,
    loading, setItems, setLoading, toggleFilterTag
  } = useKnowledgeStore();
  const setModalOpen = useUploadStore((s) => s.setModalOpen);

  useEffect(() => {
    setLoading(true);
    fetchKnowledgeItems().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [setItems, setLoading]);

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags.forEach((t) => tagSet.add(t.label)));
    return Array.from(tagSet);
  }, [items]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (filterFormat !== "all") {
      result = result.filter((i) => i.type === filterFormat);
    }
    if (filterSpace !== "all") {
      result = result.filter((i) => i.space === filterSpace);
    }
    if (filterTags.length > 0) {
      result = result.filter((i) =>
        filterTags.some((tag) => i.tags.some((t) => t.label === tag))
      );
    }

    // Sort
    switch (sortBy) {
      case "recent":
        result.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
        break;
    }

    return result;
  }, [items, filterFormat, filterSpace, filterTags, sortBy]);

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-main">知识库</h1>
        <span className="text-sm text-text-tert">{items.length} 个条目</span>
      </div>

      <div className="mb-4">
        <FilterToolbar />
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <TagChip
            label="全部"
            selected={filterTags.length === 0}
            onClick={() => {
              filterTags.forEach((t) => toggleFilterTag(t));
            }}
          />
          {allTags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              selected={filterTags.includes(tag)}
              onClick={() => toggleFilterTag(tag)}
            />
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        items.length === 0 ? (
          <EmptyState
            title="上传你的第一份资料"
            description="上传 PDF、Word、Markdown 或网页链接，AI 自动提炼、标注、索引"
            actionLabel="上传文件"
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <EmptyState
            title="当前筛选无结果"
            description="试试调整筛选条件或清除筛选"
          />
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <KnowledgeCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <KnowledgeListRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
