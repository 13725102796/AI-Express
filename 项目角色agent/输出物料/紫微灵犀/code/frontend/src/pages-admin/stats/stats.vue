<template>
  <BaseAdminShell active="stats" topTitle="数据概览">
    <text class="page-title">数据概览</text>
    <text class="page-desc">
      数据更新时间：<text class="gold">{{ updatedAt }}</text>
    </text>

    <!-- 数字卡片网格 -->
    <view class="stats-grid">
      <view class="stat-card">
        <text class="stat-label">累计接入缘主</text>
        <text class="stat-value">{{ fmt(stats?.total_users) }}</text>
        <text class="stat-meta">累计注册（含已注销）</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">今日新增缘主</text>
        <text class="stat-value">{{ fmt(todayNewUsers) }}</text>
        <text class="stat-meta">
          DAU 今日：<text class="up">{{ fmt(stats?.dau_today) }}</text>
        </text>
      </view>
      <view class="stat-card">
        <text class="stat-label">累计神谕推演</text>
        <text class="stat-value">{{ fmt(stats?.total_reports) }}</text>
        <text class="stat-meta">命盘 {{ fmt(stats?.total_charts) }} 张</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">今日推演次数</text>
        <text class="stat-value">{{ fmt(todayReadings) }}</text>
        <text class="stat-meta">近 7 日均值 {{ fmt(weekAvg) }}</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">累计启封次数</text>
        <text class="stat-value">{{ fmt(stats?.total_unlocks) }}</text>
        <text class="stat-meta">模板启封总数</text>
      </view>
      <view class="stat-card">
        <text class="stat-label">七日活跃峰值</text>
        <text class="stat-value">{{ fmt(weekMax) }}</text>
        <text class="stat-meta">过去 7 日最高 DAU</text>
      </view>
    </view>

    <!-- 近 7 日 DAU 简单柱状图（div 宽度模拟，不引入 echarts） -->
    <text class="section-title">近 7 日活跃缘主（DAU）</text>
    <view class="chart-wrap">
      <view v-for="(item, i) in dau7Rows" :key="i" class="chart-row">
        <text class="chart-day">{{ item.dayLabel }}</text>
        <view class="chart-bar-track">
          <view
            class="chart-bar-fill"
            :style="{ width: item.widthPct + '%' }"
          />
        </view>
        <text class="chart-val">{{ item.value }}</text>
      </view>
    </view>

    <!-- Top 5 模板 -->
    <text class="section-title">神谕模块启封排行 Top 5</text>
    <view class="top-list">
      <view
        v-for="(t, i) in top5"
        :key="t.id"
        class="top-row"
      >
        <text class="top-rank" :class="{ first: i === 0 }">{{ i + 1 }}</text>
        <view class="top-content">
          <text class="top-name">{{ t.name }}</text>
        </view>
        <view class="top-bar">
          <view
            class="top-bar-fill"
            :style="{ width: topBarPct(t.unlock_count) + '%' }"
          />
        </view>
        <text class="top-count">{{ fmt(t.unlock_count) }}</text>
      </view>
      <view v-if="!top5.length" class="empty-row">
        <text>暂无启封数据</text>
      </view>
    </view>

    <text class="note">
      ⚠ MVP 阶段（用户 &lt; 1 万）仅提供基础数据，复杂图表与漏斗分析将在阶段二上线。
    </text>
  </BaseAdminShell>
</template>

<script setup lang="ts">
/**
 * A05 数据概览
 * - 6 张数据大卡（接入缘主 / 今日新增 / 累计推演 / 今日推演 / 累计启封 / 七日峰值）
 * - 近 7 日 DAU 简单柱状图（div 宽度模拟）
 * - Top 5 模板启封排行
 */
import { computed, onMounted, ref } from "vue";
import { ensureAdminAuth } from "@/utils/admin-guard";
import { adminApi } from "@/services/admin";
import type { AdminStats } from "@/types/api";

const stats = ref<AdminStats | null>(null);
const updatedAt = ref("");

const top5 = computed(() => stats.value?.top5_templates || []);
const dau7 = computed(() => stats.value?.dau_7d || []);

const weekMax = computed(() =>
  dau7.value.length ? Math.max(...dau7.value, 0) : 0,
);
const weekAvg = computed(() => {
  if (!dau7.value.length) return 0;
  const sum = dau7.value.reduce((a, b) => a + b, 0);
  return Math.round(sum / dau7.value.length);
});

const todayNewUsers = computed(() => {
  // 后端暂未单独暴露 today_new_users，这里用 dau_today 展示
  return stats.value?.dau_today ?? 0;
});
const todayReadings = computed(() => {
  // 同样用 dau_today 做占位（后端如有 today_reports 应切换）
  return stats.value?.dau_today ?? 0;
});

// 7 日柱状图行
const dau7Rows = computed(() => {
  const max = Math.max(...dau7.value, 1);
  return dau7.value.map((v, i) => {
    // i=0 表 7 天前，i=6 表 今日（假设后端按时间升序）
    const daysAgo = dau7.value.length - 1 - i;
    const dayLabel = daysAgo === 0 ? "今日" : `${daysAgo} 日前`;
    return {
      dayLabel,
      value: v,
      widthPct: Math.max(2, Math.round((v / max) * 100)),
    };
  });
});

function fmt(n: number | undefined | null) {
  if (n === null || n === undefined) return "--";
  return Number(n).toLocaleString();
}

function topBarPct(count: number) {
  if (!top5.value.length) return 0;
  const max = Math.max(...top5.value.map((t) => t.unlock_count), 1);
  return Math.max(6, Math.round((count / max) * 100));
}

async function fetchStats() {
  try {
    const resp = await adminApi.stats();
    stats.value = resp.data || null;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    updatedAt.value = `${y}-${m}-${d} ${hh}:${mm}`;
  } catch (err) {
    console.error("[admin-stats] 拉取失败", err);
  }
}

onMounted(async () => {
  if (!ensureAdminAuth()) return;
  await fetchStats();
});
</script>

<style lang="scss" scoped>
.page-title {
  display: block;
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 8px;
  font-weight: 600;
}

.page-desc {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
  margin-bottom: 32px;
}

.gold {
  color: #d4af37;
}

/* 数字卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 36px;
}

.stat-card {
  position: relative;
  padding: 24px 22px;
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::before {
    content: "";
    position: absolute;
    top: -1px;
    left: -1px;
    right: -1px;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      #d4af37,
      transparent
    );
    opacity: 0.6;
  }

  &:hover {
    border-color: rgba(212, 175, 55, 0.4);
    box-shadow: 0 4px 24px rgba(212, 175, 55, 0.06);
  }
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

.stat-value {
  font-size: 32px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 1px;
  line-height: 1;
}

.stat-meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.up {
  color: #6ec06d;
}

.down {
  color: #ff8888;
}

/* 区块标题 */
.section-title {
  display: block;
  font-size: 14px;
  color: #d4af37;
  letter-spacing: 3px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  margin-bottom: 16px;
  margin-top: 16px;
}

/* 柱状图（div 宽度模拟） */
.chart-wrap {
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 36px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chart-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chart-day {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  width: 60px;
  flex-shrink: 0;
}

.chart-bar-track {
  flex: 1;
  height: 12px;
  background: rgba(212, 175, 55, 0.05);
  border-radius: 99px;
  overflow: hidden;
}

.chart-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #d4af37, rgba(212, 175, 55, 0.5));
  border-radius: 99px;
  transition: width 0.4s ease;
}

.chart-val {
  font-size: 12px;
  color: #d4af37;
  width: 50px;
  text-align: right;
  flex-shrink: 0;
}

/* Top 5 */
.top-list {
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.top-row {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.06);
  gap: 16px;

  &:last-child {
    border-bottom: none;
  }
}

.top-rank {
  font-size: 22px;
  color: #d4af37;
  font-weight: 600;
  min-width: 40px;

  &.first {
    font-size: 28px;
  }
}

.top-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.top-name {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1px;
}

.top-bar {
  width: 200px;
  height: 6px;
  background: rgba(212, 175, 55, 0.06);
  border-radius: 99px;
  overflow: hidden;
  flex-shrink: 0;
}

.top-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #d4af37, rgba(212, 175, 55, 0.6));
}

.top-count {
  font-size: 18px;
  color: #d4af37;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.empty-row {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.note {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 24px;
  letter-spacing: 1px;
}
</style>
