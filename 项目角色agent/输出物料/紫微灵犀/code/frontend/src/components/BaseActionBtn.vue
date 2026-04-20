<template>
  <button
    class="action-btn"
    :class="[`variant-${variant}`, `size-${size}`, { disabled, loading, square }]"
    :disabled="loading"
    @click="onClick"
  >
    <text class="action-btn-text">
      <slot>{{ text }}</slot>
    </text>
    <text v-if="loading" class="action-btn-dot">…</text>
  </button>
</template>

<script setup lang="ts">
/**
 * 主 CTA 按钮
 * - variant: primary（金线框）/ ghost（透明） / danger（红线框，如"切断灵犀链接"）
 * - size: sm / md / lg
 * - square: 是否方形（4px）否则药丸形（99px）
 */
interface Props {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  text?: string;
  disabled?: boolean;
  loading?: boolean;
  square?: boolean;
}

withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  text: "",
  disabled: false,
  loading: false,
  square: false,
});

const emit = defineEmits<{ (e: "click", ev: Event): void }>();

function onClick(ev: Event) {
  emit("click", ev);
}
</script>

<style lang="scss" scoped>
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: "Noto Serif SC", serif;
  letter-spacing: 4px;
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  background: transparent;
  box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.08);

  &.square {
    border-radius: 4px;
  }

  &.size-sm {
    padding: 8px 20px;
    font-size: 11px;
  }
  &.size-md {
    padding: 14px 32px;
    font-size: 13px;
  }
  &.size-lg {
    padding: 18px 48px;
    font-size: 14px;
  }

  &.variant-primary {
    border: 1px solid #d4af37;
    color: #d4af37;

    &:hover,
    &:active {
      background: rgba(212, 175, 55, 0.1);
      box-shadow:
        0 0 30px rgba(212, 175, 55, 0.2),
        inset 0 0 20px rgba(212, 175, 55, 0.2);
    }
  }

  &.variant-ghost {
    border: 1px solid rgba(212, 175, 55, 0.4);
    color: rgba(255, 255, 255, 0.6);

    &:hover,
    &:active {
      border-color: #d4af37;
      color: #d4af37;
    }
  }

  &.variant-danger {
    border: 1px solid rgba(255, 51, 51, 0.6);
    color: #ff3333;

    &:hover,
    &:active {
      background: rgba(255, 51, 51, 0.1);
    }
  }

  &.disabled,
  &.loading,
  &[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.action-btn-dot {
  display: inline-block;
  animation: dot-anim 1.5s infinite;
}

@keyframes dot-anim {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}
</style>
