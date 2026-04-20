<template>
  <view class="page">
    <BaseStarfield />
    <BaseAmbient />
    <BaseCornerDec position="top-left" />
    <BaseCornerDec position="top-right" />
    <BaseCornerDec position="bottom-left" />
    <BaseCornerDec position="bottom-right" />

    <view class="login-container">
      <!-- 几何徽章 -->
      <view class="emblem">
        <view class="emblem-outer" />
        <view class="emblem-inner" />
        <text class="emblem-core">枢</text>
      </view>

      <!-- 标题 -->
      <view class="title-area">
        <text class="title-main">紫微灵犀</text>
        <text class="title-sub">端点接入认证</text>
      </view>

      <!-- 登录/注册切换 -->
      <view class="mode-toggle">
        <view
          class="mode-btn"
          :class="{ active: mode === 'login' }"
          @click="setMode('login')"
        >
          <text class="mode-text">已有锚点</text>
        </view>
        <view
          class="mode-btn"
          :class="{ active: mode === 'register' }"
          @click="setMode('register')"
        >
          <text class="mode-text">铸造新缘</text>
        </view>
      </view>

      <!-- 手机号 -->
      <view class="form-group">
        <input
          class="form-input"
          :class="{ error: phoneErrorMsg }"
          type="number"
          :maxlength="11"
          placeholder="输入灵犀密脉 (手机号码)"
          placeholder-class="form-input-placeholder"
          :value="phone"
          @input="onPhoneInput"
        />
        <text class="form-hint" :class="{ error: phoneErrorMsg }">
          {{ phoneErrorMsg || "请输入 11 位中国大陆手机号" }}
        </text>
      </view>

      <!-- 密码 -->
      <view class="form-group">
        <input
          class="form-input"
          :class="{ error: pwdErrorMsg }"
          :password="true"
          placeholder="输入源校验码 (密码)"
          placeholder-class="form-input-placeholder"
          :value="password"
          @input="onPwdInput"
        />
        <text
          v-if="mode === 'register' || pwdErrorMsg"
          class="form-hint"
          :class="{ error: pwdErrorMsg }"
        >
          {{ pwdErrorMsg || "至少 8 位字符" }}
        </text>
      </view>

      <!-- 邀请码（注册 + 可选） -->
      <view v-if="mode === 'register'" class="form-group">
        <input
          class="form-input"
          :maxlength="8"
          placeholder="邀请码（选填，8 位）"
          placeholder-class="form-input-placeholder"
          :value="inviteCode"
          @input="onInviteInput"
        />
      </view>

      <!-- 服务条款（注册） -->
      <view v-if="mode === 'register'" class="terms-row">
        <view
          class="terms-checkbox"
          :class="{ checked: termsChecked }"
          @click="toggleTerms"
        >
          <text v-if="termsChecked" class="check-mark">✓</text>
        </view>
        <text class="terms-text"
          >已阅读并同意《服务条款》与《隐私政策》，并知悉本服务为文化娱乐参考</text
        >
      </view>

      <!-- 提交按钮 -->
      <BaseActionBtn
        :text="submitLabel"
        :disabled="!canSubmit"
        :loading="submitting"
        size="lg"
        @click="submit"
      />

      <!-- 底部说明 -->
      <view v-if="mode === 'register'" class="footer-note">
        <text>未记录的端点将自动创建本我锚点</text>
        <text>首次接入可获赠 <text class="highlight">100 灵犀点数</text></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * P05 登录 / 注册
 * - 单表单切换 login / register
 * - 手机号 11 位 + 密码 ≥8 位校验
 * - 注册需勾选服务条款
 * - 接后端 /api/v1/auth/login | /register
 */
import { computed, ref } from "vue";
import { useUserStore } from "@/stores/user";
import { errorMessage } from "@/types/errors";

type Mode = "login" | "register";

const userStore = useUserStore();

const mode = ref<Mode>("login");
const phone = ref("");
const password = ref("");
const inviteCode = ref("");
const termsChecked = ref(false);
const submitting = ref(false);

const phoneErrorMsg = ref("");
const pwdErrorMsg = ref("");

function setMode(m: Mode) {
  mode.value = m;
  phoneErrorMsg.value = "";
  pwdErrorMsg.value = "";
}

function toggleTerms() {
  termsChecked.value = !termsChecked.value;
}

function onPhoneInput(e: any) {
  const v = (e.detail?.value ?? e.target?.value ?? "").replace(/\D/g, "").slice(0, 11);
  phone.value = v;
  phoneErrorMsg.value = "";
}

function onPwdInput(e: any) {
  password.value = e.detail?.value ?? e.target?.value ?? "";
  pwdErrorMsg.value = "";
}

function onInviteInput(e: any) {
  inviteCode.value = (e.detail?.value ?? e.target?.value ?? "").slice(0, 8);
}

const phoneValid = computed(() => /^1\d{10}$/.test(phone.value));
const pwdValid = computed(() => password.value.length >= 8);

const canSubmit = computed(() => {
  if (!phoneValid.value || !pwdValid.value) return false;
  if (mode.value === "register" && !termsChecked.value) return false;
  return !submitting.value;
});

const submitLabel = computed(() =>
  mode.value === "login" ? "连接主枢界面 ✧" : "铸造灵犀锚点 ✧",
);

async function submit() {
  // 前置校验
  if (!phoneValid.value) {
    phoneErrorMsg.value = "请输入 11 位中国大陆手机号";
    uni.showToast({ title: "请输入 11 位中国大陆手机号", icon: "none" });
    return;
  }
  if (!pwdValid.value) {
    pwdErrorMsg.value = "密码至少 8 位";
    uni.showToast({ title: "密码至少 8 位字符", icon: "none" });
    return;
  }
  if (mode.value === "register" && !termsChecked.value) {
    uni.showToast({ title: "请先勾选服务条款", icon: "none" });
    return;
  }

  submitting.value = true;
  try {
    const data =
      mode.value === "login"
        ? await userStore.login(phone.value, password.value)
        : await userStore.register(
            phone.value,
            password.value,
            inviteCode.value || undefined,
          );

    if (!data) {
      uni.showToast({ title: "操作失败，请重试", icon: "none" });
      return;
    }

    // 新注册或未完善生辰 → 跳 P06；否则 → 主页
    const hasProfile = !!data.user.has_profile;
    const target = hasProfile
      ? "/pages/index/index"
      : "/pages/profile-setup/profile-setup";

    uni.showToast({
      title:
        mode.value === "register"
          ? "铸造成功 · +100 灵犀点数"
          : "灵犀连接已建立",
      icon: "none",
      duration: 1200,
    });
    setTimeout(() => uni.reLaunch({ url: target }), 400);
  } catch (err: any) {
    const code = err?.code;
    const msg = err?.message || errorMessage(code);
    if (code === 10001) phoneErrorMsg.value = msg;
    else if (code === 10002) pwdErrorMsg.value = msg;
    else if (code === 10003) uni.showToast({ title: msg, icon: "none" });
    else if (code === 10004) phoneErrorMsg.value = "手机号或密码错误";
    else uni.showToast({ title: msg || "网络异常", icon: "none" });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #000;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 10;
}

.emblem {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emblem-outer {
  position: absolute;
  inset: 0;
  border: 1px dashed rgba(212, 175, 55, 0.4);
  border-radius: 50%;
  animation: emblem-spin 40s linear infinite;
}

.emblem-inner {
  position: absolute;
  inset: 15px;
  border: 1px solid #d4af37;
  transform: rotate(45deg);
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.1);
  animation: emblem-pulse 4s ease-in-out infinite alternate;
}

.emblem-core {
  font-family: "Noto Serif SC", serif;
  font-size: 28px;
  color: #d4af37;
  text-shadow: 0 0 20px rgba(212, 175, 55, 0.8);
  z-index: 2;
}

@keyframes emblem-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes emblem-pulse {
  to {
    box-shadow: 0 0 50px rgba(212, 175, 55, 0.3);
    border-color: rgba(212, 175, 55, 0.8);
  }
}

.title-area {
  text-align: center;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.title-main {
  font-size: 24px;
  letter-spacing: 6px;
  font-weight: 300;
  color: #fff;
}

.title-sub {
  font-size: 11px;
  letter-spacing: 6px;
  color: #d4af37;
}

.mode-toggle {
  display: flex;
  width: 100%;
  margin-bottom: 24px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 99px;
  overflow: hidden;
}

.mode-btn {
  flex: 1;
  padding: 10px;
  text-align: center;
  background: transparent;
  transition: background 0.3s ease;
  cursor: pointer;
}

.mode-text {
  font-size: 12px;
  letter-spacing: 4px;
  color: rgba(255, 255, 255, 0.5);
}

.mode-btn.active {
  background: rgba(212, 175, 55, 0.15);

  .mode-text {
    color: #d4af37;
  }
}

.form-group {
  width: 100%;
  margin-bottom: 22px;
  position: relative;
}

.form-input {
  width: 100%;
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-family: "Noto Serif SC", serif;
  font-size: 16px;
  padding: 10px 0;
  text-align: center;
  letter-spacing: 2px;
  transition: border-color 0.3s ease;

  &:focus {
    border-bottom-color: #d4af37;
  }

  &.error {
    border-bottom-color: #ff5555;
  }
}

.form-input-placeholder {
  color: rgba(255, 255, 255, 0.2);
  font-size: 14px;
  letter-spacing: 4px;
}

.form-hint {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 6px;
  text-align: center;
  letter-spacing: 1px;

  &.error {
    color: #ff5555;
  }
}

.terms-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 16px;
  padding: 0 4px;
}

.terms-checkbox {
  width: 14px;
  height: 14px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  background: transparent;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;

  &.checked {
    background: #d4af37;
  }
}

.check-mark {
  position: absolute;
  inset: 0;
  color: #000;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 14px;
}

.terms-text {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
  line-height: 1.6;
}

.footer-note {
  margin-top: 24px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  letter-spacing: 1px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.8;
}

.highlight {
  color: #d4af37;
}
</style>
