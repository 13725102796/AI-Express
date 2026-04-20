<template>
  <view class="tab-bar">
    <view
      v-for="(item, i) in items"
      :key="item.key"
      class="tab-item"
      :class="{ active: item.key === active }"
      @click="onTap(item, i)"
    >
      <text class="tab-icon">{{ item.icon }}</text>
      <text class="tab-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 底部 Tab 栏（自定义渲染，非 uni pages.json tabBar）
 * 因为页面 navigationStyle=custom 且部分页面在分包中，
 * 主包/分包都用这个组件统一控制 4 Tab 视觉一致
 */
interface TabItem {
  key: "home" | "chart" | "reading" | "profile";
  text: string;
  icon: string;
  path: string;
}

interface Props {
  active: TabItem["key"];
}

defineProps<Props>();

const items: TabItem[] = [
  { key: "home", text: "主页", icon: "⌂", path: "/pages/index/index" },
  { key: "chart", text: "排盘", icon: "✧", path: "/sub-chart/pages/chart/chart" },
  { key: "reading", text: "解盘", icon: "◎", path: "/sub-reading/pages/reading/reading" },
  { key: "profile", text: "本我", icon: "👤", path: "/pages/profile/profile" },
];

function onTap(item: TabItem) {
  uni.switchTab?.({ url: item.path, fail: () => {} });
  uni.reLaunch({ url: item.path });
}
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(212, 175, 55, 0.15);
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.3);
  transition: color 0.3s ease;
}

.tab-item.active {
  color: #d4af37;
}

.tab-icon {
  font-size: 20px;
  line-height: 1;
}

.tab-text {
  font-size: 10px;
  letter-spacing: 2px;
}
</style>
