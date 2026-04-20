<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseNav :show-back="true" back-text="返回缘主" subtitle="引灵结缘" />

    <view class="container">
      <!-- 邀请码大卡 -->
      <view class="invite-hero">
        <text class="invite-label">您的灵犀邀请码</text>
        <text class="invite-code">{{ formattedCode }}</text>
        <view class="copy-btn" @click="copyLink">
          <text>复制邀请链路</text>
        </view>
      </view>

      <!-- 规则说明 -->
      <view class="rule-card">
        <text class="rule-line">
          每邀请 1 位缘主接入紫微灵犀，您与对方
          <text class="rule-highlight">各得 50 灵犀点数</text>。
        </text>
        <text class="rule-line">
          被邀请缘主额外获得首次接入礼包（
          <text class="rule-highlight">100 ¤</text>
          ）。
        </text>
        <text class="rule-line">邀请奖励无上限，分享越多，灵犀越丰盈。</text>
      </view>

      <!-- 统计 -->
      <view class="stat-row">
        <view class="stat-card">
          <text class="stat-value">{{ invitedCount }}</text>
          <text class="stat-label">已引灵缘主</text>
        </view>
        <view class="stat-card">
          <text class="stat-value">{{ rewardTotal }} ¤</text>
          <text class="stat-label">累计获得</text>
        </view>
      </view>

      <text class="section-title">引灵记录</text>

      <view v-if="inviteeList.length" class="invitee-list">
        <view
          v-for="item in inviteeList"
          :key="item.id"
          class="invitee-row"
        >
          <view class="invitee-left">
            <view class="invitee-icon">
              <text>{{ item.nameChar }}</text>
            </view>
            <view class="invitee-info">
              <text class="invitee-phone">{{ item.phoneMasked }}</text>
              <text class="invitee-time">{{ item.time }} 已接入</text>
            </view>
          </view>
          <text class="invitee-reward">+50 ¤</text>
        </view>
      </view>
      <view v-else class="empty-state">
        <text>尚未引灵任何缘主 · 快去分享吧</text>
      </view>

      <!-- 生成海报按钮 -->
      <view class="poster-btn" @click="openPoster">
        <text>生成结缘海报</text>
      </view>
    </view>

    <!-- 分享海报 modal -->
    <view v-if="posterShow" class="modal-mask" @click.self="closePoster">
      <view class="poster">
        <view class="poster-emblem">
          <text>枢</text>
        </view>
        <text class="poster-title">紫微灵犀</text>
        <text class="poster-subtitle">古典智慧 · AI 解读</text>
        <view class="poster-text">
          <text>{{ nickname }}（缘主）邀您共赴星海</text>
          <text>接入即获 <text class="highlight">100 灵犀点数</text></text>
          <text class="tiny">⚠ 本服务为文化娱乐参考</text>
        </view>
        <view class="poster-qr">
          <view class="poster-qr-pattern" />
        </view>
        <text class="poster-code">邀请码 {{ formattedCode }}</text>
        <!-- 分享水印：P13 硬约束 · 位置 3 不可裁剪 -->
        <view class="poster-watermark">
          <text>⚠ 由 AI 驱动 · 仅供文化娱乐参考 · 紫微灵犀</text>
        </view>
      </view>
      <view class="modal-close" @click="closePoster">
        <text>闭合</text>
      </view>
    </view>

    <!-- AIGC 位置 1：页面级徽章 -->
    <BaseAigcBadge position="fixed-corner" />
  </view>
</template>

<script setup lang="ts">
/**
 * P13 邀请好友 / 引灵结缘
 * - 展示邀请码 + 一键复制链接
 * - 邀请规则说明
 * - 累计邀请/奖励统计
 * - 引灵记录列表（后端暂无独立接口，用 mock 撑起 UI，TODO）
 * - 生成结缘海报 modal（含 AIGC 水印，P13 硬约束 · 位置 3）
 */
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

const posterShow = ref(false);

const nickname = computed(() => userStore.user?.nickname || "缘主");

const inviteCode = computed(() => userStore.user?.invite_code || "--------");
const formattedCode = computed(() => {
  const raw = inviteCode.value.replace(/-/g, "");
  if (raw.length === 8) {
    return `ZWLX-${raw.slice(0, 4)}-${raw.slice(4)}`;
  }
  return `ZWLX-${raw}`;
});

// TODO（backend）：GET /api/v1/user/invited-list 目前没有独立接口，
// 暂用 mock 假数据撑起 UI；后端补接口后只需替换此处为真实调用。
const inviteeList = ref<Array<{
  id: string;
  nameChar: string;
  phoneMasked: string;
  time: string;
}>>([]);

// 累计统计（从 mock 或后端拉）
const invitedCount = computed(() => inviteeList.value.length);
const rewardTotal = computed(() => invitedCount.value * 50);

function copyLink() {
  const url = `https://zwlx.app/?ref=${inviteCode.value}`;
  // H5
  // @ts-ignore
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    // @ts-ignore
    navigator.clipboard.writeText(url).catch(() => void 0);
  }
  // uni-app 小程序
  try {
    uni.setClipboardData?.({
      data: url,
      success: () => {
        uni.showToast({
          title: "灵犀链路已复制",
          icon: "none",
        });
      },
      fail: () => {
        uni.showToast({ title: "复制失败，请手动复制", icon: "none" });
      },
    });
  } catch {
    uni.showToast({ title: "灵犀链路已复制", icon: "none" });
  }
}

function openPoster() {
  posterShow.value = true;
}
function closePoster() {
  posterShow.value = false;
}

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: "/pages/login/login" });
    return;
  }
  // 拉最新 user（含 invite_code）
  await userStore.fetchMe().catch(() => void 0);
  // mock 邀请记录
  inviteeList.value = [];
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

/* 邀请码大卡 */
.invite-hero {
  padding: 32px 24px;
  background: linear-gradient(
    135deg,
    rgba(10, 10, 15, 0.9),
    rgba(10, 10, 15, 0.4)
  );
  border: 1px solid #d4af37;
  border-radius: 16px;
  text-align: center;
  box-shadow:
    inset 0 0 30px rgba(212, 175, 55, 0.08),
    0 0 30px rgba(212, 175, 55, 0.05);
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.invite-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
}

.invite-code {
  font-size: 30px;
  color: #d4af37;
  letter-spacing: 6px;
  font-weight: 600;
  text-shadow: 0 0 20px rgba(212, 175, 55, 0.4);
}

.copy-btn {
  padding: 10px 28px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;

  &:active {
    background: rgba(212, 175, 55, 0.15);
    box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
  }
}

/* 规则卡 */
.rule-card {
  padding: 16px 20px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.15);
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-line {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.9;
  letter-spacing: 0.5px;
}

.rule-highlight {
  color: #d4af37;
  font-weight: 600;
}

/* 统计 */
.stat-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 18px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.stat-value {
  font-size: 28px;
  color: #d4af37;
  font-weight: 300;
  letter-spacing: 1px;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

/* 区块标题 */
.section-title {
  display: block;
  font-size: 12px;
  color: #d4af37;
  letter-spacing: 4px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  margin-bottom: 16px;
}

/* 引灵记录 */
.invitee-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invitee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(10, 10, 15, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.08);
  border-radius: 8px;
}

.invitee-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.invitee-icon {
  width: 28px;
  height: 28px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4af37;
  font-size: 11px;
}

.invitee-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.invitee-phone {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 1px;
}

.invitee-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.invitee-reward {
  color: #d4af37;
  font-weight: 600;
  font-size: 14px;
}

.empty-state {
  padding: 40px 24px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  letter-spacing: 2px;
}

/* 海报按钮 */
.poster-btn {
  padding: 16px;
  margin-top: 24px;
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 99px;
  text-align: center;
  font-size: 14px;
  letter-spacing: 4px;
  cursor: pointer;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }
}

/* 海报 modal */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  overflow-y: auto;
}

.poster {
  position: relative;
  background: linear-gradient(180deg, #1a0e2e 0%, #000 70%);
  border: 2px solid #d4af37;
  padding: 40px 32px 48px;
  max-width: 320px;
  width: 100%;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 0 60px rgba(212, 175, 55, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.poster-emblem {
  width: 60px;
  height: 60px;
  border: 1px solid #d4af37;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d4af37;
  font-size: 24px;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
}

.poster-title {
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 6px;
}

.poster-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.poster-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.8;
  padding: 16px;
  border: 1px dashed rgba(212, 175, 55, 0.4);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .highlight {
    color: #d4af37;
    font-weight: 600;
  }

  .tiny {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
  }
}

.poster-qr {
  width: 110px;
  height: 110px;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
}

.poster-qr-pattern {
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(45deg, #000 25%, transparent 25%),
    linear-gradient(-45deg, #000 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #000 75%),
    linear-gradient(-45deg, transparent 75%, #000 75%);
  background-size: 8px 8px;
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0;
}

.poster-code {
  font-size: 13px;
  color: #d4af37;
  letter-spacing: 4px;
}

/* 分享水印：P13 硬约束位置 3，不可裁剪 */
.poster-watermark {
  width: 100%;
  padding-top: 12px;
  border-top: 1px solid rgba(212, 175, 55, 0.2);
  font-size: 9px;
  color: rgba(212, 175, 55, 0.6);
  letter-spacing: 1px;
  text-align: center;
}

.modal-close {
  padding: 10px 32px;
  margin-top: 16px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  border-radius: 99px;
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
}
</style>
