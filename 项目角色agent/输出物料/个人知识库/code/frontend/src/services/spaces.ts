import { apiJson, apiFetch } from "@/lib/api";

export interface Space {
  id: string;
  name: string;
  description?: string;
  docCount: number;
  color: string;
  createdAt: string;
}

// Default color palette for spaces without a color
const defaultColors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

function mapApiSpace(raw: any, index: number): Space {
  return {
    id: raw.id ?? "",
    name: raw.name ?? "",
    description: raw.description ?? "",
    docCount: raw.docCount ?? raw.doc_count ?? 0,
    color: raw.color ?? defaultColors[index % defaultColors.length],
    createdAt: raw.createdAt ?? raw.created_at ?? "",
  };
}

export async function fetchSpaces(): Promise<Space[]> {
  try {
    const data = await apiJson<any>("/api/spaces");
    // 后端可能返回数组或 {items: [...]}
    let list: any[];
    if (Array.isArray(data)) list = data;
    else if (data?.items && Array.isArray(data.items)) list = data.items;
    else list = [];
    return list.map(mapApiSpace);
  } catch {
    return [];
  }
}

export async function createSpace(name: string, description?: string): Promise<Space> {
  return apiJson<Space>("/api/spaces", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function updateSpace(id: string, updates: Partial<Space>): Promise<Space> {
  return apiJson<Space>(`/api/spaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteSpace(id: string): Promise<void> {
  await apiFetch(`/api/spaces/${id}`, { method: "DELETE" });
}
