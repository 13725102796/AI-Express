import { http } from "@/utils/request";
import { openSSE, type SSEHandle } from "@/utils/sse";
import type {
  GetReportResp,
  ListReportsResp,
  SSEChunkPayload,
  SSEDonePayload,
  SSEErrorPayload,
  SSEMetaPayload,
  StartReadingReq,
} from "@/types/api";

export interface ReadingStreamCallbacks {
  onMeta?: (p: SSEMetaPayload) => void;
  onChunk?: (p: SSEChunkPayload) => void;
  onDone?: (p: SSEDonePayload) => void;
  onError?: (p: SSEErrorPayload) => void;
  onClose?: () => void;
}

export const readingApi = {
  /** 打开流式解读 SSE */
  startStream(body: StartReadingReq, cb: ReadingStreamCallbacks): SSEHandle {
    return openSSE({
      url: "/api/v1/reading/start",
      method: "POST",
      body,
      onEvent: (event, payload) => {
        switch (event) {
          case "meta":
            cb.onMeta?.(payload as SSEMetaPayload);
            break;
          case "chunk":
            cb.onChunk?.(payload as SSEChunkPayload);
            break;
          case "done":
            cb.onDone?.(payload as SSEDonePayload);
            break;
          case "error":
            cb.onError?.(payload as SSEErrorPayload);
            break;
          default:
            console.warn("[reading] 未知 SSE 事件", event, payload);
        }
      },
      onError: (err) => {
        cb.onError?.({
          code: err.code,
          message: err.message,
          refunded: 0,
          balance_after: 0,
        });
      },
      onClose: () => cb.onClose?.(),
    });
  },

  reports: (page = 1, pageSize = 20) =>
    http.get<ListReportsResp["data"]>("/api/v1/reading/reports", {
      page,
      page_size: pageSize,
    }),

  reportDetail: (id: string) =>
    http.get<GetReportResp["data"]>(`/api/v1/reading/reports/${id}`),
};
