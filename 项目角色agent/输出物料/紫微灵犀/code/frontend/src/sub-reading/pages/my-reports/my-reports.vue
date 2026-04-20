<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回缘主" subtitle="神谕印记" />

    <view class="container">
      <!-- 顶部统计 -->
      <view v-if="reports.length || !loading" class="header-card">
        <text class="header-stat">
          <text class="header-stat-num">{{ reportsTotal }}</text>
          <text>卷神谕印记</text>
        </text>
        <text class="header-sort">按时间倒序</text>
      </view>

      <!-- 加载态 -->
      <view v-if="loading && !reports.length" class="loading-state">
        <view class="skeleton" />
        <view class="skeleton" />
        <view class="skeleton" />
      </view>

      <!-- 空态 -->
      <view v-else-if="!reports.length" class="empty-state">
        <text class="empty-text">尚未有神谕印记</text>
        <view class="empty-cta" @click="goMyTemplates">
          <text>前往启封模块 →</text>
        </view>
      </view>

      <!-- 报告列表 -->
      <view v-else class="report-list">
        <view
          v-for="rep in reports"
          :key="rep.id"
          class="report-card"
          @click="goDetail(rep.id)"
        >
          <view class="report-row1">
            <text class="report-name">{{ rep.template_name }}</text>
            <text class="report-aigc-tag">AI</text>
          </view>
          <text class="report-time">{{ formatTime(rep.created_at) }}</text>
          <text class="report-excerpt">{{ rep.excerpt }}</text>
          <view class="report-meta-row">
            <text class="report-meta"
              >{{ countChars(rep.excerpt) }} 字摘要 · 点击查看全卷</text
            >
          </view>
          <!-- inline AIGC 标识：P12 硬约束（每条卡片底部内联） -->
          <BaseAigcBadge position="inline" />
        </view>
      </view>

      <!-- 加载更多 -->
      <view
        v-if="reports.length && reports.length < reportsTotal"
        class="load-more"
        @click="loadMore"
      >
        <text>{{ loading ? "加载中..." : "加载更早印记" }}</text>
      </view>
    </view>

    <!-- AIGC 位置 1：页面级右下角徽章 -->
    <BaseAigcBadge position="fixed-corner" />
  </view>
</template>

<script setup lang="ts">
/**
 * P12 我的报告 / 神谕印记
 * - 顶部卡：共 N 卷
 * - 报告卡片列表（模板名 / 生成时间 / 摘要 / inline AIGC 标识）
 * - 点击卡片 → P09 报告详情
 * - 空态 → P11 我的模板
 * - AIGC 三层防护：位置 1（fixed-corner）+ 位置 2（每卡 inline badge，硬约束）
 */
import { computed, onMounted, ref } from "vue";
import { useReadingStore } from "@/stores/reading";
import { useUserStore } from "@/stores/user";

const readingStore = useReadingStore();
const userStore = useUserStore();

const loading = ref(false);

const reports = computed(() => readingStore.reports);
const reportsTotal = computed(() => readingStore.reportsTotal);

function countChars(s: string) {
  return s ? s.length : 0;
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 3600 * 1000;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const fullDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${hh}:${mm}`;
  if (diff < day) return `今日 · ${fullDate}`;
  if (diff < 2 * day) return `昨日 · ${fullDate}`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 日前 · ${fullDate}`;
  return fullDate;
}

// ============ 交互 ============
function goDetail(id: string) {
  uni.navigateTo({ url: "/sub-reading/pages/report/report?id=" + id });
}
function goMyTemplates() {
  uni.navigateTo({ url: "/sub-reading/pages/my-templates/my-templates" });
}

async function loadMore() {
  if (loading.value) return;
  loading.value = true;
  try {
    const next = Math.ceil(reports.value.length / 20) + 1;
    await readingStore.fetchReports(next, 20);
  } finally {
    loading.value = false;
  }
}

// ============ 加载 ============
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/login" });
    return;
  }
  loading.value = true;
  try {
    // 强制从第 1 页拉（覆盖缓存）
    readingStore.reports = [];
    await readingStore.fetchReports(1, 20).catch(() => void 0);
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 100px;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
  font-family: "Noto Serif SC", serif;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.header-card {
  padding: 20px 24px;
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-stat {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
}

.header-stat-num {
  color: #d4af37;
  font-size: 22px;
  font-weight: 600;
  margin-right: 6px;
}

.header-sort {
  color: #d4af37;
  font-size: 11px;
  letter-spacing: 2px;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-card {
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 12px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:active {
    border-color: #d4af37;
    box-shadow: 0 4px 24px rgba(212, 175, 55, 0.08);
  }
}

.report-row1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.report-name {
  font-size: 15px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 1px;
}

.report-aigc-tag {
  font-size: 9px;
  padding: 2px 6px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  border-radius: 4px;
  letter-spacing: 1px;
}

.report-time {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.report-excerpt {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.7;
  margin-bottom: 6px;
  /* 最多 2 行 */
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.report-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.report-meta {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
  flex: 1;
}

/* 加载 / 空态 */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton {
  height: 120px;
  background: linear-gradient(
    90deg,
    rgba(212, 175, 55, 0.04),
    rgba(212, 175, 55, 0.08),
    rgba(212, 175, 55, 0.04)
  );
  border-radius: 12px;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.empty-state {
  padding: 80px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
}

.empty-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

.empty-cta {
  padding: 12px 32px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 4px;
  cursor: pointer;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}

.load-more {
  display: block;
  margin: 24px auto 0;
  padding: 10px 32px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 2px;
  width: fit-content;
  text-align: center;
  cursor: pointer;
}
</style>
