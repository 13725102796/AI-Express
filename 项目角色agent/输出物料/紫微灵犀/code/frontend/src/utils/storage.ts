/**
 * 统一存储封装（uni.setStorageSync 兼容双端）
 * 小程序无 localStorage，所以不能直接用 window.localStorage
 */

const PREFIX = "ziwei_";

const key = (k: string) => PREFIX + k;

export function setItem(k: string, value: unknown): void {
  try {
    const v = typeof value === "string" ? value : JSON.stringify(value);
    uni.setStorageSync(key(k), v);
  } catch (e) {
    console.warn("[storage] setItem 失败", k, e);
  }
}

export function getItem<T = unknown>(k: string, fallback: T | null = null): T | null {
  try {
    const raw = uni.getStorageSync(key(k));
    if (!raw) return fallback;
    try {
      return JSON.parse(raw as string) as T;
    } catch {
      return raw as unknown as T;
    }
  } catch (e) {
    console.warn("[storage] getItem 失败", k, e);
    return fallback;
  }
}

export function removeItem(k: string): void {
  try {
    uni.removeStorageSync(key(k));
  } catch (e) {
    console.warn("[storage] removeItem 失败", k, e);
  }
}

export function clearAll(): void {
  try {
    uni.clearStorageSync();
  } catch (e) {
    console.warn("[storage] clearAll 失败", e);
  }
}

// 常量 key（全局唯一）
export const STORAGE_KEYS = {
  TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user_brief",
  PROFILE: "user_profile",
  CHART: "user_chart",
  ADMIN_TOKEN: "admin_token",
  ADMIN_REFRESH_TOKEN: "admin_refresh_token",
  ADMIN_BRIEF: "admin_brief",
} as const;
