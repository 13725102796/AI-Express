/**
 * 紫微灵犀 HTTP 请求封装
 * 基于 uni.request（兼容小程序 + H5）
 *
 * 特性：
 * 1) 自动附 Authorization: Bearer <token>
 * 2) 响应 401 自动清 token + reLaunch 到登录页
 * 3) 统一错误码映射（shared-types.md 第 4 节）
 * 4) Promise 化
 * 5) useAdminToken 选项：从 admin_token 取 token；401 时跳回 /pages-admin/login/login
 */
import { getItem, removeItem, STORAGE_KEYS } from "./storage";
import { errorMessage } from "@/types/errors";
import type { ApiResponse } from "@/types/api";

// 从环境变量读取 baseURL（vite 注入）
// 注意：uni-app 小程序场景下 import.meta.env 需要 vite 透传
const BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";

export interface RequestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  data?: any;
  params?: Record<string, any>;
  header?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean; // 跳过 token 注入（如登录接口）
  useAdminToken?: boolean; // 使用管理员 token
}

function buildUrl(url: string, params?: Record<string, any>): string {
  const full = /^https?:/i.test(url) ? url : BASE_URL + url;
  if (!params) return full;
  const qs = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .map(
      (k) => encodeURIComponent(k) + "=" + encodeURIComponent(String(params[k])),
    )
    .join("&");
  return qs ? (full.includes("?") ? full + "&" + qs : full + "?" + qs) : full;
}

export function request<T = unknown>(
  opts: RequestOptions,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    const header: Record<string, string> = {
      "Content-Type": "application/json",
      ...(opts.header || {}),
    };

    if (!opts.skipAuth) {
      const key = opts.useAdminToken
        ? STORAGE_KEYS.ADMIN_TOKEN
        : STORAGE_KEYS.TOKEN;
      const token = getItem<string>(key);
      if (token) {
        header["Authorization"] = `Bearer ${token}`;
      }
    }

    uni.request({
      url: buildUrl(opts.url, opts.params),
      method: opts.method || "GET",
      data: opts.data,
      header,
      timeout: opts.timeout || 30000,
      success: (res) => {
        const { statusCode, data } = res as any;
        // HTTP 层 401：清 token，跳登录
        if (statusCode === 401) {
          handleUnauthorized(opts.useAdminToken);
          reject({
            code: 10006,
            message: errorMessage(10006),
            data: null,
          } as ApiResponse<T>);
          return;
        }
        // HTTP 非 2xx 但 body 是 ApiResponse 结构时，交给业务层判
        if (statusCode < 200 || statusCode >= 500) {
          uni.showToast({
            title: "网络错误，请稍后再试",
            icon: "none",
          });
          reject({
            code: statusCode,
            message: `HTTP ${statusCode}`,
            data: null,
          } as ApiResponse<T>);
          return;
        }
        // 业务 code
        const body = (data || {}) as ApiResponse<T>;
        if (body.code === undefined || body.code === null) {
          // 后端返回了裸对象（比如 paipan 端点），包一层
          resolve({
            code: 0,
            data: (data as unknown) as T,
            message: "success",
          });
          return;
        }
        if (body.code === 0) {
          resolve(body);
        } else {
          // 业务 code 非 0 但 HTTP 401 也可能落在这（后端某些路径直接返回 200 + code=10006）
          if (body.code === 10006 || body.code === 90001) {
            handleUnauthorized(opts.useAdminToken);
          }
          // 业务错误：toast 提示（可由调用方覆盖）
          const msg = body.message || errorMessage(body.code);
          if (!opts.header?.["X-Silent"]) {
            uni.showToast({ title: msg, icon: "none" });
          }
          reject(body);
        }
      },
      fail: (err) => {
        console.error("[request] 网络失败", err);
        uni.showToast({ title: "网络异常，请检查连接", icon: "none" });
        reject({
          code: -1,
          message: "网络异常",
          data: null,
        } as ApiResponse<T>);
      },
    });
  });
}

function handleUnauthorized(isAdmin?: boolean): void {
  if (isAdmin) {
    removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    removeItem(STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
    removeItem(STORAGE_KEYS.ADMIN_BRIEF);
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (current && (current as any).route?.includes("pages-admin/login")) return;
    uni.reLaunch({ url: "/pages-admin/login/login" });
    return;
  }
  removeItem(STORAGE_KEYS.TOKEN);
  removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  removeItem(STORAGE_KEYS.USER);
  // 避免在登录页上二次跳转
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current && (current as any).route?.includes("login")) return;
  uni.reLaunch({ url: "/pages/login/login" });
}

// 便捷方法
export const http = {
  get<T = unknown>(url: string, params?: Record<string, any>, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "GET", params, ...opts });
  },
  post<T = unknown>(url: string, data?: any, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "POST", data, ...opts });
  },
  put<T = unknown>(url: string, data?: any, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "PUT", data, ...opts });
  },
  patch<T = unknown>(url: string, data?: any, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "PATCH", data, ...opts });
  },
  delete<T = unknown>(url: string, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "DELETE", ...opts });
  },
};

/**
 * 管理员专用 HTTP：自动使用 admin_token，401 时跳 admin login
 */
export const adminHttp = {
  get<T = unknown>(url: string, params?: Record<string, any>, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "GET", params, useAdminToken: true, ...opts });
  },
  post<T = unknown>(url: string, data?: any, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "POST", data, useAdminToken: true, ...opts });
  },
  put<T = unknown>(url: string, data?: any, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "PUT", data, useAdminToken: true, ...opts });
  },
  patch<T = unknown>(url: string, data?: any, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "PATCH", data, useAdminToken: true, ...opts });
  },
  delete<T = unknown>(url: string, opts: Partial<RequestOptions> = {}) {
    return request<T>({ url, method: "DELETE", useAdminToken: true, ...opts });
  },
};

export { BASE_URL };
