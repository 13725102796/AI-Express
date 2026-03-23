"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchKnowledgeItem } from "@/services/knowledge";
import type { KnowledgeItem } from "@/stores/knowledgeStore";
import { FileFormatIcon, type FileFormat } from "@/components/ui/FileFormatIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContentViewer } from "@/components/knowledge/ContentViewer";
import { PdfPreview } from "@/components/knowledge/PdfPreview";
import { RelatedItems } from "@/components/knowledge/RelatedItems";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteKnowledgeItem } from "@/services/knowledge";
import { formatRelativeTime } from "@/lib/utils";

const mockRelated = [
  { id: "ki-003", title: "竞品功能对比矩阵", type: "word", relevance: 0.87 },
  { id: "ki-004", title: "RAG 系统优化实践", type: "markdown", relevance: 0.72 },
  { id: "ki-006", title: "Embedding 模型性能评测", type: "web", relevance: 0.65 },
];

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    fetchKnowledgeItem(id).then((data) => {
      setItem(data);
      setLoading(false);
    });
  }, [params.id]);

  const handleDelete = async () => {
    if (!item) return;
    await deleteKnowledgeItem(item.id);
    toast("success", "已删除");
    router.push("/library");
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" variant="text" />
        <Skeleton className="h-4 w-96" variant="text" />
        <Skeleton className="h-64 w-full" variant="card" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-4 md:p-6 text-center py-16">
        <p className="text-text-sec">未找到该知识条目</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/library")}>
          返回知识库
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-text-sec hover:text-text-main transition-colors mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15,18 9,12 15,6" />
        </svg>
        返回
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <FileFormatIcon format={item.type as FileFormat} size={36} />
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-text-main mb-2">{item.title}</h1>
          <div className="flex items-center gap-4 text-xs text-text-tert flex-wrap">
            <span>{formatRelativeTime(item.uploadedAt)}</span>
            {item.fileSize && <span>{item.fileSize}</span>}
            {item.pageCount && <span>{item.pageCount} 页</span>}
            <span className="text-text-sec">{item.space}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            下载
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
            删除
          </Button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {item.tags.map((tag) => (
          <Badge key={tag.label} variant={tag.isAI ? "ai" : "default"}>
            {tag.label}
          </Badge>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-bg-sec rounded-[var(--radius-card)] p-4 mb-6">
        <h3 className="text-xs font-medium text-text-tert mb-1.5">AI 摘要</h3>
        <p className="text-sm text-text-main leading-relaxed">{item.summary}</p>
      </div>

      {/* Content */}
      <div className="mb-8">
        {item.type === "pdf" ? (
          <PdfPreview title={item.title} pageCount={item.pageCount} />
        ) : (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
            <ContentViewer content={item.content || "暂无提取内容"} />
          </div>
        )}
      </div>

      {/* Related */}
      <RelatedItems items={mockRelated} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="确认删除"
        description={`确定要删除"${item.title}"吗？此操作不可撤销。`}
        confirmText="删除"
        danger
      />
    </div>
  );
}
