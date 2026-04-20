<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="降维返回" subtitle="深层推理引流" />

    <!-- AIGC 三层防护：位置 1（页面级固定徽章） -->
    <BaseAigcBadge position="fixed-corner" :model="actualModel" />

    <view class="container">
      <!-- 推演头部 -->
      <view class="reading-header">
        <view class="pulse-orb" :class="{ done: phase === 'done', err: phase === 'error' }" />
        <text class="header-title">{{ templateName }}</text>
        <view class="header-badge">
          <text>{{ statusBadge }}</text>
        </view>
      </view>

      <!-- 进度条（preparing/streaming 阶段显示） -->
      <view v-if="phase === 'preparing' || phase === 'streaming'" class="progress-row">
        <view class="progress-track" :class="{ indeterminate: phase === 'preparing' }">
          <view class="progress-fill" :style="{ width: progressPct + '%' }" />
        </view>
        <text class="progress-label">{{ progressLabel }}</text>
      </view>

      <!-- 解读卡片 -->
      <view v-if="phase !== 'error'" class="reading-card">
        <view class="typewriter-content">
          <text>{{ accText || placeholderText }}</text>
          <text v-if="phase === 'streaming' || phase === 'preparing'" class="cursor" />
        </view>

        <!-- AIGC 位置 2（卡片内联声明） -->
        <BaseAigcBadge position="inline" :model="actualModel" />
      </view>

      <!-- 错误 -->
      <view v-else class="reading-error">
        <view class="pulse-orb err" />
        <text class="error-text">{{
          errorInfo?.message || "星象暂迷 · 神谕推演失败"
        }}</text>
        <text v-if="(errorInfo?.refunded || 0) > 0" class="error-refund"
          >已扣除的 {{ errorInfo?.refunded }} 灵犀点数已原路退回</text
        >
        <view class="error-retry" @click="retry">
          <text>重新推演</text>
        </view>
      </view>

      <!-- 完成后按钮 -->
      <view v-if="phase === 'done'" class="action-row">
        <BaseActionBtn
          text="引灵结缘"
          variant="ghost"
          size="md"
          @click="openShare"
        />
        <BaseActionBtn
          text="将神谕封存入库"
          variant="primary"
          size="md"
          @click="saveReport"
        />
      </view>
    </view>

    <!-- 分享 modal -->
    <view v-if="shareOpen" class="share-mask" @click.self="shareOpen = false">
      <view class="share-card">
        <text class="share-card-title">{{ templateName }}</text>
        <view class="share-card-excerpt">
          <text>{{ shareExcerpt }}</text>
        </view>
        <!-- AIGC 位置 3（分享卡水印，不可裁剪） -->
        <view class="share-watermark">
          <text>⚠ 本内容由 AI 生成 · 仅供文化娱乐参考 · 紫微灵犀</text>
        </view>
        <view class="share-actions">
          <view class="share-action" @click="copyShareLink">
            <text>复制结缘链路</text>
          </view>
          <view class="share-action" @click="shareOpen = false">
            <text>闭合</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * P03 AI 解读 / 神谕推演
 * - SSE 流式：meta / chunk / done / error
 * - 技术难点 2：H5 fetch ReadableStream / 小程序 onChunkReceived（utils/sse.ts 已封装）
 * - 技术难点 3：AIGC 三层防护（fixed-corner / inline / watermark）
 * - 技术难点 4：error.refunded > 0 时 toast 提示退积分（reading store 已处理）
 * - 封存入库：后端已在流式过程中落库，此处仅跳 P09 查看
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useReadingStore } from "@/stores/reading";
import { useTemplatesStore } from "@/stores/templates";
import { usePointsStore } from "@/stores/points";
import { useUserStore } from "@/stores/user";
import { shareApi } from "@/services/share";

const readingStore = useReadingStore();
const templatesStore = useTemplatesStore();
const pointsStore = usePointsStore();
const userStore = useUserStore();

const templateId = ref<string>("");

// 从 reading store 读响应式状态
const phase = computed(() => readingStore.phase);
const accText = computed(() => readingStore.accText);
const meta = computed(() => readingStore.meta);
const errorInfo = computed(() => readingStore.errorInfo);

const templateName = computed(() => {
  const t = templatesStore.detailMap[templateId.value];
  return t?.name || "神谕推演";
});

const placeholderText = computed(() => {
  if (phase.value === "preparing") return "星盘能量凝结中，请稍候...";
  // streaming 阶段但还没收到首字（reasoning 模型思考中）
  if (phase.value === "streaming" && accText.value.length === 0)
    return "AI 正在推理紫微星象，首字大约需 30–90 秒，请耐心等候...";
  return "";
});

// 实际使用的模型名（来自 SSE meta，回退到中性占位）
const actualModel = computed(
  () => meta.value?.model || readingStore.doneInfo?.model || "LLM 引擎"
);

// 流式进度（按预期 ~1500 字封顶 100%）
const EXPECTED_CHARS = 1500;
const progressPct = computed(() => {
  if (phase.value === "preparing") return 8;
  const n = accText.value.length;
  return Math.min(100, Math.round((n / EXPECTED_CHARS) * 100));
});
const progressLabel = computed(() => {
  if (phase.value === "preparing") return "星盘能量凝结中...";
  return `${accText.value.length.toLocaleString()} 字 · ${progressPct.value}%`;
});

const statusBadge = computed(() => {
  if (phase.value === "preparing") return "星盘能量凝结中";
  if (phase.value === "streaming") {
    const n = accText.value.length;
    return `星盘推演中 · 已生成 ${n.toLocaleString()} 字`;
  }
  if (phase.value === "done") {
    const n = accText.value.length;
    return `星盘推演完成 · ${n.toLocaleString()} 字`;
  }
  if (phase.value === "error") return "星象暂迷";
  return "—";
});

// ========== 分享 ==========
const shareOpen = ref(false);
const shareExcerpt = computed(() => accText.value.slice(0, 200));

function openShare() {
  shareOpen.value = true;
}

async function copyShareLink() {
  const reportId = readingStore.meta?.report_id || readingStore.doneInfo?.report_id;
  if (!reportId) {
    uni.showToast({ title: "报告尚未生成", icon: "none" });
    return;
  }
  try {
    const resp = await shareApi.create(reportId);
    const url = resp.data?.share_url || "";
    if (url) {
      uni.setClipboardData({ data: url });
      uni.showToast({ title: "结缘链路已复制", icon: "none" });
    }
  } catch (err: any) {
    uni.showToast({ title: err?.message || "分享失败", icon: "none" });
  }
}

// ========== 封存/重试/退出 ==========
function saveReport() {
  const reportId = readingStore.doneInfo?.report_id || readingStore.meta?.report_id;
  if (reportId) {
    uni.navigateTo({
      url: "/sub-reading/pages/report/report?id=" + reportId,
    });
  } else {
    uni.showToast({ title: "已封存至神谕印记", icon: "none" });
  }
}

function retry() {
  if (!templateId.value) return;
  readingStore.startStream(templateId.value);
}

// ========== 生命周期 ==========
onMounted(() => {
  const pages = getCurrentPages();
  const curr = pages[pages.length - 1] as any;
  templateId.value = curr?.options?.template_id || curr?.$page?.options?.template_id || "";

  if (!templateId.value) {
    uni.showToast({ title: "未选择神谕模块", icon: "none" });
    setTimeout(() => uni.redirectTo({ url: "/sub-user/pages/templates/templates" }), 800);
    return;
  }

  // 保证模板名称可展示
  if (!templatesStore.detailMap[templateId.value]) {
    templatesStore.fetchDetail(templateId.value).catch(() => void 0);
  }

  // 每次进入页重置并开始新推演
  readingStore.reset();
  readingStore.startStream(templateId.value);

  // 同步最新余额（meta.balance_after 更精准，这里兜底拉一次）
  pointsStore.fetchBalance().then((b) => userStore.updatePoints(b)).catch(() => void 0);
});

onBeforeUnmount(() => {
  readingStore.stopStream();
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 100px;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.reading-header {
  text-align: center;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.pulse-orb {
  width: 36px;
  height: 36px;
  border: 1px solid #d4af37;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: reading-pulse 2s infinite;
  position: relative;

  &::after {
    content: "";
    width: 18px;
    height: 18px;
    background: rgba(212, 175, 55, 0.2);
  }

  &.done {
    animation: none;
    border-color: rgba(212, 175, 55, 0.6);
    box-shadow: 0 0 12px rgba(212, 175, 55, 0.2);
  }

  &.err {
    border-color: #ff6666;
    animation: none;
  }
}

@keyframes reading-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4);
  }
  70% {
    box-shadow: 0 0 0 16px rgba(212, 175, 55, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(212, 175, 55, 0);
  }
}

.header-title {
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 4px;
  font-weight: 600;
}

.header-badge {
  padding: 5px 14px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  font-size: 10px;
  color: #d4af37;
  letter-spacing: 2px;
  border-radius: 4px;
}

.progress-row {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-track {
  height: 3px;
  background: rgba(212, 175, 55, 0.12);
  border-radius: 2px;
  overflow: hidden;
  position: relative;

  &.indeterminate .progress-fill {
    width: 30% !important;
    animation: progress-slide 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(212, 175, 55, 0.4) 0%,
    #d4af37 60%,
    rgba(212, 175, 55, 0.4) 100%
  );
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.5);
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes progress-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.progress-label {
  font-size: 10px;
  color: rgba(212, 175, 55, 0.7);
  letter-spacing: 2px;
  text-align: right;
}

.reading-card {
  background: rgba(10, 10, 15, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.4);
  padding: 28px 24px;
  margin-bottom: 20px;
  border-radius: 12px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.typewriter-content {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 2.2;
  font-weight: 300;
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: #d4af37;
  margin-left: 4px;
  vertical-align: middle;
  animation: cursor-blink 1s infinite;
}

@keyframes cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.reading-error {
  text-align: center;
  padding: 60px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-text {
  font-size: 14px;
  color: #ff8888;
  letter-spacing: 2px;
}

.error-refund {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.error-retry {
  margin-top: 12px;
  padding: 11px 32px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* 分享 modal */
.share-mask {
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

.share-card {
  background: linear-gradient(135deg, #1a0e2e, #000);
  border: 1px solid #d4af37;
  padding: 26px 22px 20px;
  max-width: 360px;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 0 50px rgba(212, 175, 55, 0.3);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.share-card-title {
  font-size: 16px;
  color: #d4af37;
  letter-spacing: 4px;
  text-align: center;
}

.share-card-excerpt {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.8;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.5);
  border-left: 2px solid #d4af37;
}

.share-watermark {
  font-size: 9px;
  color: rgba(212, 175, 55, 0.6);
  text-align: center;
  padding: 6px 0;
  border-top: 1px solid rgba(212, 175, 55, 0.4);
  letter-spacing: 1px;
}

.share-actions {
  display: flex;
  gap: 8px;
}

.share-action {
  flex: 1;
  padding: 10px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  font-size: 11px;
  letter-spacing: 2px;
  text-align: center;
  border-radius: 99px;
  cursor: pointer;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}
</style>
