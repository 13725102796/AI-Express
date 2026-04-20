/**
 * 命盘 store：当前用户命盘数据缓存
 */
import { defineStore } from "pinia";
import type { ChartData, ChartPalace } from "@/types/api";
import { chartApi } from "@/services/chart";
import { getItem, setItem, STORAGE_KEYS } from "@/utils/storage";

interface State {
  chart: ChartData | null;
  loading: boolean;
  error: string | null;
}

export const useChartStore = defineStore("chart", {
  state: (): State => ({
    chart: getItem<ChartData>(STORAGE_KEYS.CHART),
    loading: false,
    error: null,
  }),
  getters: {
    hasChart: (s): boolean => !!s.chart,
    palaces: (s) => s.chart?.chart_json?.palaces || [],
    /** 地支 → 宫位 索引，供 4x4 网格按位置取宫 */
    palacesByBranch: (s): Record<string, ChartPalace> => {
      const map: Record<string, ChartPalace> = {};
      for (const p of s.chart?.chart_json?.palaces || []) {
        if (p.earthlyBranch) map[p.earthlyBranch] = p;
      }
      return map;
    },
    basic: (s) => {
      if (!s.chart?.chart_json) return null;
      const c = s.chart.chart_json;
      return {
        gender: c.gender,
        lunarDate: c.lunarDate,
        time: c.time,
        chineseDate: c.chineseDate,
        fiveElementsClass: c.fiveElementsClass,
        soulMaster: c.soulMaster,
        bodyMaster: c.bodyMaster,
        douJun: c.douJun,
        earthlyBranchOfBodyPalace: c.earthlyBranchOfBodyPalace,
      };
    },
  },
  actions: {
    async fetchMyChart() {
      this.loading = true;
      this.error = null;
      try {
        const resp = await chartApi.me();
        this.chart = resp.data ?? null;
        if (this.chart) setItem(STORAGE_KEYS.CHART, this.chart);
        return this.chart;
      } catch (e: any) {
        this.error = e?.message || "获取命盘失败";
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async regenerate() {
      this.loading = true;
      try {
        const resp = await chartApi.generate();
        this.chart = resp.data ?? null;
        if (this.chart) setItem(STORAGE_KEYS.CHART, this.chart);
        return this.chart;
      } finally {
        this.loading = false;
      }
    },
    clear() {
      this.chart = null;
      this.error = null;
    },
  },
});
