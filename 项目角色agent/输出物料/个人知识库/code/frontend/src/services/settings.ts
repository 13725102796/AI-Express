import { apiJson, apiFetch } from "@/lib/api";

export interface UserSettings {
  name: string;
  email: string;
  avatar?: string;
  plan: "free" | "pro";
  usage: {
    documents: { used: number; limit: number };
    storage: { used: number; limit: number }; // in MB
    queries: { used: number; limit: number };
  };
}

const defaultUsage: UserSettings["usage"] = {
  documents: { used: 0, limit: 50 },
  storage: { used: 0, limit: 100 },
  queries: { used: 0, limit: 200 },
};

export async function fetchSettings(): Promise<UserSettings> {
  const data = await apiJson<any>("/api/auth/me");
  return {
    name: data.name ?? "",
    email: data.email ?? "",
    avatar: data.image ?? data.avatar,
    plan: data.plan ?? "free",
    usage: {
      documents: {
        used: data.usage?.documents?.used ?? defaultUsage.documents.used,
        limit: data.usage?.documents?.limit ?? defaultUsage.documents.limit,
      },
      storage: {
        used: data.usage?.storage?.used ?? defaultUsage.storage.used,
        limit: data.usage?.storage?.limit ?? defaultUsage.storage.limit,
      },
      queries: {
        used: data.usage?.queries?.used ?? defaultUsage.queries.used,
        limit: data.usage?.queries?.limit ?? defaultUsage.queries.limit,
      },
    },
  };
}

export async function updateProfile(updates: { name?: string }): Promise<void> {
  await apiFetch("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await apiFetch("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

export async function exportData(): Promise<Blob> {
  const res = await apiFetch("/api/users/me/export");
  return res.blob();
}

export async function deleteAccount(): Promise<void> {
  await apiFetch("/api/users/me", { method: "DELETE" });
}
