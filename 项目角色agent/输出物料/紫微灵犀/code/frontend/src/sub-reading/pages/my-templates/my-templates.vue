<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回缘主" subtitle="已启封模块" />

    <view class="container">
      <!-- 统计头卡 -->
      <view v-if="myList.length || !loading" class="header-card">
        <text class="header-stat">
          {{ myList.length }}<text class="header-stat-denom"> / {{ totalCatalog }}</text>
        </text>
        <text class="header-label">已启封模块</text>
      </view>

      <!-- Tab 筛选 -->
      <view class="filter-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="filter-tab"
          :class="{ active: activeTab === tab.key }"
          @click="setTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- 加载态 -->
      <view v-if="loading && !myList.length" class="loading-state">
        <view class="skeleton" />
        <view class="skeleton" />
        <view class="skeleton" />
      </view>

      <!-- 空态 -->
      <view v-else-if="!filteredList.length" class="empty-state">
        <text class="empty-text">{{ emptyText }}</text>
        <view class="empty-cta" @click="goShop">
          <text>前往神谕殿堂 →</text>
        </view>
      </view>

      <!-- 列表 -->
      <view v-else class="tpl-grid">
        <view
          v-for="item in filteredList"
          :key="item.id"
          class="tpl-card"
          @click="goDetail(item)"
        >
          <view class="tpl-row1">
            <text class="tpl-name">{{ templateName(item) }}</text>
            <text class="tpl-times">{{ spentLabel(item) }}</text>
          </view>
          <view class="tpl-tags">
            <text
              v-for="t in templateTags(item)"
              :key="t"
              class="tpl-tag"
            >
              {{ t }}
            </text>
          </view>
          <view class="tpl-foot">
            <text class="tpl-last"
              >启封于 {{ formatDate(item.unlocked_at) }}</text
            >
            <view class="tpl-cta" @click.stop="goReading(item)">
              <text>开始推演</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * P11 我的模板 / 已启封模块
 * - 顶部统计（已启封 / 总目录）
 * - Tab 切换：全部 / 已购买 / 免费
 * - 列表：每条卡片展示模板名/标签/启封时间 + "开始推演" CTA
 * - 点击卡片 → P08 模板详情；CTA → P03 开始推演
 * - 空态 → 去 P07 神谕殿堂
 */
import { computed, onMounted, ref } from "vue";
import { useTemplatesStore } from "@/stores/templates";
import { useUserStore } from "@/stores/user";
import type { UserTemplate, PromptTemplate } from "@/types/api";

const templatesStore = useTemplatesStore();
const userStore = useUserStore();

const loading = ref(false);
const activeTab = ref<"all" | "paid" | "free">("all");

const tabs = [
  { key: "all" as const, label: "全部" },
  { key: "paid" as const, label: "已购买" },
  { key: "free" as const, label: "免费" },
];

const myList = computed(() => templatesStore.myList);
const totalCatalog = computed(() =>
  Math.max(templatesStore.total, myList.value.length, 7),
);

const filteredList = computed(() => {
  if (activeTab.value === "all") return myList.value;
  if (activeTab.value === "free") {
    return myList.value.filter((item) => (item.points_spent ?? 0) === 0);
  }
  return myList.value.filter((item) => (item.points_spent ?? 0) > 0);
});

const emptyText = computed(() => {
  if (activeTab.value === "paid") return "尚未付费启封任何模块";
  if (activeTab.value === "free") return "尚未领取免费模块";
  return "尚未启封任何神谕模块";
});

function templateName(item: UserTemplate) {
  return item.template?.name || "神谕模块";
}
function templateTags(item: UserTemplate): string[] {
  return item.template?.tags || [];
}
function spentLabel(item: UserTemplate) {
  return (item.points_spent ?? 0) > 0
    ? `付费启封 ${item.points_spent} ¤`
    : "限免启封";
}

function formatDate(iso: string) {
  if (!iso) return "--";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ============ 交互 ============
function setTab(key: "all" | "paid" | "free") {
  activeTab.value = key;
}
function goShop() {
  uni.navigateTo({ url: "/sub-user/pages/templates/templates" });
}
function goDetail(item: UserTemplate) {
  uni.navigateTo({
    url: "/sub-user/pages/template-detail/template-detail?id=" + item.template_id,
  });
}
function goReading(item: UserTemplate) {
  uni.navigateTo({
    url: "/sub-reading/pages/reading/reading?template_id=" + item.template_id,
  });
}

// ============ 加载 ============
onMounted(async () => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/login" });
    return;
  }
  loading.value = true;
  try {
    // 并行拉已启封列表 + 商城总数
    await Promise.all([
      templatesStore.fetchMy(1, 50).catch(() => void 0),
      templatesStore.fetchList(1, 20).catch(() => void 0),
    ]);
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 40px;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
  font-family: "Noto Serif SC", serif;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.header-card {
  padding: 24px;
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 12px;
  text-align: center;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.header-stat {
  font-size: 32px;
  color: #d4af37;
  font-weight: 300;
  letter-spacing: 2px;
  line-height: 1;
}

.header-stat-denom {
  color: rgba(255, 255, 255, 0.5);
  font-size: 18px;
}

.header-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
}

/* Tab */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-tab {
  padding: 8px 20px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  letter-spacing: 2px;
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.3s ease;

  &.active {
    color: #d4af37;
    border-color: #d4af37;
    background: rgba(212, 175, 55, 0.08);
  }
}

/* 模板卡 */
.tpl-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tpl-card {
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 12px;
  padding: 18px 20px;
  box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.04);
  cursor: pointer;
  transition: all 0.3s ease;

  &:active {
    border-color: #d4af37;
  }
}

.tpl-row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tpl-name {
  font-size: 16px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 1px;
}

.tpl-times {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.tpl-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tpl-tag {
  font-size: 10px;
  padding: 2px 8px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.8);
  border-radius: 4px;
}

.tpl-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(212, 175, 55, 0.1);
}

.tpl-last {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.tpl-cta {
  padding: 8px 18px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 2px;
  transition: all 0.3s ease;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}

/* 加载 / 空态 */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton {
  height: 120px;
  background: linear-gradient(
    90deg,
    rgba(212, 175, 55, 0.04),
    rgba(212, 175, 55, 0.08),
    rgba(212, 175, 55, 0.04)
  );
  border-radius: 12px;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.empty-state {
  padding: 80px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.empty-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

.empty-cta {
  padding: 12px 32px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 4px;
  cursor: pointer;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}
</style>
