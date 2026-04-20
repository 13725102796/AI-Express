<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseCornerDec position="top-left" />
    <BaseCornerDec position="top-right" />
    <BaseCornerDec position="bottom-left" />
    <BaseCornerDec position="bottom-right" />

    <view class="nav">
      <text class="nav-brand">紫微灵犀</text>
      <text class="nav-step">相位校准 2/2</text>
    </view>

    <view class="container">
      <view class="compass-header">
        <view class="compass-icon">
          <text class="compass-glyph">☯</text>
        </view>
        <text class="header-title">锚定本我坐标</text>
        <text class="header-desc">请精确定位您的降生时空坐标以完成命盘引灵</text>
      </view>

      <view class="form-section">
        <!-- 性别 -->
        <text class="form-label">元辰属性</text>
        <view class="toggle-group">
          <view
            class="toggle-btn"
            :class="{ active: gender === 'male' }"
            @click="gender = 'male'"
          >
            <text>乾造（男）</text>
          </view>
          <view
            class="toggle-btn"
            :class="{ active: gender === 'female' }"
            @click="gender = 'female'"
          >
            <text>坤造（女）</text>
          </view>
        </view>

        <!-- 历法 -->
        <text class="form-label">历法历元</text>
        <view class="toggle-group">
          <view
            class="toggle-btn"
            :class="{ active: birthType === 'solar' }"
            @click="setBirthType('solar')"
          >
            <text>阳历（公历）</text>
          </view>
          <view
            class="toggle-btn"
            :class="{ active: birthType === 'lunar' }"
            @click="setBirthType('lunar')"
          >
            <text>阴历（农历）</text>
          </view>
        </view>

        <!-- 闰月（仅当该年该月恰为闰月号才显示，否则历法上不存在闰月歧义）-->
        <view v-if="isLeapMonthApplicable" class="leap-row">
          <view
            class="leap-checkbox"
            :class="{ checked: isLeapMonth }"
            @click="isLeapMonth = !isLeapMonth"
          >
            <text v-if="isLeapMonth" class="check-mark">✓</text>
          </view>
          <text class="leap-text"
            >本月为闰{{ birthMonth }}月（默认正{{ birthMonth }}月）</text
          >
        </view>

        <!-- 降生时刻 -->
        <text class="form-label">降生时刻</text>
        <view class="input-row">
          <picker
            class="picker-wrap flex-15"
            mode="selector"
            :range="yearLabels"
            :value="yearIdx"
            @change="onYearChange"
          >
            <view class="picker-inner">
              <text class="picker-text">{{ yearLabels[yearIdx] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <picker
            class="picker-wrap flex-1"
            mode="selector"
            :range="monthLabels"
            :value="monthIdx"
            @change="onMonthChange"
          >
            <view class="picker-inner">
              <text class="picker-text">{{ monthLabels[monthIdx] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <picker
            class="picker-wrap flex-1"
            mode="selector"
            :range="dayLabels"
            :value="dayIdx"
            @change="onDayChange"
          >
            <view class="picker-inner">
              <text class="picker-text">{{ dayLabels[dayIdx] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <view class="input-row">
          <picker
            class="picker-wrap flex-1"
            mode="selector"
            :range="timeLabels"
            :value="timeIdx"
            @change="onTimeChange"
          >
            <view class="picker-inner">
              <text class="picker-text">{{ timeLabels[timeIdx] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>

        <!-- 出生地（选填） -->
        <text class="form-label">出生地（选填）</text>
        <view class="input-row">
          <picker
            class="picker-wrap flex-1"
            mode="selector"
            :range="provinceLabels"
            :value="provinceIdx"
            @change="onProvinceChange"
          >
            <view class="picker-inner">
              <text class="picker-text">{{ provinceLabels[provinceIdx] }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
          <picker
            class="picker-wrap flex-1"
            mode="selector"
            :range="cityLabels"
            :value="cityIdx"
            @change="onCityChange"
          >
            <view class="picker-inner">
              <text class="picker-text">{{ cityLabels[cityIdx] || "—" }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
      </view>

      <BaseActionBtn
        :text="submitting ? '熔铸中...' : '熔铸命理法则 ✧'"
        :disabled="!canSubmit"
        :loading="submitting"
        size="lg"
        @click="submit"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * P06 生辰完善 / 锚点铸造
 * - 性别 / 阳阴历 / 年月日 / 时辰 / 出生地 / 闰月
 * - 接后端 PUT /api/v1/user/profile → 后端自动触发排盘
 */
import { computed, ref, watch } from "vue";
import { useUserStore } from "@/stores/user";
import { useChartStore } from "@/stores/chart";
import { errorMessage } from "@/types/errors";
import { getLeapMonth } from "@/utils/calendar";

const userStore = useUserStore();
const chartStore = useChartStore();

// 性别
const gender = ref<"male" | "female">("male");

// 历法
const birthType = ref<"solar" | "lunar">("solar");
const isLeapMonth = ref(false);
function setBirthType(t: "solar" | "lunar") {
  birthType.value = t;
  if (t === "solar") isLeapMonth.value = false;
}

// 年/月/日
const currentYear = new Date().getFullYear();
const yearLabels = computed(() => {
  const arr: string[] = [];
  for (let y = currentYear; y >= 1900; y--) arr.push(y + " 年");
  return arr;
});
const yearIdx = ref(Math.max(0, currentYear - 1995)); // 默认 1995

const monthLabels = Array.from({ length: 12 }, (_, i) => i + 1 + " 月");
const monthIdx = ref(9); // 10 月

const dayLabels = ref<string[]>([]);
const dayIdx = ref(14); // 15 日

function daysIn(year: number, month: number) {
  if ([1, 3, 5, 7, 8, 10, 12].includes(month)) return 31;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
}

function recomputeDays() {
  const year = currentYear - yearIdx.value;
  const month = monthIdx.value + 1;
  const max = daysIn(year, month);
  dayLabels.value = Array.from({ length: max }, (_, i) => i + 1 + " 日");
  if (dayIdx.value >= max) dayIdx.value = max - 1;
}

recomputeDays();

// ============ 闰月自动判定（仅农历）============
const birthYear = computed(() => currentYear - yearIdx.value);
const birthMonth = computed(() => monthIdx.value + 1);
const leapMonthOfYear = computed(() => getLeapMonth(birthYear.value));
// 仅当：阴历 + 该年有闰月 + 用户选的月份正好是闰月号 → 才需用户区分「正X月」/「闰X月」
const isLeapMonthApplicable = computed(
  () =>
    birthType.value === "lunar" &&
    leapMonthOfYear.value > 0 &&
    birthMonth.value === leapMonthOfYear.value,
);
// 月份不再可能为闰月时自动复位
watch(isLeapMonthApplicable, (canLeap) => {
  if (!canLeap) isLeapMonth.value = false;
});

function onYearChange(e: any) {
  yearIdx.value = Number(e.detail?.value ?? 0);
  recomputeDays();
}
function onMonthChange(e: any) {
  monthIdx.value = Number(e.detail?.value ?? 0);
  recomputeDays();
}
function onDayChange(e: any) {
  dayIdx.value = Number(e.detail?.value ?? 0);
}

// 时辰
const timeLabels = [
  "早子时（00:00-01:00）",
  "丑时（01:00-03:00）",
  "寅时（03:00-05:00）",
  "卯时（05:00-07:00）",
  "辰时（07:00-09:00）",
  "巳时（09:00-11:00）",
  "午时（11:00-13:00）",
  "未时（13:00-15:00）",
  "申时（15:00-17:00）",
  "酉时（17:00-19:00）",
  "戌时（19:00-21:00）",
  "亥时（21:00-23:00）",
  "晚子时（23:00-24:00）",
];
const timeIdx = ref(0);
function onTimeChange(e: any) {
  timeIdx.value = Number(e.detail?.value ?? 0);
}

// 省市（精简样例，选填）
const cityMap: Record<string, string[]> = {
  "": [],
  浙江: ["杭州", "宁波", "温州", "绍兴", "嘉兴"],
  北京: ["北京"],
  上海: ["上海"],
  广东: ["广州", "深圳", "东莞", "佛山"],
  江苏: ["南京", "苏州", "无锡", "常州"],
  四川: ["成都", "绵阳", "德阳"],
};
const provinceLabels = ["", "浙江", "北京", "上海", "广东", "江苏", "四川"];
const provinceIdx = ref(0);
const cityLabels = ref<string[]>([""]);
const cityIdx = ref(0);

function onProvinceChange(e: any) {
  provinceIdx.value = Number(e.detail?.value ?? 0);
  const p = provinceLabels[provinceIdx.value];
  cityLabels.value = p ? [""].concat(cityMap[p]) : [""];
  cityIdx.value = 0;
}
function onCityChange(e: any) {
  cityIdx.value = Number(e.detail?.value ?? 0);
}

// ============ 提交 ============
const submitting = ref(false);

const canSubmit = computed(() => {
  return (
    !submitting.value &&
    dayLabels.value.length > 0 &&
    timeIdx.value >= 0 &&
    timeIdx.value <= 12
  );
});

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const year = currentYear - yearIdx.value;
    const month = monthIdx.value + 1;
    const day = dayIdx.value + 1;

    const province = provinceLabels[provinceIdx.value] || undefined;
    const city = cityLabels.value[cityIdx.value] || undefined;

    await userStore.fetchMe().catch(() => void 0);

    // 调用档案接口
    const resp = await (await import("@/services/user")).userApi.upsertProfile({
      birth_type: birthType.value as any,
      birth_year: year,
      birth_month: month,
      birth_day: day,
      birth_time_index: timeIdx.value,
      gender: gender.value as any,
      is_leap_month: birthType.value === "lunar" ? isLeapMonth.value : undefined,
      birth_place_province: province,
      birth_place_city: city,
    });

    if (!resp.data) {
      uni.showToast({ title: "铸造失败，请重试", icon: "none" });
      return;
    }

    // 保存到 store
    userStore.profile = resp.data.profile;

    // 若后端未自动生成命盘则主动触发一次
    if (!resp.data.chart_generated) {
      await chartStore.regenerate().catch((e) => {
        console.warn("[setup] chart regenerate fail:", e);
      });
    } else {
      await chartStore.fetchMyChart().catch(() => void 0);
    }

    uni.showToast({ title: "命盘已凝结 ✦", icon: "none", duration: 1200 });
    setTimeout(() => uni.reLaunch({ url: "/pages/index/index" }), 500);
  } catch (err: any) {
    const code = err?.code;
    uni.showToast({
      title: err?.message || errorMessage(code) || "铸造失败",
      icon: "none",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
  padding-bottom: 80px;
}

.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent);
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.nav-brand {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 2px;
  font-family: "Noto Serif SC", serif;
}

.nav-step {
  color: #d4af37;
  font-size: 12px;
  letter-spacing: 4px;
}

.container {
  max-width: 500px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.compass-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.compass-icon {
  width: 60px;
  height: 60px;
  border: 1px solid #d4af37;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 8px;

  &::before {
    content: "";
    position: absolute;
    width: 80px;
    height: 80px;
    border: 1px dashed rgba(212, 175, 55, 0.4);
    border-radius: 50%;
    animation: compass-spin 20s linear infinite;
  }
}

.compass-glyph {
  font-size: 24px;
  color: #d4af37;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
}

@keyframes compass-spin {
  to {
    transform: rotate(360deg);
  }
}

.header-title {
  font-size: 20px;
  color: #fff;
  letter-spacing: 4px;
  font-weight: 300;
}

.header-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2px;
  line-height: 1.8;
  text-align: center;
}

.form-section {
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 12px;
  padding: 24px 20px;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 12px;
  color: #d4af37;
  letter-spacing: 4px;
  margin: 16px 0 12px;
  display: block;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  padding-bottom: 8px;
  text-align: center;

  &:first-child {
    margin-top: 0;
  }
}

.toggle-group {
  display: flex;
  gap: 12px;
  margin-bottom: 4px;
}

.toggle-btn {
  flex: 1;
  padding: 12px 0;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  font-size: 14px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  cursor: pointer;

  &.active {
    border-color: #d4af37;
    color: #d4af37;
    background: rgba(212, 175, 55, 0.05);
    box-shadow: inset 0 0 15px rgba(212, 175, 55, 0.1);
  }
}

.leap-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
}

.leap-checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  background: transparent;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;

  &.checked {
    background: #d4af37;
  }
}

.check-mark {
  position: absolute;
  inset: 0;
  color: #000;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 16px;
}

.leap-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 1px;
}

.input-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.picker-wrap {
  position: relative;
}

.flex-15 {
  flex: 1.5;
}

.flex-1 {
  flex: 1;
}

.picker-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
}

.picker-text {
  color: #fff;
  font-family: "Noto Serif SC", serif;
  font-size: 14px;
  letter-spacing: 1px;
}

.picker-arrow {
  font-size: 10px;
  color: rgba(212, 175, 55, 0.4);
  margin-left: 4px;
}
</style>
