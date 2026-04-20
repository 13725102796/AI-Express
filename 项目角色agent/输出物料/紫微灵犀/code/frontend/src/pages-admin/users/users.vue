<template>
  <BaseAdminShell active="users" topTitle="缘主管理（仅查看）">
    <text class="page-title">缘主管理</text>

    <!-- 操作条 -->
    <view class="action-bar">
      <input
        class="search-input"
        placeholder="按昵称/手机号搜索..."
        :value="keyword"
        confirm-type="search"
        @input="onKeywordInput"
        @confirm="search"
      />
      <view class="btn-ghost" @click="search">
        <text>搜索</text>
      </view>
      <view class="btn-ghost" @click="reset">
        <text>重置</text>
      </view>
      <text class="hint">共 {{ total }} 位缘主</text>
    </view>

    <!-- 表格 -->
    <view class="table-wrap">
      <view class="table-head">
        <view class="cell mark">时空印记</view>
        <view class="cell nick">昵称</view>
        <view class="cell phone">手机号</view>
        <view class="cell date">注册时间</view>
        <view class="cell pts">灵犀点数</view>
        <view class="cell unlock">已启封</view>
        <view class="cell rep">神谕印记</view>
        <view class="cell inv">引灵数</view>
      </view>
      <view v-if="loading && !list.length" class="empty-row">
        <text>正在载入...</text>
      </view>
      <view v-else-if="!list.length" class="empty-row">
        <text>暂无缘主数据</text>
      </view>
      <view v-else>
        <view v-for="u in list" :key="u.id" class="table-row">
          <view class="cell mark">{{ spaceMark(u.id) }}</view>
          <view class="cell nick">{{ u.nickname }}</view>
          <view class="cell phone">{{ u.phone_masked }}</view>
          <view class="cell date">{{ formatDate(u.created_at) }}</view>
          <view class="cell pts point-cell">{{ u.points_balance.toLocaleString() }} ¤</view>
          <view class="cell unlock">{{ u.unlocks_count }}</view>
          <view class="cell rep">{{ u.reports_count }}</view>
          <view class="cell inv">--</view>
        </view>
      </view>
    </view>

    <!-- 分页 -->
    <view class="pagination" v-if="totalPages > 1">
      <view
        class="pg-btn"
        :class="{ disabled: page <= 1 }"
        @click="gotoPage(page - 1)"
      >
        <text>‹</text>
      </view>
      <view
        v-for="p in pageList"
        :key="p"
        class="pg-btn"
        :class="{ active: p === page }"
        @click="gotoPage(p)"
      >
        <text>{{ p }}</text>
      </view>
      <view
        class="pg-btn"
        :class="{ disabled: page >= totalPages }"
        @click="gotoPage(page + 1)"
      >
        <text>›</text>
      </view>
    </view>
  </BaseAdminShell>
</template>

<script setup lang="ts">
/**
 * A03 用户管理（仅查看）
 * - 搜索（昵称/手机号）
 * - 分页表格
 */
import { computed, onMounted, ref } from "vue";
import { ensureAdminAuth } from "@/utils/admin-guard";
import { adminApi } from "@/services/admin";
import type { AdminUserView } from "@/types/api";

const PAGE_SIZE = 20;

const loading = ref(false);
const keyword = ref("");
const list = ref<AdminUserView[]>([]);
const total = ref(0);
const page = ref(1);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE)),
);

const pageList = computed(() => {
  const arr: number[] = [];
  const max = totalPages.value;
  const cur = page.value;
  for (let p = Math.max(1, cur - 2); p <= Math.min(max, cur + 2); p++) {
    arr.push(p);
  }
  return arr;
});

function onKeywordInput(e: any) {
  keyword.value = e?.detail?.value ?? "";
}

function spaceMark(id: string) {
  const hex = (id || "").replace(/-/g, "").toUpperCase();
  if (!hex) return "0000-0000";
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function formatDate(iso: string) {
  if (!iso) return "--";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gotoPage(p: number) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  void fetchList();
}

function search() {
  page.value = 1;
  void fetchList();
}

function reset() {
  keyword.value = "";
  page.value = 1;
  void fetchList();
}

async function fetchList() {
  loading.value = true;
  try {
    const resp = await adminApi.users.list({
      page: page.value,
      page_size: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
    });
    list.value = resp.data?.items || [];
    total.value = resp.data?.total || 0;
  } catch (err) {
    console.error("[admin-users] 列表失败", err);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!ensureAdminAuth()) return;
  await fetchList();
});
</script>

<style lang="scss" scoped>
.page-title {
  display: block;
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 24px;
  font-weight: 600;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  max-width: 320px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
}

.btn-ghost {
  padding: 10px 16px;
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.85);
  font-size: 12px;
  cursor: pointer;
  text-align: center;

  &:active {
    background: rgba(212, 175, 55, 0.08);
  }
}

.hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

.table-wrap {
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.1);
  overflow-x: auto;
}

.table-head,
.table-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-width: 860px;
}

.table-head {
  background: rgba(212, 175, 55, 0.05);
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  font-size: 11px;
  color: #d4af37;
  letter-spacing: 1.5px;
}

.table-row {
  border-bottom: 1px solid rgba(212, 175, 55, 0.06);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.cell {
  padding: 2px 8px;
  display: flex;
  align-items: center;
}

.cell.mark {
  width: 120px;
  flex-shrink: 0;
  font-family: monospace;
  color: rgba(255, 255, 255, 0.7);
}
.cell.nick {
  width: 120px;
  flex-shrink: 0;
}
.cell.phone {
  width: 120px;
  flex-shrink: 0;
}
.cell.date {
  width: 120px;
  flex-shrink: 0;
}
.cell.pts {
  width: 110px;
  flex-shrink: 0;
}
.cell.unlock {
  width: 70px;
  flex-shrink: 0;
}
.cell.rep {
  width: 80px;
  flex-shrink: 0;
}
.cell.inv {
  flex: 1;
}

.point-cell {
  color: #d4af37;
  font-weight: 600;
}

.empty-row {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  letter-spacing: 2px;
}

.pagination {
  padding: 16px;
  display: flex;
  justify-content: center;
  gap: 4px;
  border-top: 1px solid rgba(212, 175, 55, 0.06);
  margin-top: 8px;
}

.pg-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.7);
  cursor: pointer;
  font-size: 12px;

  &.active {
    background: rgba(212, 175, 55, 0.15);
    color: #d4af37;
  }

  &.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}
</style>
