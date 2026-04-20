<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回主枢" subtitle="神谕殿堂" />

    <view class="container">
      <!-- 顶部积分 mini -->
      <view class="points-mini" @click="goPoints">
        <text class="points-mini-label">灵犀点数</text>
        <text class="points-mini-value">{{ pointsFormatted }} ¤</text>
      </view>

      <!-- 标签筛选 -->
      <scroll-view class="filter-bar" scroll-x="true" :show-scrollbar="false">
        <view
          v-for="f in filterChips"
          :key="f.key"
          class="filter-chip"
          :class="{ active: activeFilter === f.key }"
          @click="setFilter(f.key)"
        >
          <text>{{ f.label }}</text>
        </view>
      </scroll-view>

      <!-- 列表 -->
      <view v-if="loading && !templates.length" class="loading-state">
        <view class="skeleton" />
        <view class="skeleton" />
        <view class="skeleton" />
      </view>

      <view v-else-if="!filteredTemplates.length" class="empty-state">
        <text>星辰未临 · 暂无可启封模块</text>
      </view>

      <view v-else class="template-grid">
        <view
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="template-card"
          :class="{ unlocked: tpl.is_unlocked }"
          @click="goDetail(tpl.id)"
        >
          <view class="tc-row1">
            <text class="tc-name">{{ tpl.name }}</text>
            <view class="tc-price">
              <text v-if="tpl.is_unlocked" class="unlocked">已启封</text>
              <text v-else-if="tpl.points_cost === 0" class="free">限免</text>
              <text v-else class="cost"
                >{{ tpl.points_cost }}<text class="unit"> ¤</text></text
              >
            </view>
          </view>
          <text class="tc-desc">{{ tpl.description }}</text>
          <view class="tc-row3">
            <view class="tc-tags">
              <text v-for="t in tpl.tags" :key="t" class="tc-tag">{{ t }}</text>
            </view>
            <text class="tc-meta"
              >{{ tpl.unlock_count.toLocaleString() }} 缘主已启封</text
            >
          </view>
        </view>
      </view>
    </view>

    <BaseTabBar active="reading" />
  </view>
</template>

<script setup lang="ts">
/**
 * P07 模板商城 / 神谕殿堂
 */
import { computed, onMounted, ref } from "vue";
import { useTemplatesStore } from "@/stores/templates";
import { usePointsStore } from "@/stores/points";
import { useUserStore } from "@/stores/user";

const templatesStore = useTemplatesStore();
const pointsStore = usePointsStore();
const userStore = useUserStore();

const loading = computed(() => templatesStore.loading);
const templates = computed(() => templatesStore.list);

const pointsFormatted = computed(() => {
  const n = pointsStore.balance || userStore.pointsBalance || 0;
  return n.toLocaleString();
});

const filterChips = computed(() => {
  const base = [{ key: "all", label: "全部" }];
  const set = new Set<string>();
  for (const t of templates.value) for (const tag of t.tags) set.add(tag);
  Array.from(set)
    .slice(0, 10)
    .forEach((tag) => base.push({ key: tag, label: tag }));
  return base;
});

const activeFilter = ref("all");
function setFilter(key: string) {
  activeFilter.value = key;
}

const filteredTemplates = computed(() => {
  if (activeFilter.value === "all") return templates.value;
  return templates.value.filter((t) => t.tags.includes(activeFilter.value));
});

function goPoints() {
  uni.navigateTo({ url: "/sub-user/pages/points/points" });
}

function goDetail(id: string) {
  uni.navigateTo({
    url: "/sub-user/pages/template-detail/template-detail?id=" + id,
  });
}

onMounted(async () => {
  await Promise.all([
    templatesStore.fetchList(1, 30).catch(() => void 0),
    pointsStore.fetchBalance().catch(() => void 0),
  ]);
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 80px;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px 20px;
}

.points-mini {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 8px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: border-color 0.3s ease;

  &:active {
    border-color: rgba(212, 175, 55, 0.4);
  }
}

.points-mini-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

.points-mini-value {
  font-size: 16px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 1px;
}

.filter-bar {
  white-space: nowrap;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.filter-chip {
  display: inline-block;
  padding: 7px 16px;
  margin-right: 8px;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 99px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  transition: all 0.3s ease;
  cursor: pointer;

  &.active {
    background: rgba(212, 175, 55, 0.15);
    color: #d4af37;
    border-color: #d4af37;
  }
}

.template-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-card {
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 18px 22px;
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:active {
    border-color: rgba(212, 175, 55, 0.4);
    background: rgba(212, 175, 55, 0.02);
  }

  &.unlocked {
    border-color: rgba(212, 175, 55, 0.4);
    box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.04);
  }
}

.tc-row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tc-name {
  font-size: 16px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 1px;
}

.tc-price {
  font-size: 14px;
}

.free {
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 2px;
}

.cost {
  color: #fff;
}

.unit {
  color: #d4af37;
}

.unlocked {
  font-size: 11px;
  color: #d4af37;
  padding: 3px 10px;
  border: 1px solid #d4af37;
  border-radius: 4px;
  letter-spacing: 1px;
}

.tc-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.7;
}

.tc-row3 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tc-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tc-tag {
  font-size: 10px;
  padding: 2px 8px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.8);
  border-radius: 4px;
  letter-spacing: 1px;
}

.tc-meta {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 1px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton {
  height: 100px;
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
  text-align: center;
  padding: 80px 24px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}
</style>
