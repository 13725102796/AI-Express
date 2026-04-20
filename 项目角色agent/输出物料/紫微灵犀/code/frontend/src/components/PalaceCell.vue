<template>
  <view
    class="palace-cell"
    :class="{
      'is-body': palace?.isBodyPalace,
      'is-command': isCommand,
      'is-active-decadal': activeDecadal,
    }"
    @click="onTap"
  >
    <!-- 顶部：辅星 minorStars（带亮度+四化），密集横排 -->
    <view v-if="palace?.minorStars?.length" class="row row-minor">
      <text
        v-for="(s, i) in palace.minorStars"
        :key="'min-' + i"
        class="star star-minor"
      >
        {{ s.name }}<text v-if="s.mutagen" class="mut">{{ s.mutagen }}</text>
      </text>
    </view>

    <!-- 中央：主星 majorStars（每星单行：名 + 亮度 + 四化） -->
    <view v-if="palace?.majorStars?.length" class="major-block">
      <view
        v-for="(s, i) in palace.majorStars"
        :key="'maj-' + i"
        class="star-line"
      >
        <text class="star star-major" :class="brightnessClass(s.brightness)">{{ s.name }}</text>
        <text v-if="s.brightness" class="bright">·{{ s.brightness }}</text>
        <text v-if="s.mutagen" class="mut-box">{{ s.mutagen }}</text>
      </view>
    </view>
    <view v-else class="major-block">
      <text class="star-empty">空</text>
    </view>

    <!-- 杂耀 adjectiveStars（小字灰色） -->
    <view v-if="palace?.adjectiveStars?.length" class="row row-adj">
      <text
        v-for="(s, i) in palace.adjectiveStars"
        :key="'adj-' + i"
        class="star-adj"
      >{{ s.name }}</text>
    </view>

    <!-- 神煞简显（长生 + 博士 + 将前 + 岁前） -->
    <view v-if="hasShensha" class="row row-shensha">
      <text v-if="palace?.changsheng12" class="shensha cs">{{ palace.changsheng12 }}</text>
      <text v-if="palace?.boshi12" class="shensha bs">{{ palace.boshi12 }}</text>
      <text v-if="palace?.jiangqian12" class="shensha jq">{{ palace.jiangqian12 }}</text>
      <text v-if="palace?.suiqian12" class="shensha sq">{{ palace.suiqian12 }}</text>
    </view>

    <!-- 流年（前 5 个虚岁） -->
    <view v-if="palace?.ages?.length" class="row row-ages">
      <text class="ages">{{ palace.ages.slice(0, 5).join(",") }}</text>
    </view>

    <!-- 底部：宫位名 + 干支 + 大限 -->
    <view class="palace-foot">
      <view class="foot-left">
        <text class="palace-name">{{ palace?.name || "--" }}</text>
        <text class="palace-stem"
          >{{ palace?.heavenlyStem || "" }}{{ palace?.earthlyBranch || "" }}</text
        >
      </view>
      <text v-if="hasDecadal" class="decadal">{{ decadalText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 单个宫位格子（紫微斗数标准布局）
 * 显示顺序（自顶向下）：
 *   1. 辅星行（minorStars + mutagen）
 *   2. 主星块（每星：名 + 亮度 + 四化徽标）
 *   3. 杂耀行（adjectiveStars）
 *   4. 神煞行（长生/博士/将前/岁前）
 *   5. 流年行（ages 前 5 个虚岁）
 *   6. 宫位脚（宫名 + 干支 + 大限范围）
 *
 * 特殊状态：
 * - is-body: 身宫，金色内影
 * - is-command: 命宫，金框高亮
 * - is-active-decadal: 当前大限行宫，脉冲边
 *
 * 主星按亮度着色：庙/旺=高亮金，得/利/平=白，闲=暗白，陷=红调
 * 四化（禄/权/科/忌）：右上小徽标，金边
 */
import { computed } from "vue";
import type { ChartPalace } from "@/types/api";

interface Props {
  palace?: ChartPalace;
  isCommand?: boolean;
  activeDecadal?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "select-palace", palace: ChartPalace): void;
}>();

function onTap() {
  if (props.palace) emit("select-palace", props.palace);
}

function brightnessClass(b?: string): string {
  if (!b) return "";
  if (b === "庙" || b === "旺") return "bright-strong";
  if (b === "陷") return "bright-weak";
  if (b === "闲") return "bright-dim";
  return "bright-mid";
}

const hasDecadal = computed(() => {
  const r = props.palace?.decadal?.range;
  return !!r && (r[0] || r[1]);
});

const decadalText = computed(() => {
  const r = props.palace?.decadal?.range;
  if (!r) return "";
  return `${r[0]}-${r[1]}`;
});

const hasShensha = computed(
  () =>
    !!props.palace?.changsheng12 ||
    !!props.palace?.boshi12 ||
    !!props.palace?.jiangqian12 ||
    !!props.palace?.suiqian12,
);
</script>

<style lang="scss" scoped>
.palace-cell {
  position: relative;
  padding: 3px 2px;
  border-right: 1px solid rgba(212, 175, 55, 0.12);
  border-bottom: 1px solid rgba(212, 175, 55, 0.12);
  background: rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.85);
  font-size: 9px;
  line-height: 1.22;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transition: border-color 0.2s;

  &:active {
    border-color: #d4af37;
    background: rgba(212, 175, 55, 0.06);
    z-index: 3;
    box-shadow: 0 0 12px rgba(212, 175, 55, 0.3);
  }

  &.is-body {
    box-shadow: inset 0 0 10px rgba(212, 175, 55, 0.2);
  }

  &.is-command {
    border-color: #d4af37;
    background: rgba(212, 175, 55, 0.08);

    .palace-name {
      color: #fff;
    }
  }

  &.is-active-decadal {
    box-shadow:
      0 0 0 1px rgba(212, 175, 55, 0.5),
      inset 0 0 8px rgba(212, 175, 55, 0.15);
  }
}

/* 行通用 */
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 2px;
  min-width: 0;
  width: 100%;
}

/* 辅星行 */
.row-minor .star-minor {
  font-size: 9px;
  color: rgba(220, 220, 235, 0.85);
}

/* 主星块 */
.major-block {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.star-line {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-wrap: wrap;
}

.star {
  /* 允许在 cell 边界换行，否则 nowrap 会被 overflow:hidden 裁掉 */
  word-break: break-all;
  overflow-wrap: anywhere;
}

.star-major {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}

.star-empty {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  font-style: italic;
}

.bright-strong {
  color: #d4af37;
  text-shadow: 0 0 4px rgba(212, 175, 55, 0.4);
}
.bright-mid {
  color: rgba(255, 255, 255, 0.92);
}
.bright-dim {
  color: rgba(255, 255, 255, 0.55);
}
.bright-weak {
  color: rgba(255, 130, 130, 0.85);
}

.bright {
  font-size: 8px;
  color: rgba(212, 175, 55, 0.65);
}

/* 四化徽标（行内） */
.mut {
  display: inline-block;
  font-size: 7px;
  color: #d4af37;
  margin-left: 1px;
}

.mut-box {
  display: inline-block;
  font-size: 7px;
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.55);
  border-radius: 2px;
  padding: 0 2px;
  line-height: 1.2;
}

/* 杂耀 */
.row-adj {
  gap: 0 4px;
}
.star-adj {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.45);
}

/* 神煞 */
.row-shensha {
  gap: 0 3px;
  border-top: 1px dashed rgba(212, 175, 55, 0.12);
  padding-top: 2px;
}
.shensha {
  font-size: 8px;
  color: rgba(212, 175, 55, 0.55);
  letter-spacing: 0;
}

/* 流年 */
.row-ages .ages {
  font-size: 8px;
  color: rgba(180, 180, 200, 0.6);
  letter-spacing: 0;
  font-family: "Cinzel", serif;
}

/* 宫位脚 */
.palace-foot {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-top: 1px solid rgba(212, 175, 55, 0.18);
  padding-top: 2px;
}

.foot-left {
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.palace-name {
  font-size: 10px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 0;
}

.palace-stem {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0;
}

.decadal {
  font-size: 8px;
  color: rgba(212, 175, 55, 0.55);
  font-family: "Cinzel", serif;
}

/* 桌面/平板放大（参考图比例） */
@media (min-width: 768px) {
  .palace-cell {
    padding: 6px 8px;
    font-size: 11px;
    gap: 3px;
  }
  .star-major {
    font-size: 14px;
  }
  .star-minor {
    font-size: 11px;
  }
  .star-adj,
  .shensha,
  .row-ages .ages,
  .decadal {
    font-size: 10px;
  }
  .palace-name {
    font-size: 13px;
  }
}
</style>
