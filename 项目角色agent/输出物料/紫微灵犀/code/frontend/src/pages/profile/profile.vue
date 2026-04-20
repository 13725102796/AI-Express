<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav brand="紫微灵犀 / 本我" />

    <view class="container">
      <!-- 缘主头部 -->
      <view class="profile-header">
        <view class="avatar">
          <view class="avatar-ring" />
          <view class="avatar-inner-wrap">
            <text class="avatar-inner">{{ avatarChar }}</text>
          </view>
        </view>
        <view class="profile-info">
          <text class="user-name">{{ nickname }}（缘主）</text>
          <text class="user-id">时空印记: {{ spaceMark }}</text>
          <text class="user-phone">{{ phoneMasked }}</text>
        </view>
      </view>

      <!-- 积分卡 → 跳 P10 -->
      <view class="asset-panel" @click="goPoints">
        <view class="asset-left">
          <text class="asset-label">灵犀点数</text>
          <text class="asset-value">{{ pointsFormatted }} ¤</text>
        </view>
        <text class="asset-arrow">→</text>
      </view>

      <!-- 本命盘卡 -->
      <view class="chart-panel" @click="goChartOrSetup">
        <view class="chart-left">
          <text class="chart-label">本命盘</text>
          <text v-if="hasChart" class="chart-value">{{ chartSummary }}</text>
          <text v-else class="chart-value chart-empty">尚未铸造命盘 · 点击锚定</text>
        </view>
        <text class="chart-arrow">→</text>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-list">
        <view class="menu-item" @click="goMyReports">
          <view class="menu-left">
            <text class="menu-icon">I</text>
            <text class="menu-title">神谕印记</text>
            <text v-if="reportsCount" class="menu-badge">{{ reportsCount }}</text>
          </view>
          <text class="menu-arrow">→</text>
        </view>
        <view class="menu-item" @click="goMyTemplates">
          <view class="menu-left">
            <text class="menu-icon">II</text>
            <text class="menu-title">已启封模块</text>
            <text v-if="unlocksCount" class="menu-badge">{{ unlocksCount }}</text>
          </view>
          <text class="menu-arrow">→</text>
        </view>
        <view class="menu-item" @click="goPoints">
          <view class="menu-left">
            <text class="menu-icon">III</text>
            <text class="menu-title">灵犀本源（积分明细）</text>
          </view>
          <text class="menu-arrow">→</text>
        </view>
        <view class="menu-item" @click="goSetup">
          <view class="menu-left">
            <text class="menu-icon">IV</text>
            <text class="menu-title">时空坐标管理</text>
          </view>
          <text class="menu-arrow">→</text>
        </view>
        <view class="menu-item" @click="goInvite">
          <view class="menu-left">
            <text class="menu-icon">V</text>
            <text class="menu-title">引灵结缘（邀请好友）</text>
          </view>
          <text class="menu-arrow">→</text>
        </view>

        <view class="menu-divider" />

        <view class="menu-item" @click="clearCache">
          <view class="menu-left">
            <text class="menu-icon">○</text>
            <text class="menu-title">清除本地缓存</text>
          </view>
          <text class="menu-arrow">→</text>
        </view>

        <view class="menu-item danger" @click="confirmLogout">
          <view class="menu-left">
            <text class="menu-icon">O</text>
            <text class="menu-title">切断灵犀链接</text>
          </view>
          <text class="menu-arrow"></text>
        </view>
      </view>

      <text class="tech-footer">v2.0 · 终端端点编号 {{ userIdShort }}</text>
    </view>

    <BaseTabBar active="profile" />
  </view>
</template>

<script setup lang="ts">
/**
 * P04 个人中心 / 缘主实体
 * - 头像 / 昵称 / 手机号
 * - 积分卡（点击 → P10）
 * - 本命盘卡（有则去 P02 / 无则去 P06）
 * - 功能菜单（神谕印记 P12 / 已启封模块 P11 / 灵犀本源 P10 / 时空坐标 P06 / 引灵结缘 P13）
 * - 清除本地缓存 + 切断灵犀链接（退出）
 */
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user";
import { usePointsStore } from "@/stores/points";
import { useChartStore } from "@/stores/chart";
import { useReadingStore } from "@/stores/reading";
import { useTemplatesStore } from "@/stores/templates";

const userStore = useUserStore();
const pointsStore = usePointsStore();
const chartStore = useChartStore();
const readingStore = useReadingStore();
const templatesStore = useTemplatesStore();

const nickname = computed(() => userStore.user?.nickname || "缘主");
const avatarChar = computed(() => {
  const nm = userStore.user?.nickname || "缘";
  return nm.charAt(0);
});
const phoneMasked = computed(() => userStore.user?.phone_masked || "--");
// 时空印记：取 user.id 的前 4 / 中 4 位
const spaceMark = computed(() => {
  const id = userStore.user?.id || "";
  const hex = id.replace(/-/g, "");
  if (!hex) return "0000-0000";
  return `${hex.slice(0, 4).toUpperCase()}-${hex.slice(4, 8).toUpperCase()}`;
});
const userIdShort = computed(() => {
  const id = userStore.user?.id || "";
  return id ? id.slice(0, 8) : "unknown";
});
const pointsFormatted = computed(() => {
  const n = pointsStore.balance || userStore.pointsBalance || 0;
  return n.toLocaleString();
});

const hasChart = computed(() => chartStore.hasChart);
const chartSummary = computed(() => {
  const b = chartStore.basic;
  if (!b) return "命盘已铸造";
  return `${b.lunarDate || ""} · ${b.fiveElementsClass || ""}`;
});

const reportsCount = computed(() => readingStore.reportsTotal);
const unlocksCount = computed(() => templatesStore.myTotal);

// ============ 跳转 ============
function goPoints() {
  uni.navigateTo({ url: "/sub-user/pages/points/points" });
}
function goChartOrSetup() {
  if (hasChart.value) {
    uni.navigateTo({ url: "/sub-chart/pages/chart/chart" });
  } else {
    uni.navigateTo({ url: "/pages/profile-setup/profile-setup" });
  }
}
function goSetup() {
  uni.navigateTo({ url: "/pages/profile-setup/profile-setup" });
}
function goMyReports() {
  uni.navigateTo({ url: "/sub-reading/pages/my-reports/my-reports" });
}
function goMyTemplates() {
  uni.navigateTo({ url: "/sub-reading/pages/my-templates/my-templates" });
}
function goInvite() {
  uni.navigateTo({ url: "/sub-user/pages/invite/invite" });
}

function clearCache() {
  uni.showModal({
    title: "清除本地缓存",
    content: "将清除命盘/报告等缓存，不会退出当前登录。确认继续？",
    success: (r) => {
      if (!r.confirm) return;
      // 不清 token
      uni.removeStorageSync("ziwei_user_chart");
      uni.removeStorageSync("ziwei_user_profile");
      uni.showToast({ title: "已清除本地缓存", icon: "none" });
    },
  });
}

function confirmLogout() {
  uni.showModal({
    title: "确认切断灵犀链接？",
    content: "将清除本地会话，需重新输入密脉接入",
    confirmText: "切断",
    confirmColor: "#ff3333",
    cancelText: "取消",
    success: (r) => {
      if (!r.confirm) return;
      userStore.logout();
      uni.reLaunch({ url: "/pages/login/login" });
    },
  });
}

// ============ 数据加载 ============
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/login" });
    return;
  }
  // 并行拉数据
  const tasks = [
    userStore.fetchMe().catch(() => void 0),
    pointsStore.fetchBalance().catch(() => void 0),
    chartStore.fetchMyChart().catch(() => void 0),
    readingStore.fetchReports(1, 3).catch(() => void 0),
    templatesStore.fetchMy(1, 20).catch(() => void 0),
  ];
  await Promise.all(tasks);
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

/* 缘主头部 */
.profile-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  margin-top: 20px;
}

.avatar {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
}

.avatar-ring {
  position: absolute;
  inset: -6px;
  border: 1px dashed rgba(212, 175, 55, 0.4);
  border-radius: 50%;
  animation: spin 30s linear infinite;
}

.avatar-inner-wrap {
  position: absolute;
  inset: 0;
  border: 1px solid #d4af37;
  border-radius: 50%;
  box-shadow:
    inset 0 0 20px rgba(212, 175, 55, 0.15),
    0 0 15px rgba(212, 175, 55, 0.05);
  background: radial-gradient(
    circle at center,
    rgba(212, 175, 55, 0.05) 0%,
    transparent 70%
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-inner {
  font-size: 26px;
  color: #d4af37;
  text-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.user-name {
  font-size: 22px;
  color: #fff;
  letter-spacing: 2px;
}

.user-id {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2px;
}

.user-phone {
  font-size: 11px;
  color: rgba(212, 175, 55, 0.6);
  letter-spacing: 1px;
}

/* 积分卡 */
.asset-panel {
  background: rgba(10, 10, 15, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.4);
  padding: 28px 24px;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px;
  box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.05);
  cursor: pointer;

  &:active {
    border-color: #d4af37;
    box-shadow:
      inset 0 0 20px rgba(212, 175, 55, 0.1),
      0 0 20px rgba(212, 175, 55, 0.1);
  }
}

.asset-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.asset-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

.asset-value {
  font-size: 32px;
  color: #d4af37;
  line-height: 1;
}

.asset-arrow {
  color: rgba(212, 175, 55, 0.4);
  font-size: 20px;
}

/* 本命盘卡 */
.chart-panel {
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.25);
  padding: 18px 24px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 10px;
  cursor: pointer;

  &:active {
    border-color: #d4af37;
  }
}

.chart-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chart-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

.chart-value {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1px;

  &.chart-empty {
    color: rgba(212, 175, 55, 0.65);
  }
}

.chart-arrow {
  color: rgba(212, 175, 55, 0.4);
  font-size: 18px;
}

/* 菜单列表 */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.3s ease;

  &:active {
    background: rgba(212, 175, 55, 0.05);
    border-color: rgba(212, 175, 55, 0.4);
  }

  &.danger {
    border-color: rgba(255, 80, 80, 0.2);

    .menu-icon,
    .menu-title {
      color: #ff5555;
    }

    &:active {
      background: rgba(255, 80, 80, 0.05);
      border-color: rgba(255, 80, 80, 0.4);
    }
  }
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-icon {
  font-size: 14px;
  color: #d4af37;
  width: 24px;
  text-align: center;
}

.menu-title {
  font-size: 14px;
  letter-spacing: 1px;
}

.menu-badge {
  font-size: 10px;
  color: #d4af37;
  background: rgba(212, 175, 55, 0.1);
  padding: 2px 8px;
  border-radius: 99px;
  margin-left: 8px;
  letter-spacing: 1px;
}

.menu-arrow {
  color: rgba(212, 175, 55, 0.4);
}

.menu-divider {
  height: 1px;
  background: rgba(212, 175, 55, 0.1);
  margin: 16px 0 8px;
}

.tech-footer {
  display: block;
  text-align: center;
  margin-top: 40px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  letter-spacing: 2px;
}
</style>
