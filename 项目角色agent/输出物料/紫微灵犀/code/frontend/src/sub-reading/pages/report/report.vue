<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回" subtitle="神谕印记详览" />

    <!-- AIGC 位置 1：页面级徽章（动态读 report.model_name，DB 真实存的中转 model 名） -->
    <BaseAigcBadge position="fixed-corner" :model="reportModel" />

    <view class="container">
      <view v-if="loading" class="state-block">
        <view class="loading-orb" />
        <text class="state-text">神谕印记加载中...</text>
      </view>

      <view v-else-if="!report" class="state-block">
        <text class="state-text">报告不存在或已删除</text>
      </view>

      <template v-else>
        <!-- 头部 -->
        <view class="report-header">
          <text class="report-title">{{
            report.template?.name || "神谕印记"
          }}</text>
          <view class="report-meta">
            <text class="meta-item"
              >{{ formatTime(report.created_at) }}</text
            >
            <text class="meta-dot">·</text>
            <text class="meta-item"
              >{{ report.ai_response.length.toLocaleString() }} 字</text
            >
            <text class="meta-dot">·</text>
            <text class="meta-item">灵犀神谕</text>
          </view>
        </view>

        <!-- 内容卡 -->
        <view class="report-card">
          <text class="report-text">{{ report.ai_response }}</text>

          <!-- AIGC 位置 2：卡片内联声明 -->
          <BaseAigcBadge position="inline" :model="reportModel" />
        </view>

        <!-- 操作 -->
        <view class="action-row">
          <BaseActionBtn
            text="引灵结缘"
            variant="ghost"
            size="md"
            @click="onShare"
          />
          <BaseActionBtn
            text="再次推演"
            variant="primary"
            size="md"
            @click="rerun"
          />
        </view>
      </template>
    </view>

    <!-- 分享 modal -->
    <view v-if="shareOpen" class="share-mask" @click.self="shareOpen = false">
      <view class="share-card">
        <text class="share-card-title">{{ report?.template?.name }}</text>
        <view class="share-card-excerpt">
          <text>{{ shareExcerpt }}</text>
        </view>
        <!-- AIGC 位置 3：分享水印 -->
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
 * P09 报告详情 / 神谕全卷
 * - 完整展示已保存的报告
 * - AIGC 三层防护齐备
 */
import { computed, onMounted, ref } from "vue";
import { useReadingStore } from "@/stores/reading";
import { shareApi } from "@/services/share";

const readingStore = useReadingStore();

const loading = ref(true);
const reportId = ref("");
const report = computed(() => readingStore.reportDetail);
// 真实使用的 model 名（DB 存储），fallback 中性占位
const reportModel = computed(() => report.value?.model_name || "LLM 引擎");

const shareOpen = ref(false);
const shareExcerpt = computed(() =>
  (report.value?.ai_response || "").slice(0, 200),
);

function formatTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function onShare() {
  shareOpen.value = true;
}

async function copyShareLink() {
  if (!report.value) return;
  try {
    const resp = await shareApi.create(report.value.id);
    const url = resp.data?.share_url || "";
    if (url) {
      uni.setClipboardData({ data: url });
      uni.showToast({ title: "结缘链路已复制", icon: "none" });
    }
  } catch (err: any) {
    uni.showToast({ title: err?.message || "分享失败", icon: "none" });
  }
}

function rerun() {
  if (!report.value) return;
  uni.redirectTo({
    url:
      "/sub-reading/pages/reading/reading?template_id=" +
      report.value.template_id,
  });
}

onMounted(async () => {
  const pages = getCurrentPages();
  const curr = pages[pages.length - 1] as any;
  reportId.value = curr?.options?.id || curr?.$page?.options?.id || "";

  if (!reportId.value) {
    loading.value = false;
    return;
  }

  try {
    await readingStore.fetchReportDetail(reportId.value);
  } catch (err) {
    console.warn("[report] fetch fail:", err);
  } finally {
    loading.value = false;
  }
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

.report-header {
  text-align: center;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.report-title {
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 4px;
  font-weight: 600;
}

.report-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
}

.meta-item {
  color: rgba(255, 255, 255, 0.5);
}

.meta-dot {
  color: rgba(212, 175, 55, 0.4);
}

.report-card {
  background: rgba(10, 10, 15, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.4);
  padding: 28px 24px 10px;
  margin-bottom: 20px;
  border-radius: 12px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.report-text {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 2.2;
  font-weight: 300;
  white-space: pre-wrap;
  word-break: break-word;
  display: block;
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
