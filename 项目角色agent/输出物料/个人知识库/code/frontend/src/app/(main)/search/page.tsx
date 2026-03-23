"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { searchKnowledge } from "@/services/knowledge";
import type { KnowledgeItem } from "@/stores/knowledgeStore";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    searchKnowledge(query).then(({ items, total }) => {
      setResults(items);
      setTotal(total);
      setLoading(false);
    });
  }, [query]);

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-main">
          搜索结果
        </h1>
        {query && (
          <p className="text-sm text-text-sec mt-1">
            &ldquo;{query}&rdquo; 共找到 {total} 个结果
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-[var(--radius-card)] p-5 space-y-2">
              <Skeleton variant="text" className="w-3/4 h-4" />
              <Skeleton variant="text" className="w-full h-3" />
              <Skeleton variant="text" className="w-5/6 h-3" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          title="未找到相关内容"
          description={query ? `没有匹配"${query}"的结果，试试其他关键词` : "请输入搜索关键词"}
        />
      ) : (
        <div className="space-y-3">
          {results.map((item) => (
            <SearchResultCard key={item.id} item={item} query={query} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-3xl space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-[var(--radius-card)] p-5 space-y-2">
              <Skeleton variant="text" className="w-3/4 h-4" />
              <Skeleton variant="text" className="w-full h-3" />
              <Skeleton variant="text" className="w-5/6 h-3" />
            </div>
          ))}
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
