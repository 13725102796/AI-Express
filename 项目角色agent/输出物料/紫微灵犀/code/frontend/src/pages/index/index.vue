<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav brand="紫微灵犀 / 终端主脑" />

    <view class="container">
      <!-- 灵犀资产展板 -->
      <view class="points-board">
        <view class="points-watermark">☯</view>
        <view class="points-content">
          <view class="points-info">
            <text class="points-title">当前灵犀点数</text>
            <view class="points-data">
              <text class="points-value">{{ pointsFormatted }}</text>
              <text class="points-unit">¤</text>
            </view>
          </view>
          <view
            class="sign-btn"
            :class="{ disabled: checkinDone || checkinLoading }"
            @click="acquireAether"
          >
            <text>{{
              checkinLoading
                ? "凝结中..."
                : checkinDone
                  ? "已汲取"
                  : "汲取灵力"
            }}</text>
          </view>
        </view>
      </view>

      <!-- 签到状态条 -->
      <view class="checkin-strip">
        <view class="checkin-left">
          <view class="checkin-dot" :class="{ signed: checkinDone }" />
          <text>{{ checkinStatusText }}</text>
        </view>
        <view class="checkin-right">
          <text class="checkin-streak">连续 {{ consecutiveDays }} 日</text>
          <text class="checkin-reward"> · {{ checkinRewardText }}</text>
        </view>
      </view>

      <!-- 命盘概览：已排盘 -->
      <view v-if="hasChart" class="chart-overview">
        <view class="chart-overview-header">
          <text class="chart-overview-title">本我命盘</text>
          <view class="chart-overview-link" @click="goChart">
            <text>查看完整 →</text>
          </view>
        </view>
        <view class="chart-mini">
          <view
            v-for="item in miniCells"
            :key="item.key"
            class="mini-cell"
            :class="{ center: item.center, empty: item.empty }"
          >
            <template v-if="item.center">
              <text class="mini-cell-line">命主：{{ basic?.soulMaster || "—" }}</text>
              <text class="mini-cell-line">身主：{{ basic?.bodyMaster || "—" }}</text>
              <text class="mini-cell-line accent">{{ basic?.fiveElementsClass || "—" }}</text>
            </template>
            <template v-else-if="!item.empty">
              <text class="mini-cell-branch">{{ item.branch }}</text>
              <text class="mini-cell-star">{{ item.starName }}</text>
            </template>
          </view>
        </view>
        <text class="chart-overview-info"
          >{{ basic?.lunarDate || "" }} · {{ basic?.time || "" }} ·
          {{ genderLabel }}</text
        >
      </view>

      <!-- 命盘空 CTA -->
      <view v-else class="chart-empty" @click="goSetup">
        <text class="chart-empty-text">尚未铸造命盘</text>
        <view class="chart-empty-cta">
          <text>立即铸造</text>
        </view>
      </view>

      <text class="section-title">紫微殿堂中枢</text>

      <!-- 推荐模板 -->
      <view class="marketplace">
        <view
          v-for="tpl in recommendedTemplates"
          :key="tpl.id"
          class="pkg-card"
          :class="{ 'pkg-premium': tpl.points_cost > 0 }"
          @click="goTemplateDetail(tpl.id)"
        >
          <view class="pkg-header">
            <text class="pkg-title">{{ tpl.name }}</text>
            <view class="pkg-price">
              <text v-if="tpl.points_cost === 0" class="price-free"
                >限免</text
              >
              <text v-else class="price-val"
                >{{ tpl.points_cost }} <text class="price-unit">¤</text></text
              >
            </view>
          </view>
          <text class="pkg-desc">{{ tpl.description }}</text>
          <view class="pkg-tags">
            <text v-for="t in tpl.tags" :key="t" class="pkg-tag">{{ t }}</text>
          </view>
        </view>

        <view v-if="!recommendedTemplates.length && templatesLoading" class="skeleton" />
      </view>

      <view class="view-more" @click="goTemplates">
        <text>查看全部神谕模块 →</text>
      </view>

      <!-- 最新报告 -->
      <view v-if="latestReport" class="latest-report" @click="goReport(latestReport.id)">
        <view class="latest-report-left">
          <text class="latest-report-label">最新神谕印记</text>
          <text class="latest-report-name">{{ latestReport.template_name }}</text>
          <text class="latest-report-time">{{ formatRelativeTime(latestReport.created_at) }}</text>
        </view>
        <text class="latest-report-arrow">→</text>
      </view>
    </view>

    <BaseTabBar active="home" />
  </view>
</template>

<script setup lang="ts">
/**
 * P01 首页 / 终端主脑
 * - 积分余额 + 签到（PRD 3.3：5/8/10/12/15/18/20¤ 映射）
 * - 命盘概览（已排盘）/ 空状态 CTA
 * - 模板商城（推荐 3 个）
 * - 最新报告入口
 */
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user";
import { usePointsStore } from "@/stores/points";
import { useChartStore } from "@/stores/chart";
import { useTemplatesStore } from "@/stores/templates";
import { useReadingStore } from "@/stores/reading";
import { errorMessage } from "@/types/errors";

const userStore = useUserStore();
const pointsStore = usePointsStore();
const chartStore = useChartStore();
const templatesStore = useTemplatesStore();
const readingStore = useReadingStore();

const STREAK_REWARDS = [5, 8, 10, 12, 15, 18, 20];
const checkinLoading = ref(false);
const templatesLoading = ref(false);

// ============ 派生数据 ============
const pointsFormatted = computed(() => {
  const n = pointsStore.balance || userStore.pointsBalance || 0;
  return n.toLocaleString();
});

const checkinDone = computed(() => pointsStore.checkinStatus?.checked_in_today ?? false);
const consecutiveDays = computed(
  () => pointsStore.checkinStatus?.consecutive_days ?? 0,
);

const checkinStatusText = computed(() =>
  checkinDone.value ? "今日已汲取灵力" : "今日尚未汲取灵力",
);

const checkinRewardText = computed(() => {
  const today = pointsStore.checkinStatus?.today_reward ?? STREAK_REWARDS[Math.min(consecutiveDays.value, 6)];
  if (checkinDone.value) return `已得 +${today} ¤`;
  return `今日 +${today} ¤`;
});

const hasChart = computed(() => chartStore.hasChart);
const basic = computed(() => chartStore.basic);

const genderLabel = computed(() => {
  const g = basic.value?.gender;
  if (g === "男") return "乾造";
  if (g === "女") return "坤造";
  return "";
});

// 命盘缩略：按地支显示 + 中宫合并
const miniCells = computed(() => {
  const byBranch = chartStore.palacesByBranch;
  const order = ["巳", "午", "未", "申", "辰", "center", "酉", "卯", "戌", "寅", "丑", "子", "亥"];
  return order.map((branch, i) => {
    if (branch === "center") {
      return { key: "center", center: true, empty: false, branch: "", starName: "" };
    }
    const p = byBranch[branch];
    return {
      key: branch + i,
      center: false,
      empty: !p,
      branch,
      starName: p?.majorStars?.[0]?.name || "空",
    };
  });
});

const recommendedTemplates = computed(() =>
  templatesStore.list.slice(0, 3),
);

const latestReport = computed(() => readingStore.reports[0] || null);

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 3600 * 1000;
  if (diff < 3600 * 1000) return "刚刚";
  if (diff < day) return Math.floor(diff / (3600 * 1000)) + " 小时前";
  if (diff < 30 * day) return Math.floor(diff / day) + " 日前";
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

// ============ 交互 ============
async function acquireAether() {
  if (checkinDone.value || checkinLoading.value) return;
  checkinLoading.value = true;
  try {
    const data = await pointsStore.checkin();
    if (data) {
      // 余额动画（简单放大）
      uni.showToast({
        title: `+${data.points_earned} ¤ · 连续 ${data.consecutive_days} 日`,
        icon: "none",
        duration: 1500,
      });
      // 同步用户对象里的 balance
      userStore.updatePoints(data.balance);
    }
  } catch (err: any) {
    const code = err?.code;
    uni.showToast({
      title: err?.message || errorMessage(code) || "签到失败",
      icon: "none",
    });
  } finally {
    checkinLoading.value = false;
  }
}

function goChart() {
  uni.navigateTo({ url: "/sub-chart/pages/chart/chart" });
}

function goSetup() {
  uni.navigateTo({ url: "/pages/profile-setup/profile-setup" });
}

function goTemplates() {
  uni.navigateTo({ url: "/sub-user/pages/templates/templates" });
}

function goTemplateDetail(id: string) {
  uni.navigateTo({
    url: "/sub-user/pages/template-detail/template-detail?id=" + id,
  });
}

function goReport(id: string) {
  uni.navigateTo({ url: "/sub-reading/pages/report/report?id=" + id });
}

// ============ 数据加载 ============
onMounted(async () => {
  // 未登录 → 登录页
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/login" });
    return;
  }
  // 若缓存中 has_profile = false，则直接跳 setup
  if (!userStore.hasProfile) {
    uni.reLaunch({ url: "/pages/profile-setup/profile-setup" });
    return;
  }

  // 并行拉数据
  templatesLoading.value = true;
  const tasks = [
    userStore.fetchMe().catch(() => void 0),
    pointsStore.fetchBalance().catch(() => void 0),
    pointsStore.fetchCheckinStatus().catch(() => void 0),
    chartStore.fetchMyChart().catch(() => void 0),
    templatesStore.fetchList(1, 10).catch(() => void 0),
    readingStore.fetchReports(1, 3).catch(() => void 0),
  ];
  await Promise.all(tasks);
  templatesLoading.value = false;
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 80px;
  color: rgba(255, 255, 255, 0.9);
  background: #000;
  font-family: "Noto Serif SC", serif;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

/* 灵犀资产板 */
.points-board {
  background: linear-gradient(
    135deg,
    rgba(10, 10, 15, 0.9) 0%,
    rgba(10, 10, 15, 0.4) 100%
  );
  border: 1px solid rgba(212, 175, 55, 0.4);
  padding: 28px 24px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: inset 0 0 30px rgba(212, 175, 55, 0.05);
}

.points-watermark {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%) rotate(15deg);
  font-size: 120px;
  line-height: 1;
  color: rgba(212, 175, 55, 0.05);
  pointer-events: none;
  z-index: 0;
}

.points-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.points-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  margin-bottom: 10px;
  display: block;
}

.points-data {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.points-value {
  font-size: 40px;
  font-weight: 300;
  color: #fff;
  line-height: 1;
}

.points-unit {
  font-size: 20px;
  color: #d4af37;
}

.sign-btn {
  padding: 10px 20px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  font-size: 12px;
  border-radius: 99px;
  letter-spacing: 2px;
  transition: all 0.3s ease;
  cursor: pointer;

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:active:not(.disabled) {
    background: rgba(212, 175, 55, 0.1);
  }
}

/* 签到状态条 */
.checkin-strip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 8px;
  margin-bottom: 28px;
  font-size: 12px;
}

.checkin-left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.checkin-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d4af37;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.6);
  animation: checkin-pulse 2s infinite;

  &.signed {
    background: rgba(255, 255, 255, 0.3);
    box-shadow: none;
    animation: none;
  }
}

@keyframes checkin-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.checkin-streak {
  color: #d4af37;
  font-weight: 600;
}

.checkin-reward {
  color: rgba(255, 255, 255, 0.4);
}

/* 命盘概览 */
.chart-overview {
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 28px;
}

.chart-overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.chart-overview-title {
  font-size: 14px;
  color: #d4af37;
  letter-spacing: 4px;
}

.chart-overview-link {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
  cursor: pointer;
}

.chart-mini {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  aspect-ratio: 1 / 1;
  gap: 3px;
  max-width: 240px;
  margin: 0 auto 12px;
}

.mini-cell {
  border: 1px solid rgba(212, 175, 55, 0.2);
  padding: 2px;
  font-size: 9px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: center;
  justify-content: center;
  color: #d4af37;
  background: rgba(0, 0, 0, 0.3);
  line-height: 1.2;

  &.center {
    grid-column: 2 / 4;
    grid-row: 2 / 4;
    background: rgba(212, 175, 55, 0.05);
    border-color: rgba(212, 175, 55, 0.4);
    color: rgba(255, 255, 255, 0.7);

    .mini-cell-line {
      font-size: 10px;
      line-height: 1.6;
    }

    .accent {
      color: #d4af37;
    }
  }

  &.empty {
    background: transparent;
    border: none;
  }
}

.mini-cell-branch {
  font-size: 9px;
  color: rgba(212, 175, 55, 0.8);
}

.mini-cell-star {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.6);
}

.chart-overview-info {
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

/* 命盘空 CTA */
.chart-empty {
  text-align: center;
  padding: 32px 24px;
  margin-bottom: 28px;
  background: rgba(10, 10, 15, 0.4);
  border: 1px dashed rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.3s ease;

  &:active {
    border-color: #d4af37;
  }
}

.chart-empty-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 14px;
  letter-spacing: 1px;
  display: block;
}

.chart-empty-cta {
  display: inline-block;
  padding: 10px 28px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 4px;
}

/* 区块标题 */
.section-title {
  display: block;
  font-size: 14px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  padding: 12px 0;
  margin-bottom: 20px;
}

/* 模板卡 */
.marketplace {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pkg-card {
  padding: 20px 22px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:active {
    border-color: rgba(212, 175, 55, 0.4);
    background: rgba(212, 175, 55, 0.02);
  }
}

.pkg-premium {
  box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.04);
}

.pkg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pkg-title {
  font-size: 16px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 1px;
}

.pkg-price {
  font-size: 14px;
  color: #fff;
  font-weight: 300;
}

.price-free {
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 2px;
  font-size: 13px;
}

.price-val {
  color: #fff;
}

.price-unit {
  color: #d4af37;
  margin-left: 2px;
}

.pkg-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.7;
  margin: 2px 0 6px;
}

.pkg-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pkg-tag {
  font-size: 10px;
  padding: 2px 8px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.8);
  border-radius: 4px;
  letter-spacing: 1px;
}

.skeleton {
  height: 100px;
  background: linear-gradient(
    90deg,
    rgba(212, 175, 55, 0.04),
    rgba(212, 175, 55, 0.08),
    rgba(212, 175, 55, 0.04)
  );
  border-radius: 8px;
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

.view-more {
  text-align: center;
  padding: 14px 0;
  color: rgba(212, 175, 55, 0.8);
  font-size: 11px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s ease;

  &:active {
    color: #d4af37;
  }
}

/* 最新报告 */
.latest-report {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  margin-top: 16px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:active {
    border-color: rgba(212, 175, 55, 0.4);
  }
}

.latest-report-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.latest-report-label {
  font-size: 10px;
  color: #d4af37;
  letter-spacing: 2px;
}

.latest-report-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.latest-report-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.latest-report-arrow {
  color: rgba(212, 175, 55, 0.4);
  font-size: 18px;
}
</style>
