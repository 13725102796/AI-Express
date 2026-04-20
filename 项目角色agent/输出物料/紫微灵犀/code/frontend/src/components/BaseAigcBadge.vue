<template>
  <!-- fixed-corner：页面级右下固定徽章（位置 1，PRD Q7 硬约束） -->
  <view v-if="position === 'fixed-corner'" class="aigc-badge-fixed">
    <text class="aigc-icon">⚠</text>
    <text class="aigc-text">{{ text }}</text>
  </view>

  <!-- inline：卡片底部内联声明（位置 2） -->
  <view v-else-if="position === 'inline'" class="aigc-badge-inline">
    <text class="aigc-icon">⚠</text>
    <text class="aigc-text">{{ text }}</text>
  </view>

  <!-- watermark：分享卡水印（位置 3，不可裁剪） -->
  <view v-else-if="position === 'watermark'" class="aigc-badge-watermark">
    <text class="aigc-text">{{ watermarkText }}</text>
  </view>
</template>

<script setup lang="ts">
/**
 * AIGC 标识徽章 — PRD Q7 三层防护硬约束
 * - fixed-corner：页面级右下角徽章
 * - inline：卡片底部声明栏
 * - watermark：分享卡底部水印（不可裁剪）
 */
interface Props {
  position?: "fixed-corner" | "inline" | "watermark";
  model?: string;
  watermarkText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  position: "fixed-corner",
  // 保留 model prop（向后兼容）但徽章文本不再暴露具体模型，统一显示品牌名
  model: "",
  watermarkText: "本内容由 AI 生成 · 仅供文化娱乐参考",
});

import { computed } from "vue";
// 商业策略：徽章只展示品牌「灵犀神谕」+ AI 标识，不暴露底层模型（gemini/openai 等）
// 如需后台审计真实 model 名，看 DB report.model_name 字段
const text = computed(() => {
  void props.model; // 显式忽略，避免 lint 警告
  return "AI 灵犀神谕";
});
</script>

<style lang="scss" scoped>
.aigc-badge-fixed {
  position: fixed;
  right: 16px;
  bottom: 80px;
  z-index: 999;
  padding: 8px 12px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 99px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 10px;
  color: #d4af37;
  letter-spacing: 1px;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.aigc-badge-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  margin-top: 16px;
  border-top: 1px dashed rgba(212, 175, 55, 0.2);
  font-size: 10px;
  color: rgba(212, 175, 55, 0.6);
  letter-spacing: 1px;
  font-style: italic;
}

.aigc-badge-watermark {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  color: rgba(212, 175, 55, 0.35);
  letter-spacing: 2px;
  pointer-events: none;
}

.aigc-icon {
  font-size: 10px;
}

.aigc-text {
  font-family: "Noto Serif SC", serif;
}
</style>
