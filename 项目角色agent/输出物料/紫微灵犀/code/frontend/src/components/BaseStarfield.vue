<template>
  <view class="starfield" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * 星空背景层 — fixed inset:0 / z-index: -2
 * 使用 CSS 背景而非 Canvas，性能友好且双端通用
 * 图案来源：page-specs.md 第 0.4 节 + demo 提取
 */
</script>

<style lang="scss" scoped>
.starfield {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
  pointer-events: none;
  background-color: #000000;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Ccircle cx='50' cy='150' r='1' fill='rgba(212,175,55,0.4)'/%3E%3Ccircle cx='300' cy='80' r='1.5' fill='rgba(255,255,255,0.6)'/%3E%3Ccircle cx='120' cy='320' r='0.5' fill='rgba(212,175,55,0.2)'/%3E%3Ccircle cx='380' cy='380' r='0.8' fill='rgba(255,255,255,0.3)'/%3E%3Ccircle cx='220' cy='200' r='0.5' fill='rgba(212,175,55,0.5)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}
</style>
