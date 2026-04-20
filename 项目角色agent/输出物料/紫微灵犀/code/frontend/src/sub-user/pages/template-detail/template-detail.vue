<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回殿堂" />

    <view class="container">
      <view v-if="loading" class="state-block">
        <view class="loading-orb" />
        <text class="state-text">神谕透析中...</text>
      </view>

      <view v-else-if="!tpl" class="state-block">
        <text class="state-text">模板已下架或不存在</text>
      </view>

      <template v-else>
        <!-- 装饰头 -->
        <view class="tpl-hero">
          <view class="tpl-hero-icon">
            <text>✧</text>
          </view>
          <text class="tpl-name">{{ tpl.name }}</text>
          <view class="tpl-tags">
            <text v-for="t in tpl.tags" :key="t" class="tpl-tag">{{ t }}</text>
          </view>
        </view>

        <!-- 神谕介绍 -->
        <view class="section">
          <text class="section-title">神谕介绍</text>
          <text class="section-body">{{ tpl.description }}</text>
        </view>

        <!-- 详细说明 -->
        <view class="section" v-if="tpl.detail">
          <text class="section-title">推演详情</text>
          <text class="section-body">{{ tpl.detail }}</text>
        </view>

        <!-- 元数据 -->
        <view class="tpl-meta">
          <view class="meta-cell">
            <text class="meta-num">{{ tpl.unlock_count.toLocaleString() }}</text>
            <text class="meta-label">缘主已启封</text>
          </view>
          <view class="meta-cell">
            <text class="meta-num">1,200+</text>
            <text class="meta-label">平均推演字数</text>
          </view>
          <view class="meta-cell">
            <text class="meta-num">{{ llmDisplayName }}</text>
            <text class="meta-label">神谕引擎</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 底部 CTA（积分不足直接转成「去获取」入口，避免双层提示堆叠） -->
    <view v-if="tpl" class="cta-bar">
      <view class="cta-cost" v-if="!isUnlocked && !insufficient">
        <text class="cta-cost-num">{{ tpl.points_cost }}</text>
        <text class="cta-cost-unit">¤</text>
      </view>
      <view
        class="cta-btn"
        :class="{ disabled: !canAct, ghost: insufficient }"
        @click="handleCTA"
      >
        <text>{{ ctaLabel }}</text>
      </view>
    </view>

    <!-- 解锁确认 modal -->
    <view v-if="confirmOpen" class="modal-mask" @click.self="confirmOpen = false">
      <view class="modal-card">
        <text class="modal-title">启封确认</text>
        <text class="modal-text"
          >将消耗 <text class="accent">{{ tpl?.points_cost }} 灵犀点数</text>
          启封「{{ tpl?.name }}」模块。启封后可永久使用。</text
        >
        <view class="modal-actions">
          <view class="modal-btn" @click="confirmOpen = false">
            <text>再想想</text>
          </view>
          <view class="modal-btn primary" @click="confirmUnlock">
            <text>{{ unlocking ? "启封中..." : "确认启封" }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * P08 模板详情 / 神谕透析
 * - 展示模板信息 + 积分消耗
 * - 未解锁 → 启封（消耗积分）→ 跳 P03
 * - 已解锁 → 直接跳 P03 推演
 */
import { computed, onMounted, ref } from "vue";
import { useTemplatesStore } from "@/stores/templates";
import { usePointsStore } from "@/stores/points";
import { useUserStore } from "@/stores/user";
import type { PromptTemplate } from "@/types/api";
import { errorMessage } from "@/types/errors";

const templatesStore = useTemplatesStore();
const pointsStore = usePointsStore();
const userStore = useUserStore();

// 神谕引擎对外显示名（不暴露底层模型）
const llmDisplayName =
  (import.meta.env.VITE_LLM_DISPLAY_NAME as string) || "灵犀神谕";

const loading = ref(true);
const tpl = ref<PromptTemplate | null>(null);
const templateId = ref<string>("");

const confirmOpen = ref(false);
const unlocking = ref(false);

const isUnlocked = computed(() => !!tpl.value?.is_unlocked);
const balance = computed(() => pointsStore.balance || userStore.pointsBalance || 0);
const deficit = computed(() => {
  if (!tpl.value || isUnlocked.value) return 0;
  return Math.max(0, tpl.value.points_cost - balance.value);
});
const insufficient = computed(() => deficit.value > 0 && !isUnlocked.value);

const canAct = computed(() => {
  if (unlocking.value) return false;
  // 积分不足时按钮仍可点（跳积分中心），不再 disabled
  return true;
});

const ctaLabel = computed(() => {
  if (!tpl.value) return "—";
  if (isUnlocked.value) return "开始神谕推演 ✧";
  if (insufficient.value) return `还差 ${deficit.value} ¤  ·  去获取灵犀点数 →`;
  return tpl.value.points_cost === 0 ? "免费启封" : "立即启封";
});

function handleCTA() {
  if (!canAct.value || !tpl.value) return;
  if (isUnlocked.value) {
    uni.navigateTo({
      url: "/sub-reading/pages/reading/reading?template_id=" + tpl.value.id,
    });
    return;
  }
  // 积分不足：跳积分中心去赚
  if (insufficient.value) {
    uni.navigateTo({ url: "/sub-user/pages/points/points" });
    return;
  }
  if (tpl.value.points_cost === 0) {
    confirmUnlock();
  } else {
    confirmOpen.value = true;
  }
}

async function confirmUnlock() {
  if (!tpl.value || unlocking.value) return;
  unlocking.value = true;
  try {
    const resp = await templatesStore.unlock(tpl.value.id);
    confirmOpen.value = false;
    if (resp) {
      // 后端返回最新 balance → 同步 store（不乐观更新）
      pointsStore.balance = resp.balance;
      userStore.updatePoints(resp.balance);
      tpl.value.is_unlocked = true;
      uni.showToast({
        title: tpl.value.points_cost === 0 ? "已启封 · 免费" : `已扣 ${tpl.value.points_cost} ¤ · 启封成功`,
        icon: "none",
        duration: 1500,
      });
    }
  } catch (err: any) {
    const code = err?.code;
    uni.showToast({
      title: err?.message || errorMessage(code) || "启封失败",
      icon: "none",
    });
  } finally {
    unlocking.value = false;
  }
}

onMounted(async () => {
  // uni-app 页面参数
  const pages = getCurrentPages();
  const curr = pages[pages.length - 1] as any;
  templateId.value = curr?.options?.id || curr?.$page?.options?.id || "";

  if (!templateId.value) {
    uni.showToast({ title: "参数缺失", icon: "none" });
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const [detail] = await Promise.all([
      templatesStore.fetchDetail(templateId.value),
      pointsStore.fetchBalance().catch(() => void 0),
    ]);
    tpl.value = detail ?? null;
  } catch (err) {
    console.warn("[template-detail] fetch fail:", err);
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 140px;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
}

.state-block {
  padding: 80px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-orb {
  width: 44px;
  height: 44px;
  border: 1px solid #d4af37;
  border-radius: 50%;
  animation: orb-spin 3s linear infinite;
}

@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}

.state-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  letter-spacing: 2px;
}

.tpl-hero {
  text-align: center;
  padding: 24px 16px 32px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 16px;
  margin-bottom: 24px;
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.04), rgba(0, 0, 0, 0));
  position: relative;
  overflow: hidden;
}

.tpl-hero-icon {
  width: 50px;
  height: 50px;
  border: 1px solid #d4af37;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  color: #d4af37;
  font-size: 22px;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
}

.tpl-name {
  display: block;
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 12px;
  font-weight: 600;
}

.tpl-tags {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.tpl-tag {
  font-size: 11px;
  padding: 3px 12px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.85);
  border-radius: 4px;
  letter-spacing: 1px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  display: block;
  font-size: 12px;
  color: #d4af37;
  letter-spacing: 4px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  margin-bottom: 14px;
}

.section-body {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.9;
  letter-spacing: 0.5px;
}

.tpl-meta {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  border-top: 1px solid rgba(212, 175, 55, 0.1);
  border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  margin: 24px 0;
}

.meta-cell {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-num {
  color: #d4af37;
  font-size: 16px;
  font-weight: 600;
}

.meta-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.cta-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px calc(24px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #000 60%, rgba(0, 0, 0, 0));
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 100;
  border-top: 1px solid rgba(212, 175, 55, 0.4);
}

.cta-cost {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.7);
}

.cta-cost-num {
  color: #d4af37;
  font-size: 22px;
  font-weight: 600;
}

.cta-cost-unit {
  color: #d4af37;
  font-size: 14px;
}

.cta-btn {
  flex: 1;
  padding: 14px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 14px;
  letter-spacing: 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* 积分不足态：保持金线框可点（跳积分中心），略柔化字距 */
  &.ghost {
    letter-spacing: 1.5px;
    font-size: 12px;
    background: rgba(212, 175, 55, 0.04);
  }
}

/* Modal */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-card {
  background: rgba(10, 10, 15, 0.92);
  border: 1px solid #d4af37;
  padding: 28px 22px 22px;
  max-width: 360px;
  width: 100%;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 0 50px rgba(212, 175, 55, 0.3);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-title {
  font-size: 16px;
  color: #d4af37;
  letter-spacing: 4px;
}

.modal-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.8;
}

.accent {
  color: #d4af37;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 2px;
  text-align: center;
  cursor: pointer;
  transition: background 0.3s ease;

  &:active {
    background: rgba(212, 175, 55, 0.05);
  }

  &.primary {
    border-color: #d4af37;
    background: rgba(212, 175, 55, 0.1);
  }
}
</style>
