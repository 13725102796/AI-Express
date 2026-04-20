<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回主枢" subtitle="时空轮盘" />

    <view class="container">
      <!-- 用户信息条 -->
      <view class="user-strip" v-if="hasChart">
        <view class="user-strip-left">
          <text class="strip-label">缘主</text>
          <text class="strip-name">{{ displayName }}</text>
          <text class="strip-gender">（{{ genderLabel }}）</text>
        </view>
        <view class="user-strip-right">
          <text>{{ birthSummary }}</text>
        </view>
      </view>

      <!-- loaded -->
      <view v-if="hasChart" class="chart-stage">
        <view
          class="chart-viewport"
          @touchstart="onTouchStart"
          @touchmove.stop.prevent="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
        >
          <view
            class="chart-frame"
            :style="frameStyle"
          >
            <!-- 按 DOM 顺序发：巳/午/未/申/辰/[中宫]/酉/卯/戌/寅/丑/子/亥 -->
            <PalaceCell
              v-for="(branch, idx) in OUTER_ORDER_ROW1"
              :key="'r1-' + branch"
              :palace="byBranch[branch]"
              :is-command="isCommandBranch(branch)"
              @select-palace="openPalaceDetail"
            />
            <!-- row2: 辰 -->
            <PalaceCell
              :palace="byBranch['辰']"
              :is-command="isCommandBranch('辰')"
              @select-palace="openPalaceDetail"
            />
            <!-- 中宫 2x2 -->
            <view class="palace-center">
              <text class="center-title">紫微列阵</text>
              <view class="center-info">
                <view class="info-row">
                  <text class="info-key">姓名</text>
                  <text class="info-val"
                    >{{ displayName }} · {{ genderLabel }}</text
                  >
                </view>
                <view class="info-row">
                  <text class="info-key">阴历</text>
                  <text class="info-val">{{ basic?.lunarDate || "--" }} {{ basic?.time || "" }}</text>
                </view>
                <view class="info-row">
                  <text class="info-key">四柱</text>
                  <text class="info-val">{{ basic?.chineseDate || "--" }}</text>
                </view>
                <view class="info-row">
                  <text class="info-key">五行局</text>
                  <text class="info-val accent">{{ basic?.fiveElementsClass || "--" }}</text>
                </view>
                <view class="info-row">
                  <text class="info-key">命主</text>
                  <text class="info-val accent"
                    >{{ basic?.soulMaster || "--" }} · 身主：{{ basic?.bodyMaster || "--" }}</text
                  >
                </view>
                <view class="info-row">
                  <text class="info-key">斗君</text>
                  <text class="info-val"
                    >{{ basic?.douJun || "--" }}宫 · 身宫在 {{ bodyPalaceName }}</text
                  >
                </view>
                <view class="info-row" v-if="currentDecadalText">
                  <text class="info-key">当前大限</text>
                  <text class="info-val accent">{{ currentDecadalText }}</text>
                </view>
              </view>
            </view>
            <!-- row2: 酉 -->
            <PalaceCell
              :palace="byBranch['酉']"
              :is-command="isCommandBranch('酉')"
              @select-palace="openPalaceDetail"
            />
            <!-- row3: 卯 / [center continues] / 戌 -->
            <PalaceCell
              :palace="byBranch['卯']"
              :is-command="isCommandBranch('卯')"
              @select-palace="openPalaceDetail"
            />
            <PalaceCell
              :palace="byBranch['戌']"
              :is-command="isCommandBranch('戌')"
              @select-palace="openPalaceDetail"
            />
            <!-- row4: 寅 丑 子 亥 -->
            <PalaceCell
              v-for="branch in OUTER_ORDER_ROW4"
              :key="'r4-' + branch"
              :palace="byBranch[branch]"
              :is-command="isCommandBranch(branch)"
              @select-palace="openPalaceDetail"
            />
          </view>
        </view>

        <!-- 视角控件（桌面端 + 测试用；移动端已支持双指/单指拖） -->
        <view class="zoom-bar">
          <text class="zoom-btn" @click="zoomStep(-0.2)">−</text>
          <text class="zoom-reset" @click="resetView">{{ scaleText }}</text>
          <text class="zoom-btn" @click="zoomStep(0.2)">＋</text>
        </view>
      </view>

      <!-- loading -->
      <view v-else-if="loading" class="state-block">
        <view class="loading-orb" />
        <text class="state-text">命盘凝结中...</text>
      </view>

      <!-- empty -->
      <view v-else-if="empty" class="state-block">
        <text class="state-text state-text-main">尚未铸造命盘</text>
        <text class="state-text state-text-sub">前往锚定本我坐标以开启星盘推演</text>
        <view class="state-cta" @click="goSetup">前往锚定本我坐标</view>
      </view>

      <!-- error -->
      <view v-else class="state-block">
        <text class="state-error">星象暂迷 · 排盘服务暂时不可达</text>
        <view class="state-cta" @click="retry">重试凝结</view>
      </view>
    </view>

    <!-- 宫位详情 modal -->
    <view v-if="modalOpen" class="modal-mask" @click.self="closeModal">
      <view class="modal-card">
        <text class="modal-title">{{ modalPalace?.name }}</text>
        <text class="modal-stem"
          >{{ modalPalace?.heavenlyStem }}{{ modalPalace?.earthlyBranch }}</text
        >
        <view class="modal-row">
          <text class="modal-label">主星</text>
          <text class="modal-value">{{ modalMainStars || "—" }}</text>
        </view>
        <view class="modal-row">
          <text class="modal-label">辅星</text>
          <text class="modal-value">{{ modalMinorStars || "—" }}</text>
        </view>
        <view class="modal-row" v-if="modalPalace?.adjectiveStars?.length">
          <text class="modal-label">小星</text>
          <text class="modal-value">{{ modalAdjStars }}</text>
        </view>
        <view class="modal-row">
          <text class="modal-label">大限</text>
          <text class="modal-value">{{ modalDecadal }}</text>
        </view>
        <view class="modal-row" v-if="modalPalace?.ages?.length">
          <text class="modal-label">小限</text>
          <text class="modal-value">{{ (modalPalace?.ages || []).join(" · ") }}</text>
        </view>
        <view class="modal-close" @click="closeModal">闭合</view>
      </view>
    </view>

    <BaseTabBar active="chart" />
  </view>
</template>

<script setup lang="ts">
/**
 * P02 命盘 / 时空轮盘
 *
 * 布局：4x4 外圈 12 宫 + 中宫 2x2 合并（PRD 硬约束 9）
 * 宫位定位方式：按地支 → 固定网格位置，不依赖后端 palaces 数组顺序
 * 交互：点击宫位弹出详情 modal；双指缩放 / 单指拖动（缩放 >1 时）
 * 数据源：chartStore.fetchOrMock()（真实 API 优先，失败回退 mock）
 */
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useChartStore } from "@/stores/chart";
import { useUserStore } from "@/stores/user";
import type { ChartPalace } from "@/types/api";

const chartStore = useChartStore();
const userStore = useUserStore();
const { chart, loading, error } = storeToRefs(chartStore);

// ========== 宫位网格顺序 ==========
// 行 1（顶）：巳 午 未 申
const OUTER_ORDER_ROW1 = ["巳", "午", "未", "申"];
// 行 4（底）：寅 丑 子 亥
const OUTER_ORDER_ROW4 = ["寅", "丑", "子", "亥"];
// 行 2/3 左右（辰 酉 卯 戌）分别单独渲染配合中宫 span

const byBranch = computed(() => chartStore.palacesByBranch);
const basic = computed(() => chartStore.basic);
const hasChart = computed(() => chartStore.hasChart);
const empty = computed(() => !hasChart.value && !loading.value && !error.value);

const displayName = computed(() => {
  const u = userStore.user;
  return u?.nickname || "缘主";
});

const genderLabel = computed(() => {
  const g = basic.value?.gender;
  if (g === "男") return "乾造";
  if (g === "女") return "坤造";
  return "—";
});

const birthSummary = computed(() => {
  const c = chart.value?.api_params as
    | { birth_year?: number; birth_month?: number; birth_day?: number; birth_time_index?: number }
    | undefined;
  if (!c) return "";
  const y = c.birth_year || "----";
  const m = String(c.birth_month || "--").padStart(2, "0");
  const d = String(c.birth_day || "--").padStart(2, "0");
  return `${y}-${m}-${d} · ${basic.value?.time || ""}`;
});

const bodyPalaceName = computed(() => {
  const branch = basic.value?.earthlyBranchOfBodyPalace;
  if (!branch) return "—";
  return byBranch.value[branch]?.name || branch;
});

const currentDecadalText = computed(() => {
  // MVP：取命宫大限作为"当前大限"展示（真实流年计算 Round 3+ 接后端 age 字段）
  const command = chartStore.palaces.find((p) => p.name === "命宫");
  const r = command?.decadal?.range;
  if (!r) return "";
  return `${r[0]}-${r[1]}（${command?.name}）`;
});

function isCommandBranch(branch: string): boolean {
  return byBranch.value[branch]?.name === "命宫";
}

// ========== Modal ==========
const modalOpen = ref(false);
const modalPalace = ref<ChartPalace | null>(null);

function openPalaceDetail(palace: ChartPalace) {
  modalPalace.value = palace;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

const modalMainStars = computed(() => {
  const stars = modalPalace.value?.majorStars || [];
  return stars
    .map(
      (s) =>
        s.name +
        (s.brightness ? `（${s.brightness}）` : "") +
        (s.mutagen ? ` · ${s.mutagen}` : ""),
    )
    .join(" · ");
});

const modalMinorStars = computed(() =>
  (modalPalace.value?.minorStars || []).map((s) => s.name).join(" · "),
);

const modalAdjStars = computed(() =>
  (modalPalace.value?.adjectiveStars || []).map((s) => s.name).join(" · "),
);

const modalDecadal = computed(() => {
  const r = modalPalace.value?.decadal?.range;
  if (!r) return "—";
  return `${r[0]}-${r[1]} 岁`;
});

// ========== 缩放 / 拖动 ==========
const scale = ref(1);
const tx = ref(0);
const ty = ref(0);
const scaleText = computed(() => `${Math.round(scale.value * 100)}%`);

const frameStyle = computed(() => ({
  transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
}));

const SCALE_MIN = 0.8;
const SCALE_MAX = 2.5;

function clampScale(v: number) {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, v));
}

// 触摸手势状态
let initialDist = 0;
let initialScale = 1;
let startX = 0;
let startY = 0;
let startTx = 0;
let startTy = 0;
let mode: "none" | "pan" | "pinch" = "none";

function readPoint(t: any) {
  // pageX 跨端最稳定（H5 / mp-weixin 一致）
  return { x: t.pageX ?? t.clientX ?? 0, y: t.pageY ?? t.clientY ?? 0 };
}

function distance(a: any, b: any) {
  const pa = readPoint(a);
  const pb = readPoint(b);
  const dx = pa.x - pb.x;
  const dy = pa.y - pb.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function onTouchStart(e: any) {
  const touches = e.touches || e.changedTouches || [];
  if (touches.length >= 2) {
    mode = "pinch";
    initialDist = distance(touches[0], touches[1]) || 1;
    initialScale = scale.value;
  } else if (touches.length === 1 && scale.value > 1) {
    mode = "pan";
    const p = readPoint(touches[0]);
    startX = p.x;
    startY = p.y;
    startTx = tx.value;
    startTy = ty.value;
  } else {
    mode = "none";
  }
}

function onTouchMove(e: any) {
  const touches = e.touches || [];
  if (mode === "pinch" && touches.length >= 2) {
    const d = distance(touches[0], touches[1]);
    scale.value = clampScale(initialScale * (d / initialDist));
  } else if (mode === "pan" && touches.length === 1) {
    const p = readPoint(touches[0]);
    tx.value = startTx + (p.x - startX);
    ty.value = startTy + (p.y - startY);
  }
}

function onTouchEnd() {
  mode = "none";
  // scale 回到 1 时归位，避免 pan 视角悬空
  if (scale.value <= 1.01) {
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
  }
}

function zoomStep(delta: number) {
  scale.value = clampScale(scale.value + delta);
  if (scale.value <= 1.01) {
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
  }
}

function resetView() {
  scale.value = 1;
  tx.value = 0;
  ty.value = 0;
}

// ========== 空/错状态动作 ==========
function goSetup() {
  uni.navigateTo({ url: "/pages/profile-setup/profile-setup" });
}

function retry() {
  chartStore.fetchMyChart().catch(() => void 0);
}

// ========== 生命周期 ==========
onMounted(() => {
  // 严禁 mock：只 fetch 真实命盘，失败由 error 状态提示用户
  chartStore.fetchMyChart().catch(() => void 0);
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 80px;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
}

.container {
  max-width: 760px;
  margin: 0 auto;
  padding: 16px;
}

// ===== 用户信息条 =====
.user-strip {
  padding: 12px 16px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
}

.strip-label {
  color: #d4af37;
  font-weight: 600;
  margin-right: 6px;
}

.strip-name {
  color: rgba(255, 255, 255, 0.9);
}

.strip-gender {
  color: rgba(255, 255, 255, 0.5);
}

.user-strip-right {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
}

// ===== 命盘舞台（含 transform） =====
.chart-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  /* 突破 .container 的 16px 左右 padding，让 chart 接近屏幕宽 */
  margin-left: -12px;
  margin-right: -12px;
}

.chart-viewport {
  width: 100%;
  /* 移动端：380px（屏幕 390 → 左右各 5px 余白） */
  max-width: 380px;
  margin: 0 auto;
  overflow: visible;
  touch-action: none; // 交给我们自己处理手势（H5 端阻止系统缩放）
}

.chart-frame {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  /* 行高最少 130px（给信息呼吸感），有内容超长再撑开 */
  grid-auto-rows: minmax(130px, auto);
  gap: 0;
  /* 移除强制宽高比，由内容决定整体高度 */
  width: 100%;
  background: rgba(10, 10, 15, 0.4);
  border: 1px solid rgba(212, 175, 55, 0.4);
  padding: 0;
  border-radius: 4px;
  transform-origin: center center;
  transition: transform 0.1s linear;
  will-change: transform;
}

/* 桌面/平板回归正方形（标准紫微盘比例） */
@media (min-width: 768px) {
  .chart-frame {
    aspect-ratio: 1 / 1;
    gap: 4px;
    padding: 4px;
  }
}

// ===== 中宫 =====
.palace-center {
  grid-column: 2 / 4;
  grid-row: 2 / 4;
  background: rgba(212, 175, 55, 0.04);
  border: 1px solid rgba(212, 175, 55, 0.4);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  overflow: hidden;
}

.center-title {
  font-size: 15px;
  color: #d4af37;
  letter-spacing: 4px;
  font-weight: 600;
  margin-bottom: 4px;
  font-family: "Noto Serif SC", serif;
}

.center-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.info-row {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  letter-spacing: 0.5px;
}

.info-key {
  color: rgba(212, 175, 55, 0.55);
  min-width: 44px;
  text-align: right;
}

.info-val {
  color: rgba(255, 255, 255, 0.85);
  text-align: left;
}

.info-val.accent {
  color: #d4af37;
}

// ===== 缩放控件 =====
.zoom-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.6);
  font-size: 12px;
}

.zoom-btn {
  display: inline-block;
  width: 22px;
  height: 22px;
  text-align: center;
  line-height: 22px;
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 50%;
  cursor: pointer;
  user-select: none;
}

.zoom-reset {
  min-width: 48px;
  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  cursor: pointer;
}

// ===== 状态块（loading / empty / error） =====
.state-block {
  aspect-ratio: 1 / 1;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 32px;
  text-align: center;
}

.loading-orb {
  width: 54px;
  height: 54px;
  border: 1px solid #d4af37;
  border-radius: 50%;
  animation: orb-spin 4s linear infinite;
}

@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}

.state-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
}

.state-text-main {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 3px;
}

.state-text-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 1px;
  margin-top: 8px;
  cursor: pointer;
}

.state-error {
  font-size: 13px;
  color: #ff6666;
  letter-spacing: 2px;
}

.state-cta {
  display: inline-block;
  padding: 10px 28px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 4px;
  cursor: pointer;
  transition: background 0.3s ease;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}

// ===== 宫位详情 modal =====
.modal-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-card {
  background: rgba(10, 10, 15, 0.92);
  border: 1px solid #d4af37;
  padding: 28px 22px 24px;
  max-width: 420px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 12px;
  box-shadow: 0 0 40px rgba(212, 175, 55, 0.2);
  font-family: "Noto Serif SC", serif;
  display: flex;
  flex-direction: column;
}

.modal-title {
  font-size: 18px;
  color: #d4af37;
  letter-spacing: 4px;
  text-align: center;
  margin-bottom: 6px;
  font-weight: 600;
}

.modal-stem {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.modal-row {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid rgba(212, 175, 55, 0.1);
  font-size: 12px;
}

.modal-label {
  color: #d4af37;
  min-width: 56px;
  letter-spacing: 1px;
}

.modal-value {
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  flex: 1;
}

.modal-close {
  align-self: center;
  margin-top: 22px;
  padding: 8px 28px;
  border: 1px solid rgba(212, 175, 55, 0.5);
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 4px;
  cursor: pointer;
  transition: background 0.3s ease;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}
</style>
