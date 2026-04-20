<template>
  <view class="corner-dec" :class="positionClass" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed } from "vue";

/**
 * 四角金色装饰（L 形角线）
 */
interface Props {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: number; // px
}

const props = withDefaults(defineProps<Props>(), {
  position: "top-left",
  size: 60,
});

const positionClass = computed(() => `pos-${props.position}`);
</script>

<style lang="scss" scoped>
.corner-dec {
  position: fixed;
  width: 60px;
  height: 60px;
  pointer-events: none;
  z-index: 50;
}

.pos-top-left {
  top: 16px;
  left: 16px;
  border-top: 1px solid #d4af37;
  border-left: 1px solid #d4af37;
}

.pos-top-right {
  top: 16px;
  right: 16px;
  border-top: 1px solid #d4af37;
  border-right: 1px solid #d4af37;
}

.pos-bottom-left {
  bottom: 16px;
  left: 16px;
  border-bottom: 1px solid #d4af37;
  border-left: 1px solid #d4af37;
}

.pos-bottom-right {
  bottom: 16px;
  right: 16px;
  border-bottom: 1px solid #d4af37;
  border-right: 1px solid #d4af37;
}
</style>
