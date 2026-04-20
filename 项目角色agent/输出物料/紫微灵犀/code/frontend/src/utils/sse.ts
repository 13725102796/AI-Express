/**
 * 紫微灵犀 SSE 流式封装（跨端）
 *
 * H5：用原生 fetch + ReadableStream 实现（兼容 EventSource 语法但可传 POST + headers）
 * 小程序：用 uni.request 的 onChunkReceived（基础库 2.10.0+）或降级到 enableChunked
 *
 * SSE 事件名约定（与后端 ziwei_app/services/reading_service.py 对齐）：
 *   event: meta / chunk / done / error
 *   data:  JSON（对应 types/api.ts SSE*Payload）
 *
 * 技术难点 2：uni-app 小程序 SSE 兼容方案
 */
import { getItem, STORAGE_KEYS } from "./storage";
import { BASE_URL } from "./request";

export type SSEEventName = "meta" | "chunk" | "done" | "error";

export interface SSEClientOptions {
  url: string; // 相对路径，如 /api/v1/reading/start
  method?: "POST" | "GET";
  body?: unknown;
  headers?: Record<string, string>;
  onEvent?: (event: SSEEventName, payload: any) => void;
  onError?: (err: { code: number; message: string }) => void;
  onClose?: () => void;
}

export interface SSEHandle {
  close: () => void;
}

/**
 * 核心统一入口。内部按平台分发。
 */
export function openSSE(opts: SSEClientOptions): SSEHandle {
  // #ifdef H5
  return openSSE_H5(opts);
  // #endif
  // #ifdef MP-WEIXIN
  return openSSE_MPWeixin(opts);
  // #endif
  // #ifndef H5 || MP-WEIXIN
  console.warn("[sse] 当前平台暂未实现 SSE");
  return { close: () => undefined };
  // #endif
}

// ---------- H5 ----------
function openSSE_H5(opts: SSEClientOptions): SSEHandle {
  // #ifdef H5
  const token = getItem<string>(STORAGE_KEYS.TOKEN);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...(opts.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const full = /^https?:/i.test(opts.url) ? opts.url : BASE_URL + opts.url;
  fetch(full, {
    method: opts.method || "POST",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        opts.onError?.({ code: res.status, message: `HTTP ${res.status}` });
        opts.onClose?.();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || "";
        for (const part of parts) {
          parseSSEBlock(part, opts.onEvent);
        }
      }
      if (buffer) parseSSEBlock(buffer, opts.onEvent);
      opts.onClose?.();
    })
    .catch((err) => {
      if (err?.name === "AbortError") {
        opts.onClose?.();
        return;
      }
      opts.onError?.({ code: -1, message: err?.message || "SSE 连接异常" });
      opts.onClose?.();
    });

  return {
    close: () => controller.abort(),
  };
  // #endif
  return { close: () => undefined };
}

// ---------- 小程序（微信） ----------
function openSSE_MPWeixin(opts: SSEClientOptions): SSEHandle {
  // #ifdef MP-WEIXIN
  const token = getItem<string>(STORAGE_KEYS.TOKEN);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...(opts.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const full = /^https?:/i.test(opts.url) ? opts.url : BASE_URL + opts.url;

  // 使用 wx.request 的 enableChunked（基础库 2.20.1+）
  const task = (wx as any).request({
    url: full,
    method: opts.method || "POST",
    data: opts.body,
    header: headers,
    enableChunked: true,
    responseType: "text",
    success: () => {
      opts.onClose?.();
    },
    fail: (err: any) => {
      opts.onError?.({ code: -1, message: err?.errMsg || "SSE 连接失败" });
      opts.onClose?.();
    },
  });

  let buffer = "";
  const decoder = new TextDecoder("utf-8");
  if (task && typeof task.onChunkReceived === "function") {
    task.onChunkReceived((res: { data: ArrayBuffer }) => {
      buffer += decoder.decode(new Uint8Array(res.data), { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";
      for (const part of parts) {
        parseSSEBlock(part, opts.onEvent);
      }
    });
  } else {
    console.warn("[sse] 小程序基础库过低，不支持 onChunkReceived");
    opts.onError?.({
      code: -2,
      message: "小程序基础库过低，无法播放流式解读",
    });
  }

  return {
    close: () => {
      try {
        task?.abort?.();
      } catch (e) {
        console.warn("[sse] abort 失败", e);
      }
    },
  };
  // #endif
  return { close: () => undefined };
}

// ---------- SSE 帧解析 ----------
function parseSSEBlock(
  block: string,
  onEvent?: (event: SSEEventName, payload: any) => void,
): void {
  if (!block.trim()) return;
  let event: SSEEventName = "chunk";
  let dataRaw = "";
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim() as SSEEventName;
    } else if (line.startsWith("data:")) {
      dataRaw += line.slice(5).trim();
    }
    // 忽略 id: / retry: 行
  }
  if (!dataRaw) return;
  let payload: unknown = dataRaw;
  try {
    payload = JSON.parse(dataRaw);
  } catch {
    /* 原样传 */
  }
  try {
    onEvent?.(event, payload);
  } catch (e) {
    console.error("[sse] onEvent 回调异常", e);
  }
}
