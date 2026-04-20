<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseCornerDec position="top-left" />
    <BaseCornerDec position="top-right" />
    <BaseCornerDec position="bottom-left" />
    <BaseCornerDec position="bottom-right" />

    <view class="admin-card">
      <!-- 菱形徽章 -->
      <view class="admin-emblem">
        <text class="emblem-char">枢</text>
      </view>

      <text class="admin-title">紫微灵犀</text>
      <text class="admin-subtitle">主控核心</text>

      <!-- 用户名 -->
      <view class="field">
        <text class="field-label">操守者编号</text>
        <input
          class="field-input"
          placeholder="admin"
          :value="username"
          @input="onUserInput"
        />
      </view>

      <!-- 密码 -->
      <view class="field">
        <text class="field-label">主控密钥</text>
        <input
          class="field-input"
          :password="true"
          placeholder="请输入主控密钥"
          :value="password"
          @input="onPwdInput"
        />
      </view>

      <view
        class="action-btn"
        :class="{ disabled: !canSubmit || loading }"
        @click="submit"
      >
        <text>{{ loading ? "接入核心中..." : "进入主控核心" }}</text>
      </view>

      <view class="warn-text">
        <text class="warn-icon">⚠</text>
        <text>未授权访问将被记录并追溯</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * A01 管理员登录 / 主控核心接入
 * - 独立 admin token（ziwei_admin_token）
 * - 成功后 uni.reLaunch → A02 模板管理（默认首页）
 */
import { computed, ref } from "vue";
import { adminApi } from "@/services/admin";
import { setItem, STORAGE_KEYS } from "@/utils/storage";

const username = ref("");
const password = ref("");
const loading = ref(false);

const canSubmit = computed(
  () => username.value.trim().length > 0 && password.value.length >= 6,
);

function onUserInput(e: any) {
  username.value = e?.detail?.value ?? "";
}
function onPwdInput(e: any) {
  password.value = e?.detail?.value ?? "";
}

async function submit() {
  if (!canSubmit.value || loading.value) return;
  loading.value = true;
  try {
    const resp = await adminApi.login({
      username: username.value.trim(),
      password: password.value,
    });
    const data = resp.data;
    if (data && data.tokens?.access_token) {
      setItem(STORAGE_KEYS.ADMIN_TOKEN, data.tokens.access_token);
      setItem(STORAGE_KEYS.ADMIN_REFRESH_TOKEN, data.tokens.refresh_token);
      setItem(STORAGE_KEYS.ADMIN_BRIEF, data.admin);
      uni.showToast({ title: "接入成功", icon: "none" });
      setTimeout(() => {
        uni.reLaunch({ url: "/pages-admin/templates/templates" });
      }, 200);
    }
  } catch (err: any) {
    console.error("[admin-login] 失败", err);
    uni.showToast({
      title: err?.message || "接入失败，请核对凭证",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
  font-family: "Noto Serif SC", serif;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-card {
  width: 100%;
  max-width: 380px;
  padding: 40px 32px;
  background: rgba(10, 10, 15, 0.85);
  border: 1px solid #d4af37;
  box-shadow:
    0 0 60px rgba(212, 175, 55, 0.12),
    inset 0 0 30px rgba(212, 175, 55, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.admin-emblem {
  width: 56px;
  height: 56px;
  margin: 0 auto 24px;
  border: 1px solid #d4af37;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(45deg);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
}

.emblem-char {
  color: #d4af37;
  font-size: 24px;
  transform: rotate(-45deg);
  display: inline-block;
}

.admin-title {
  text-align: center;
  font-size: 20px;
  color: #d4af37;
  letter-spacing: 6px;
  margin-bottom: 4px;
  font-weight: 600;
}

.admin-subtitle {
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 4px;
  margin-bottom: 36px;
  display: block;
}

.field {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 11px;
  color: #d4af37;
  letter-spacing: 3px;
}

.field-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  letter-spacing: 1px;
  transition: border-color 0.3s ease;

  &:focus {
    border-color: #d4af37;
  }
}

.action-btn {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #d4af37;
  color: #d4af37;
  background: transparent;
  font-size: 14px;
  letter-spacing: 4px;
  text-align: center;
  cursor: pointer;
  box-shadow: inset 0 0 10px rgba(212, 175, 55, 0.05);
  transition: all 0.3s ease;

  &:active:not(.disabled) {
    background: rgba(212, 175, 55, 0.1);
    box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
  }

  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.warn-text {
  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 24px;
  letter-spacing: 1px;
  display: flex;
  justify-content: center;
  gap: 4px;
}

.warn-icon {
  color: rgba(255, 100, 100, 0.7);
}
</style>
