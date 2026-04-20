/**
 * 积分 store：余额 / 签到状态 / 流水
 * 硬性约束：积分变更必须由后端返回后才更新（不乐观更新）
 */
import { defineStore } from "pinia";
import type {
  CheckinStatus,
  PointsTransaction,
} from "@/types/api";
import { pointsApi } from "@/services/points";

interface State {
  balance: number;
  checkinStatus: CheckinStatus | null;
  transactions: PointsTransaction[];
  txTotal: number;
  txPage: number;
  loading: boolean;
}

export const usePointsStore = defineStore("points", {
  state: (): State => ({
    balance: 0,
    checkinStatus: null,
    transactions: [],
    txTotal: 0,
    txPage: 1,
    loading: false,
  }),
  actions: {
    async fetchBalance() {
      const resp = await pointsApi.balance();
      this.balance = resp.data?.balance ?? 0;
      return this.balance;
    },
    async fetchCheckinStatus() {
      const resp = await pointsApi.checkinStatus();
      this.checkinStatus = resp.data ?? null;
      return this.checkinStatus;
    },
    async checkin() {
      const resp = await pointsApi.checkin();
      if (resp.data) {
        this.balance = resp.data.balance;
        if (this.checkinStatus) {
          this.checkinStatus.checked_in_today = true;
          this.checkinStatus.consecutive_days = resp.data.consecutive_days;
        }
      }
      return resp.data;
    },
    async fetchTransactions(page = 1, pageSize = 20) {
      this.loading = true;
      try {
        const resp = await pointsApi.transactions({
          page,
          page_size: pageSize,
        });
        if (resp.data) {
          if (page === 1) {
            this.transactions = resp.data.items;
          } else {
            this.transactions = this.transactions.concat(resp.data.items);
          }
          this.txTotal = resp.data.total;
          this.txPage = page;
        }
        return resp.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
