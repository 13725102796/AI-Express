/**
 * 模板 store：列表 / 详情 / 我的已解锁
 */
import { defineStore } from "pinia";
import type { PromptTemplate, UserTemplate } from "@/types/api";
import { templateApi } from "@/services/templates";

interface State {
  list: PromptTemplate[];
  total: number;
  detailMap: Record<string, PromptTemplate>;
  myList: UserTemplate[];
  myTotal: number;
  loading: boolean;
}

export const useTemplatesStore = defineStore("templates", {
  state: (): State => ({
    list: [],
    total: 0,
    detailMap: {},
    myList: [],
    myTotal: 0,
    loading: false,
  }),
  actions: {
    async fetchList(page = 1, pageSize = 20) {
      this.loading = true;
      try {
        const resp = await templateApi.list({ page, page_size: pageSize });
        if (resp.data) {
          this.list = page === 1 ? resp.data.items : this.list.concat(resp.data.items);
          this.total = resp.data.total;
        }
        return resp.data;
      } finally {
        this.loading = false;
      }
    },
    async fetchDetail(id: string) {
      const resp = await templateApi.detail(id);
      if (resp.data) this.detailMap[id] = resp.data;
      return resp.data;
    },
    async unlock(id: string) {
      const resp = await templateApi.unlock(id);
      if (resp.data && this.detailMap[id]) {
        this.detailMap[id].is_unlocked = true;
      }
      return resp.data;
    },
    async fetchMy(page = 1, pageSize = 20) {
      const resp = await templateApi.myTemplates({ page, page_size: pageSize });
      if (resp.data) {
        this.myList = page === 1 ? resp.data.items : this.myList.concat(resp.data.items);
        this.myTotal = resp.data.total;
      }
      return resp.data;
    },
  },
});
