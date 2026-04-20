/**
 * AI 解读 store：流式状态 + 当前会话缓冲
 * 硬性约束：SSE error.refunded > 0 时必须展示退积分 toast
 */
import { defineStore } from "pinia";
import type {
  ReadingReport,
  ReadingReportBrief,
  SSEDonePayload,
  SSEErrorPayload,
  SSEMetaPayload,
} from "@/types/api";
import { readingApi } from "@/services/reading";
import type { SSEHandle } from "@/utils/sse";
import { useUserStore } from "@/stores/user";
import { usePointsStore } from "@/stores/points";

export type ReadingPhase =
  | "idle"
  | "preparing"
  | "streaming"
  | "done"
  | "error";

interface State {
  phase: ReadingPhase;
  meta: SSEMetaPayload | null;
  doneInfo: SSEDonePayload | null;
  errorInfo: SSEErrorPayload | null;
  accText: string; // 累积文本
  handle: SSEHandle | null;
  reports: ReadingReportBrief[];
  reportsTotal: number;
  reportDetail: ReadingReport | null;
}

export const useReadingStore = defineStore("reading", {
  state: (): State => ({
    phase: "idle",
    meta: null,
    doneInfo: null,
    errorInfo: null,
    accText: "",
    handle: null,
    reports: [],
    reportsTotal: 0,
    reportDetail: null,
  }),
  actions: {
    startStream(templateId: string) {
      // 关闭上一次
      this.handle?.close?.();
      this.phase = "preparing";
      this.meta = null;
      this.doneInfo = null;
      this.errorInfo = null;
      this.accText = "";

      this.handle = readingApi.startStream(
        { template_id: templateId },
        {
          onMeta: (p) => {
            this.meta = p;
            this.phase = "streaming";
            // 立即同步真实余额到 user/points store（消费已落 DB）
            const us = useUserStore();
            const ps = usePointsStore();
            us.updatePoints(p.balance_after);
            ps.balance = p.balance_after;
            // 给用户显式提示扣费（首免/付费两种情况都有反馈）
            if (p.is_free_use) {
              uni.showToast({
                title: "首次推演免费，本次未消耗灵犀点数",
                icon: "none",
                duration: 1800,
              });
            } else if (p.points_spent > 0) {
              uni.showToast({
                title: `已消耗 ${p.points_spent} ¤  ·  余额 ${p.balance_after} ¤`,
                icon: "none",
                duration: 1800,
              });
            }
          },
          onChunk: (p) => {
            this.accText += p.text;
          },
          onDone: (p) => {
            this.doneInfo = p;
            this.phase = "done";
            // 兜底再同步一次余额（防止 meta 同步后期间被其它接口覆盖）
            if (this.meta) {
              useUserStore().updatePoints(this.meta.balance_after);
              usePointsStore().balance = this.meta.balance_after;
            }
          },
          onError: (p) => {
            this.errorInfo = p;
            this.phase = "error";
            // 失败时余额是退款后的最新值
            useUserStore().updatePoints(p.balance_after);
            usePointsStore().balance = p.balance_after;
            if (p.refunded > 0) {
              uni.showToast({
                title: `神谕推演失败，已退还 ${p.refunded} ¤`,
                icon: "none",
                duration: 3000,
              });
            }
          },
          onClose: () => {
            // 如果还没 done，视为意外中断
            if (this.phase === "streaming") {
              this.phase = "error";
              if (!this.errorInfo) {
                this.errorInfo = {
                  code: -1,
                  message: "连接中断",
                  refunded: 0,
                  balance_after: this.meta?.balance_after ?? 0,
                };
              }
            }
          },
        },
      );
    },
    stopStream() {
      this.handle?.close?.();
      this.handle = null;
    },
    reset() {
      this.stopStream();
      this.phase = "idle";
      this.meta = null;
      this.doneInfo = null;
      this.errorInfo = null;
      this.accText = "";
    },
    async fetchReports(page = 1, pageSize = 20) {
      const resp = await readingApi.reports(page, pageSize);
      if (resp.data) {
        this.reports = page === 1 ? resp.data.items : this.reports.concat(resp.data.items);
        this.reportsTotal = resp.data.total;
      }
      return resp.data;
    },
    async fetchReportDetail(id: string) {
      const resp = await readingApi.reportDetail(id);
      this.reportDetail = resp.data ?? null;
      return resp.data;
    },
  },
});
