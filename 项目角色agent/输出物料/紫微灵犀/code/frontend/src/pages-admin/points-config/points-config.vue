<template>
  <BaseAdminShell active="points" topTitle="灵犀经济配置">
    <text class="page-title">灵犀经济配置</text>
    <text class="page-desc">
      配置项修改后即时生效，影响所有缘主的积分获取与消耗。修改前请确保理解每项配置对生态平衡的影响。
    </text>

    <view v-if="loading && !configs.length" class="empty-row">
      <text>载入中...</text>
    </view>

    <!-- 配置分组 -->
    <view v-for="group in groupedConfigs" :key="group.title" class="config-section">
      <text class="section-header">{{ group.title }}</text>
      <view class="config-grid">
        <view
          v-for="item in group.items"
          :key="item.key"
          class="config-card"
          :class="{ disabled: group.disabled }"
        >
          <text class="config-key">{{ item.key }}</text>
          <view class="config-row">
            <text class="config-value">
              {{ item.value }}
              <text class="config-unit">{{ unitOf(item.key) }}</text>
            </text>
            <view
              class="config-edit"
              :class="{ disabled: group.disabled }"
              @click="openEdit(item)"
            >
              <text>编辑</text>
            </view>
          </view>
          <text class="config-desc">{{ item.description || "--" }}</text>
        </view>
      </view>
    </view>

    <!-- 编辑 modal -->
    <view v-if="editing" class="modal-mask" @click.self="closeEdit">
      <view class="modal-card">
        <text class="modal-title">编辑：{{ editing.description || editing.key }}</text>
        <text class="modal-key">{{ editing.key }}</text>
        <input
          class="modal-input"
          type="number"
          :value="String(editValue)"
          @input="onEditInput"
        />
        <view class="modal-actions">
          <view class="btn-ghost" @click="closeEdit">
            <text>取消</text>
          </view>
          <view
            class="btn-primary"
            :class="{ disabled: saving }"
            @click="saveEdit"
          >
            <text>{{ saving ? "保存中..." : "保存（即时生效）" }}</text>
          </view>
        </view>
      </view>
    </view>
  </BaseAdminShell>
</template>

<script setup lang="ts">
/**
 * A04 积分配置 / 灵犀经济配置
 * - 列出所有配置项（分组：注册签到 / 分享邀请 / 广告 / 消耗）
 * - 点击编辑 → modal 修改 → PUT /admin/points-config/:key
 */
import { computed, onMounted, ref } from "vue";
import { ensureAdminAuth } from "@/utils/admin-guard";
import { adminApi } from "@/services/admin";
import type { PointsConfigItem } from "@/types/api";

const loading = ref(false);
const saving = ref(false);
const configs = ref<PointsConfigItem[]>([]);
const editing = ref<PointsConfigItem | null>(null);
const editValue = ref(0);

// 配置分组
const groupedConfigs = computed(() => {
  const keyOrder = [
    "register_bonus",
    "checkin_day_1",
    "checkin_day_2",
    "checkin_day_3",
    "checkin_day_4",
    "checkin_day_5",
    "checkin_day_6",
    "checkin_day_7",
    "share_reward",
    "share_daily_limit",
    "invite_reward",
    "ad_reward",
    "ad_daily_limit",
    "reading_cost",
  ];

  // 按 key 构建 map
  const map: Record<string, PointsConfigItem> = {};
  for (const c of configs.value) map[c.key] = c;

  const signup = keyOrder
    .filter((k) => k === "register_bonus" || k.startsWith("checkin_day_"))
    .map((k) => map[k])
    .filter(Boolean);
  const share = keyOrder
    .filter((k) => k.startsWith("share_") || k.startsWith("invite_"))
    .map((k) => map[k])
    .filter(Boolean);
  const ad = keyOrder
    .filter((k) => k.startsWith("ad_"))
    .map((k) => map[k])
    .filter(Boolean);
  const cost = keyOrder
    .filter((k) => k === "reading_cost")
    .map((k) => map[k])
    .filter(Boolean);

  // 其他未归类的 key
  const known = new Set(keyOrder);
  const others = configs.value.filter((c) => !known.has(c.key));

  const groups: Array<{
    title: string;
    items: PointsConfigItem[];
    disabled: boolean;
  }> = [
    { title: "汲取规则 · 注册与签到", items: signup, disabled: false },
    { title: "汲取规则 · 分享与邀请", items: share, disabled: false },
    { title: "汲取规则 · 广告（阶段二开放）", items: ad, disabled: true },
    { title: "消耗规则", items: cost, disabled: false },
  ];
  if (others.length) {
    groups.push({ title: "其他", items: others, disabled: false });
  }
  return groups.filter((g) => g.items.length > 0);
});

function unitOf(k: string): string {
  if (k.includes("limit")) return "次";
  return "¤";
}

function openEdit(item: PointsConfigItem) {
  editing.value = item;
  editValue.value = item.value;
}
function closeEdit() {
  editing.value = null;
  editValue.value = 0;
}

function onEditInput(e: any) {
  const v = e?.detail?.value;
  const n = Number(v);
  editValue.value = Number.isNaN(n) ? 0 : n;
}

async function saveEdit() {
  if (!editing.value || saving.value) return;
  saving.value = true;
  try {
    await adminApi.pointsConfig.update(editing.value.key, {
      value: editValue.value,
    });
    uni.showToast({ title: "配置已生效", icon: "none" });
    closeEdit();
    await fetchConfigs();
  } catch (err) {
    console.error("[admin-config] 更新失败", err);
  } finally {
    saving.value = false;
  }
}

async function fetchConfigs() {
  loading.value = true;
  try {
    const resp = await adminApi.pointsConfig.list();
    configs.value = resp.data || [];
  } catch (err) {
    console.error("[admin-config] 列表失败", err);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!ensureAdminAuth()) return;
  await fetchConfigs();
});
</script>

<style lang="scss" scoped>
.page-title {
  display: block;
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 8px;
  font-weight: 600;
}

.page-desc {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
  margin-bottom: 28px;
  line-height: 1.7;
}

.empty-row {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.config-section {
  margin-bottom: 36px;
}

.section-header {
  display: block;
  font-size: 13px;
  color: #d4af37;
  letter-spacing: 3px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  margin-bottom: 18px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.config-card {
  padding: 18px 20px;
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.1);
  border-radius: 8px;
  transition: border-color 0.3s ease;

  &:hover {
    border-color: rgba(212, 175, 55, 0.4);
  }

  &.disabled {
    opacity: 0.55;
  }
}

.config-key {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.config-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.config-value {
  font-size: 28px;
  color: #d4af37;
  font-weight: 600;
  letter-spacing: 1px;
}

.config-unit {
  font-size: 14px;
  color: rgba(212, 175, 55, 0.6);
  margin-left: 4px;
}

.config-edit {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  cursor: pointer;
  font-size: 11px;
  letter-spacing: 1px;

  &:active {
    background: rgba(212, 175, 55, 0.1);
  }

  &.disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.config-desc {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.6;
}

/* 编辑 modal */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-card {
  background: #0a0a0f;
  border: 1px solid #d4af37;
  padding: 28px;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 0 50px rgba(212, 175, 55, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-title {
  font-size: 16px;
  color: #d4af37;
  letter-spacing: 3px;
}

.modal-key {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
  margin-bottom: 12px;
}

.modal-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #fff;
  font-family: inherit;
  font-size: 18px;

  &:focus {
    border-color: #d4af37;
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary,
.btn-ghost {
  flex: 1;
  padding: 10px;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  text-align: center;
}

.btn-primary {
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid #d4af37;
  color: #d4af37;

  &:active {
    background: rgba(212, 175, 55, 0.25);
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.btn-ghost {
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.7);
}
</style>
