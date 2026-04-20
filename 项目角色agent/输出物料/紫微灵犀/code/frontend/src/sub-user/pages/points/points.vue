<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回缘主" subtitle="灵犀本源" />

    <view class="container">
      <!-- 大号积分展板 -->
      <view class="points-hero">
        <view class="points-hero-watermark">☯</view>
        <view class="points-hero-content">
          <text class="points-hero-label">灵犀点数</text>
          <view class="points-hero-data">
            <text class="points-hero-value">{{ balanceFormatted }}</text>
            <text class="points-hero-unit"> ¤</text>
          </view>
          <view class="points-hero-meta">
            <view class="hero-meta-cell">
              <text class="hero-meta-val">{{ earnedTotal.toLocaleString() }}</text>
              <text class="hero-meta-label">累计获取</text>
            </view>
            <view class="hero-meta-cell">
              <text class="hero-meta-val">{{ spentTotal.toLocaleString() }}</text>
              <text class="hero-meta-label">累计消耗</text>
            </view>
            <view class="hero-meta-cell">
              <text class="hero-meta-val">{{ consecutiveDays }}</text>
              <text class="hero-meta-label">连续签到</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 签到日历 -->
      <text class="section-title">七日签到节律</text>
      <view class="checkin-week">
        <view
          v-for="(day, i) in checkinWeek"
          :key="i"
          class="checkin-day"
          :class="{ done: day.done, today: day.today, future: day.future }"
        >
          <text class="checkin-day-label">D{{ i + 1 }}</text>
          <text class="checkin-day-val">+{{ day.reward }}</text>
        </view>
      </view>

      <!-- 签到按钮 -->
      <view
        class="sign-btn"
        :class="{ disabled: checkinDone || checkinLoading }"
        @click="acquireAether"
      >
        <text>{{
          checkinLoading
            ? "凝结中..."
            : checkinDone
              ? "今日已汲取"
              : `汲取灵力 +${todayReward} ¤`
        }}</text>
      </view>

      <!-- 获取途径 -->
      <text class="section-title">汲取途径</text>
      <view class="earn-grid">
        <view class="earn-card" @click="acquireAether">
          <view class="earn-icon">☯</view>
          <text class="earn-name">每日签到</text>
          <text class="earn-desc">连续 {{ consecutiveDays }} 日 · 今日 +{{ todayReward }} ¤</text>
          <text class="earn-cta">汲取灵力</text>
        </view>
        <view class="earn-card" @click="goInvite">
          <view class="earn-icon">∞</view>
          <text class="earn-name">引灵结缘</text>
          <text class="earn-desc">每邀 1 缘主 +50 ¤</text>
          <text class="earn-cta">前往邀请</text>
        </view>
        <view class="earn-card disabled">
          <view class="earn-icon">▶</view>
          <text class="earn-name">观看灵感</text>
          <text class="earn-desc">每日上限 100 ¤（阶段二开放）</text>
          <text class="earn-cta">即将开放</text>
        </view>
        <view class="earn-card" @click="goInvite">
          <view class="earn-icon">⚜</view>
          <text class="earn-name">分享神谕</text>
          <text class="earn-desc">每日上限 30 ¤</text>
          <text class="earn-cta">前往分享</text>
        </view>
      </view>

      <!-- 流水 -->
      <text class="section-title">灵犀流水</text>
      <view v-if="txLoading && !transactions.length" class="loading-state">
        <view class="skeleton" />
        <view class="skeleton" />
        <view class="skeleton" />
      </view>
      <view v-else-if="!transactions.length" class="empty-state">
        <text>尚未有灵犀流转</text>
      </view>
      <view v-else class="tx-list">
        <view v-for="tx in transactions" :key="tx.id" class="tx-row">
          <view class="tx-left">
            <text class="tx-type" :class="{ spend: tx.amount < 0 }">{{
              txTypeLabel(tx.type)
            }}</text>
            <text class="tx-desc">{{ tx.description || txTypeLabel(tx.type) }}</text>
            <text class="tx-time">{{ formatTime(tx.created_at) }}</text>
          </view>
          <view class="tx-right">
            <text class="tx-amount" :class="{ minus: tx.amount < 0 }">{{
              formatAmount(tx.amount)
            }}</text>
            <text class="tx-balance">余额 {{ tx.balance_after.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <view
        v-if="transactions.length && transactions.length < txTotal"
        class="load-more"
        @click="loadMore"
      >
        <text>{{ txLoading ? "加载中..." : "加载更早记录" }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * P10 积分中心 / 灵犀本源
 * - 大号余额卡 + 累计获取/消耗/连续签到
 * - 7 日签到节律格子（状态：已完成 / 今日 / 未来）
 * - 汲取灵力按钮（调 POST /points/checkin）
 * - 获取途径 4 卡片
 * - 流水列表（分页加载更多）
 */
import { computed, onMounted, ref } from "vue";
import { usePointsStore } from "@/stores/points";
import { useUserStore } from "@/stores/user";
import type { PointsTransaction } from "@/types/api";
import { errorMessage } from "@/types/errors";

const pointsStore = usePointsStore();
const userStore = useUserStore();

const STREAK_REWARDS = [5, 8, 10, 12, 15, 18, 20];

const checkinLoading = ref(false);
const txLoading = ref(false);

const balanceFormatted = computed(() =>
  (pointsStore.balance || 0).toLocaleString(),
);

const transactions = computed(() => pointsStore.transactions);
const txTotal = computed(() => pointsStore.txTotal);

const checkinDone = computed(
  () => pointsStore.checkinStatus?.checked_in_today ?? false,
);

const consecutiveDays = computed(
  () => pointsStore.checkinStatus?.consecutive_days ?? 0,
);

const todayReward = computed(() => {
  const today = pointsStore.checkinStatus?.today_reward;
  if (today !== undefined && today !== null) return today;
  // fallback 推算
  const idx = Math.min(consecutiveDays.value, 6);
  return STREAK_REWARDS[idx];
});

// 7 日签到格子状态
const checkinWeek = computed(() => {
  const days = consecutiveDays.value;
  const doneCountBefore = checkinDone.value ? days : Math.max(0, days);
  return STREAK_REWARDS.map((reward, i) => {
    const dayNumber = i + 1;
    let done = false;
    let today = false;
    let future = false;
    if (checkinDone.value) {
      done = dayNumber <= doneCountBefore;
      future = dayNumber > doneCountBefore;
    } else {
      done = dayNumber <= doneCountBefore;
      today = dayNumber === doneCountBefore + 1;
      future = dayNumber > doneCountBefore + 1;
    }
    return { reward, done, today, future };
  });
});

// 累计获取/消耗（从流水聚合，仅作展示）
const earnedTotal = computed(() => {
  let sum = 0;
  for (const t of transactions.value) if (t.amount > 0) sum += t.amount;
  // 如果流水未加载完，使用 balance 作为估计下限
  return sum || pointsStore.balance;
});

const spentTotal = computed(() => {
  let sum = 0;
  for (const t of transactions.value) if (t.amount < 0) sum += -t.amount;
  return sum;
});

// ============ 交互 ============
async function acquireAether() {
  if (checkinDone.value || checkinLoading.value) return;
  checkinLoading.value = true;
  try {
    const data = await pointsStore.checkin();
    if (data) {
      uni.showToast({
        title: `+${data.points_earned} ¤ · 连续 ${data.consecutive_days} 日`,
        icon: "none",
        duration: 1500,
      });
      userStore.updatePoints(data.balance);
      // 刷新流水与状态
      await Promise.all([
        pointsStore.fetchCheckinStatus().catch(() => void 0),
        pointsStore.fetchTransactions(1, 20).catch(() => void 0),
      ]);
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

async function loadMore() {
  if (txLoading.value) return;
  txLoading.value = true;
  try {
    await pointsStore.fetchTransactions(pointsStore.txPage + 1, 20);
  } finally {
    txLoading.value = false;
  }
}

function goInvite() {
  uni.navigateTo({ url: "/sub-user/pages/invite/invite" });
}

// ============ 数据格式化 ============
const TX_TYPE_LABEL: Record<string, string> = {
  register_bonus: "注册赠送",
  daily_checkin: "每日签到",
  share_reward: "分享奖励",
  ad_reward: "广告奖励",
  invite_reward: "邀请奖励",
  unlock_template: "启封模块",
  ai_reading: "神谕推演",
  refund: "退还积分",
};

function txTypeLabel(type: string) {
  return TX_TYPE_LABEL[type] || type;
}

function formatAmount(n: number) {
  return (n > 0 ? "+" : "") + n;
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 3600 * 1000;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (diff < day && d.getDate() === new Date().getDate()) {
    return `今日 ${hh}:${mm}`;
  }
  if (diff < 2 * day) return `昨日 ${hh}:${mm}`;
  if (diff < 7 * day)
    return `${Math.floor(diff / day)} 日前 ${hh}:${mm}`;
  return `${d.getMonth() + 1}-${d.getDate()} ${hh}:${mm}`;
}

// ============ 加载 ============
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/login" });
    return;
  }
  txLoading.value = true;
  try {
    await Promise.all([
      pointsStore.fetchBalance().catch(() => void 0),
      pointsStore.fetchCheckinStatus().catch(() => void 0),
      pointsStore.fetchTransactions(1, 20).catch(() => void 0),
    ]);
  } finally {
    txLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 40px;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
  font-family: "Noto Serif SC", serif;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

/* 大号积分展板 */
.points-hero {
  position: relative;
  padding: 32px 24px;
  text-align: center;
  background: linear-gradient(
    135deg,
    rgba(10, 10, 15, 0.9),
    rgba(10, 10, 15, 0.4)
  );
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 16px;
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: inset 0 0 40px rgba(212, 175, 55, 0.06);
}

.points-hero-watermark {
  position: absolute;
  right: -30px;
  top: -30px;
  font-size: 180px;
  line-height: 1;
  color: rgba(212, 175, 55, 0.04);
  transform: rotate(15deg);
  pointer-events: none;
}

.points-hero-content {
  position: relative;
  z-index: 2;
}

.points-hero-label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
  margin-bottom: 12px;
}

.points-hero-data {
  display: flex;
  justify-content: center;
  align-items: baseline;
  margin-bottom: 4px;
}

.points-hero-value {
  font-size: 56px;
  color: #d4af37;
  font-weight: 300;
  letter-spacing: 2px;
  line-height: 1;
}

.points-hero-unit {
  font-size: 24px;
  color: #d4af37;
}

.points-hero-meta {
  display: flex;
  justify-content: space-around;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid rgba(212, 175, 55, 0.1);
}

.hero-meta-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.hero-meta-val {
  color: #d4af37;
  font-size: 16px;
  font-weight: 600;
}

.hero-meta-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

/* 区块标题 */
.section-title {
  display: block;
  font-size: 12px;
  color: #d4af37;
  letter-spacing: 4px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  margin-bottom: 16px;
}

/* 7 日签到格 */
.checkin-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 16px;
}

.checkin-day {
  padding: 14px 0;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;

  &.done {
    background: rgba(212, 175, 55, 0.1);
    border-color: #d4af37;
  }

  &.today {
    border-color: #d4af37;
    box-shadow: 0 0 14px rgba(212, 175, 55, 0.25);
    animation: pulse-today 2s ease-in-out infinite;
  }

  &.future {
    opacity: 0.5;
  }
}

@keyframes pulse-today {
  0%,
  100% {
    box-shadow: 0 0 14px rgba(212, 175, 55, 0.25);
  }
  50% {
    box-shadow: 0 0 22px rgba(212, 175, 55, 0.5);
  }
}

.checkin-day-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.checkin-day-val {
  font-size: 13px;
  color: #d4af37;
  font-weight: 600;
}

/* 签到大按钮 */
.sign-btn {
  display: block;
  text-align: center;
  padding: 14px;
  margin-bottom: 32px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 14px;
  letter-spacing: 4px;
  background: transparent;
  box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.05);
  cursor: pointer;

  &:active:not(.disabled) {
    background: rgba(212, 175, 55, 0.1);
    box-shadow:
      0 0 30px rgba(212, 175, 55, 0.2),
      inset 0 0 20px rgba(212, 175, 55, 0.2);
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

/* 获取途径 */
.earn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 32px;
}

.earn-card {
  padding: 18px 14px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  &:active {
    border-color: rgba(212, 175, 55, 0.4);
  }

  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.earn-icon {
  width: 36px;
  height: 36px;
  border: 1px solid #d4af37;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4af37;
  font-size: 16px;
  margin-bottom: 4px;
}

.earn-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1px;
}

.earn-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  min-height: 28px;
  padding: 0 4px;
}

.earn-cta {
  display: inline-block;
  padding: 4px 14px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  border-radius: 99px;
  font-size: 10px;
  letter-spacing: 1px;
}

/* 流水列表 */
.tx-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: rgba(212, 175, 55, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.tx-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: rgba(10, 10, 15, 0.7);
}

.tx-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.tx-type {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(212, 175, 55, 0.1);
  color: #d4af37;
  border-radius: 4px;
  letter-spacing: 1px;

  &.spend {
    background: rgba(255, 180, 180, 0.05);
    color: rgba(255, 150, 150, 0.9);
  }
}

.tx-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.tx-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
}

.tx-right {
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
}

.tx-amount {
  font-size: 16px;
  color: #d4af37;
  font-weight: 600;

  &.minus {
    color: rgba(255, 150, 150, 0.9);
  }
}

.tx-balance {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.load-more {
  display: block;
  margin: 24px auto 0;
  padding: 10px 32px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  background: transparent;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 2px;
  width: fit-content;
  text-align: center;
  cursor: pointer;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton {
  height: 70px;
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

.empty-state {
  padding: 40px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  letter-spacing: 2px;
}
</style>
