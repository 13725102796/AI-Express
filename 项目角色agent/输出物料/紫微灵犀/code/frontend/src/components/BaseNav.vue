<template>
  <view class="nav" :class="{ 'nav-transparent': transparent }">
    <view class="nav-left" @click="onBack" v-if="showBack">
      <text class="nav-back">← {{ backText }}</text>
    </view>
    <view class="nav-brand" v-else>
      {{ brand }}
    </view>
    <view class="nav-subtitle" v-if="subtitle">{{ subtitle }}</view>
    <slot name="right" />
  </view>
</template>

<script setup lang="ts">
/**
 * 顶部导航栏
 * - 左：返回按钮 or 品牌
 * - 右：副标题或 slot
 */
interface Props {
  brand?: string;
  subtitle?: string;
  showBack?: boolean;
  backText?: string;
  transparent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  brand: "紫微灵犀",
  subtitle: "",
  showBack: false,
  backText: "返回主枢",
  transparent: false,
});

const emit = defineEmits<{
  (e: "back"): void;
}>();

function onBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: "/pages/index/index" });
  }
  emit("back");
}
</script>

<style lang="scss" scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.9),
    transparent
  );
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.nav-transparent {
  background: transparent;
  border-bottom-color: transparent;
}

.nav-brand {
  font-family: "Noto Serif SC", serif;
  font-size: 18px;
  font-weight: 600;
  color: #d4af37;
  letter-spacing: 2px;
}

.nav-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2px;
}

.nav-left {
  cursor: pointer;
  padding: 4px 8px;
  margin-left: -8px;
}

.nav-back {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 2px;
  transition: color 0.3s ease;
}

.nav-left:hover .nav-back,
.nav-left:active .nav-back {
  color: #d4af37;
}
</style>
