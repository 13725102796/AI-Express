import type { User } from "@/stores/authStore";
import { apiJson, apiFetch } from "@/lib/api";

interface AuthResponse {
  access_token: string;
  user: User;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const data = await apiJson<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("knowbase_token", data.access_token);
  return data.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const data = await apiJson<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("knowbase_token", data.access_token);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("knowbase_token");
  }
}

export async function getCurrentSession(): Promise<User | null> {
  const token = localStorage.getItem("knowbase_token");
  if (!token) return null;

  try {
    return await apiJson<User>("/api/auth/me");
  } catch {
    localStorage.removeItem("knowbase_token");
    return null;
  }
}
