<template>
  <view class="bg-ambient" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * 顶部环境光晕层
 * 径向渐变 radial-gradient 营造金色神秘感
 */
</script>

<style lang="scss" scoped>
.bg-ambient {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
  background-image: radial-gradient(
    circle at 50% -20%,
    rgba(212, 175, 55, 0.08) 0%,
    transparent 70%
  );
}
</style>
