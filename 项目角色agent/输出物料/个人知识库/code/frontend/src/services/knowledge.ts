import type { KnowledgeItem } from "@/stores/knowledgeStore";
import { apiJson, apiFetch } from "@/lib/api";
import { formatFileSize } from "@/lib/utils";

interface PaginatedResponse {
  items: KnowledgeItem[];
  total: number;
}

/**
 * Map backend API item fields to frontend KnowledgeItem shape.
 * Backend returns: {id, title, file_name, file_type, file_size, status, created_at, updated_at, tags, summary, ...}
 * Frontend expects: {id, title, type, fileSize, summary, tags, space, uploadedAt, status, ...}
 */
function mapApiItem(raw: any): KnowledgeItem {
  // Normalise tags: backend may return string[] or {label, isAI}[]
  const rawTags = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = rawTags.map((t: any) =>
    typeof t === "string" ? { label: t, isAI: false } : { label: t.label ?? String(t), isAI: !!t.isAI }
  );

  return {
    id: raw.id ?? "",
    title: raw.title ?? raw.file_name ?? "",
    type: raw.file_type ?? raw.type ?? "txt",
    fileSize: raw.fileSize ?? (typeof raw.file_size === "number" ? formatFileSize(raw.file_size) : raw.file_size ?? null),
    summary: raw.summary ?? raw.matched_paragraph ?? "",
    tags,
    space: raw.space ?? raw.space_id ?? "",
    uploadedAt: raw.uploadedAt ?? raw.created_at ?? raw.updated_at ?? "",
    status: raw.status ?? "ready",
    pageCount: raw.pageCount ?? raw.page_count,
    originalUrl: raw.originalUrl ?? raw.original_url,
    content: raw.content,
  };
}

export async function fetchKnowledgeItems(params?: {
  page?: number;
  pageSize?: number;
  space?: string;
  type?: string;
}): Promise<KnowledgeItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params?.space) searchParams.set("space", params.space);
  if (params?.type) searchParams.set("type", params.type);

  const query = searchParams.toString();
  const path = `/api/documents${query ? `?${query}` : ""}`;

  try {
    const data = await apiJson<any>(path);
    let list: any[];
    if (Array.isArray(data)) list = data;
    else if (data?.items && Array.isArray(data.items)) list = data.items;
    else list = [];
    return list.map(mapApiItem);
  } catch {
    return [];
  }
}

export async function fetchKnowledgeItem(id: string): Promise<KnowledgeItem | null> {
  try {
    const data = await apiJson<any>(`/api/documents/${id}`);
    // API 返回 extracted_content（段落列表），前端期望 content（字符串）
    if (data.extracted_content && !data.content) {
      if (Array.isArray(data.extracted_content)) {
        data.content = data.extracted_content
          .map((p: any) => (p.heading ? `## ${p.heading}\n` : '') + (p.content || ''))
          .join('\n\n');
      } else {
        data.content = String(data.extracted_content);
      }
    }
    return mapApiItem(data);
  } catch {
    return null;
  }
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
}

export async function updateTags(id: string, tags: { label: string; isAI: boolean }[]): Promise<void> {
  await apiFetch(`/api/documents/${id}/tags`, {
    method: "PATCH",
    body: JSON.stringify({ tags }),
  });
}

export async function searchKnowledge(
  query: string,
  filters?: { format?: string; space?: string }
): Promise<{ items: KnowledgeItem[]; total: number }> {
  const searchParams = new URLSearchParams({ q: query });
  if (filters?.format) searchParams.set("format", filters.format);
  if (filters?.space) searchParams.set("space", filters.space);

  try {
    const data = await apiJson<any>(
      `/api/documents/search?${searchParams.toString()}`
    );
    // API returns {query, total, results: [...], search_mode}
    const results = Array.isArray(data?.results) ? data.results : [];
    const items = results.map(mapApiItem);
    return { items, total: data?.total ?? items.length };
  } catch {
    return { items: [], total: 0 };
  }
}
