<template>
  <view class="admin-layout">
    <BaseStarfield />

    <!-- 侧边栏 -->
    <aside class="sidebar">
      <view class="side-logo">
        <text class="side-logo-title">紫微灵犀</text>
        <text class="side-logo-sub">主控核心</text>
      </view>
      <view class="side-menu">
        <view
          v-for="m in menu"
          :key="m.key"
          class="side-item"
          :class="{ active: m.key === active }"
          @click="go(m)"
        >
          <text>{{ m.label }}</text>
        </view>
        <view class="side-divider" />
        <view class="side-item" @click="logout">
          <text>切断接入</text>
        </view>
      </view>
    </aside>

    <!-- 主区 -->
    <view class="main">
      <view class="topbar">
        <text class="topbar-title">{{ topTitle }}</text>
        <view class="topbar-user">
          <text class="topbar-op">操守者：{{ adminName }}</text>
          <view class="topbar-logout" @click="logout">
            <text>退出</text>
          </view>
        </view>
      </view>
      <view class="content">
        <slot />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * BaseAdminShell：管理后台统一布局（侧边栏 + 顶栏）
 * 所有 pages-admin/** 页面都用 <BaseAdminShell active="xx" topTitle="xx"> 包裹
 */
import { computed } from "vue";
import { adminLogout } from "@/utils/admin-guard";
import { getItem, STORAGE_KEYS } from "@/utils/storage";

interface Props {
  active: "stats" | "templates" | "points" | "users";
  topTitle?: string;
}
const props = withDefaults(defineProps<Props>(), { topTitle: "主控核心" });

const menu: Array<{
  key: Props["active"];
  label: string;
  path: string;
}> = [
  { key: "stats", label: "数据概览", path: "/pages-admin/stats/stats" },
  {
    key: "templates",
    label: "神谕模块管理",
    path: "/pages-admin/templates/templates",
  },
  {
    key: "points",
    label: "灵犀经济配置",
    path: "/pages-admin/points-config/points-config",
  },
  { key: "users", label: "缘主管理", path: "/pages-admin/users/users" },
];

const adminName = computed(() => {
  const b = getItem<{ username?: string }>(STORAGE_KEYS.ADMIN_BRIEF);
  return b?.username || "admin";
});

function go(item: { key: string; path: string }) {
  if (item.key === props.active) return;
  uni.reLaunch({ url: item.path });
}

function logout() {
  uni.showModal({
    title: "切断接入？",
    content: "将返回登录页",
    confirmText: "切断",
    success: (r) => {
      if (r.confirm) adminLogout();
    },
  });
}
</script>

<style lang="scss" scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
  font-family: "Noto Serif SC", serif;
}

.sidebar {
  width: 200px;
  min-height: 100vh;
  background: rgba(10, 10, 15, 0.9);
  border-right: 1px solid rgba(212, 175, 55, 0.4);
  padding: 24px 0;
  flex-shrink: 0;
  position: sticky;
  top: 0;
}

.side-logo {
  padding: 0 24px 24px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.side-logo-title {
  font-size: 16px;
  color: #d4af37;
  letter-spacing: 4px;
  font-weight: 600;
}

.side-logo-sub {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 3px;
}

.side-menu {
  display: flex;
  flex-direction: column;
}

.side-item {
  padding: 14px 24px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  letter-spacing: 1px;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;

  &:active,
  &:hover {
    background: rgba(212, 175, 55, 0.05);
    color: #d4af37;
  }

  &.active {
    background: rgba(212, 175, 55, 0.08);
    color: #d4af37;
    border-left-color: #d4af37;
  }
}

.side-divider {
  height: 1px;
  background: rgba(212, 175, 55, 0.1);
  margin: 16px 24px;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  padding: 14px 32px;
  background: rgba(10, 10, 15, 0.6);
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.topbar-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 2px;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.topbar-op {
  font-size: 12px;
}

.topbar-logout {
  color: #d4af37;
  padding: 4px 12px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 99px;
  font-size: 11px;
  cursor: pointer;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}

.content {
  padding: 32px;
  flex: 1;
  max-width: 1400px;
}
</style>
