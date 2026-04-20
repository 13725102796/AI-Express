<template>
  <BaseAdminShell active="templates" topTitle="神谕模块管理">
    <text class="page-title">神谕模块管理</text>

    <!-- 操作条 -->
    <view class="action-bar">
      <view class="btn-primary" @click="openDrawer('new')">
        <text>+ 新建模块</text>
      </view>
      <view class="tab-group">
        <view
          v-for="f in statusTabs"
          :key="f.key"
          class="tab-btn"
          :class="{ active: statusFilter === f.key }"
          @click="setStatusFilter(f.key)"
        >
          <text>{{ f.label }}</text>
        </view>
      </view>
      <input
        class="search-input"
        placeholder="搜索模块名称..."
        :value="keyword"
        @input="onKeywordInput"
      />
    </view>

    <!-- 表格 -->
    <view class="table-wrap">
      <view class="table-head">
        <view class="cell id">ID</view>
        <view class="cell name">名称</view>
        <view class="cell tags">标签</view>
        <view class="cell price">积分</view>
        <view class="cell status">状态</view>
        <view class="cell count">启封数</view>
        <view class="cell date">创建时间</view>
        <view class="cell actions">操作</view>
      </view>
      <view v-if="loading && !filteredList.length" class="empty-row">
        <text>正在载入神谕模块...</text>
      </view>
      <view v-else-if="!filteredList.length" class="empty-row">
        <text>暂无神谕模块</text>
      </view>
      <view v-else>
        <view
          v-for="(tpl, i) in filteredList"
          :key="tpl.id"
          class="table-row"
        >
          <view class="cell id">#{{ String(i + 1).padStart(2, "0") }}</view>
          <view class="cell name">
            <text>{{ tpl.name }}</text>
          </view>
          <view class="cell tags">
            <text
              v-for="t in tpl.tags.slice(0, 2)"
              :key="t"
              class="badge tag"
              >{{ t }}</text
            >
          </view>
          <view class="cell price">{{ tpl.points_cost }}</view>
          <view class="cell status">
            <text class="badge" :class="statusBadgeClass(tpl.status)">
              {{ statusLabel(tpl.status) }}
            </text>
          </view>
          <view class="cell count">{{ tpl.unlock_count.toLocaleString() }}</view>
          <view class="cell date">{{ formatDate(tpl.created_at) }}</view>
          <view class="cell actions">
            <view class="act" @click="openDrawer('edit', tpl)">
              <text>编辑</text>
            </view>
            <view class="act" @click="toggleStatus(tpl)">
              <text>{{ tpl.status === "active" ? "下架" : "上架" }}</text>
            </view>
            <view class="act danger" @click="confirmDelete(tpl)">
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Drawer 编辑 -->
    <view v-if="drawerShow" class="drawer-mask" @click.self="closeDrawer" />
    <view class="drawer" :class="{ show: drawerShow }">
      <text class="drawer-title">
        {{ drawerMode === "edit" ? "编辑神谕模块" : "新建神谕模块" }}
      </text>

      <view class="drawer-field">
        <text class="drawer-label">模块名称</text>
        <input
          class="drawer-input"
          placeholder="如：事业财帛全景观"
          :value="form.name"
          @input="onFormInput('name', $event)"
        />
      </view>

      <view class="drawer-field">
        <text class="drawer-label">简介（≤ 200 字）</text>
        <textarea
          class="drawer-textarea"
          placeholder="商城卡片展示的简短描述"
          :value="form.description"
          @input="onFormInput('description', $event)"
        />
      </view>

      <view class="drawer-field">
        <text class="drawer-label">详细说明（≤ 1000 字）</text>
        <textarea
          class="drawer-textarea tall"
          placeholder="详情页展示的完整说明"
          :value="form.detail"
          @input="onFormInput('detail', $event)"
        />
      </view>

      <view class="drawer-field">
        <text class="drawer-label">提示词正文</text>
        <textarea
          class="drawer-textarea mono tall"
          placeholder="支持占位符 [排盘数据] / [用户性别] / [用户出生信息]"
          :value="form.prompt_content"
          @input="onFormInput('prompt_content', $event)"
        />
      </view>

      <view class="drawer-field">
        <text class="drawer-label">标签（逗号分隔）</text>
        <input
          class="drawer-input"
          placeholder="如：事业, 财帛, 官禄"
          :value="tagsText"
          @input="onTagsInput"
        />
      </view>

      <view class="drawer-field">
        <text class="drawer-label">所需积分</text>
        <input
          class="drawer-input"
          type="number"
          placeholder="0 表示免费"
          :value="String(form.points_cost ?? 0)"
          @input="onNumberInput('points_cost', $event)"
        />
      </view>

      <view class="drawer-field">
        <text class="drawer-label">排序权重（数字越小越靠前）</text>
        <input
          class="drawer-input"
          type="number"
          :value="String(form.sort_order ?? 0)"
          @input="onNumberInput('sort_order', $event)"
        />
      </view>

      <view class="drawer-field">
        <text class="drawer-label">预览图 URL（选填）</text>
        <input
          class="drawer-input"
          placeholder="https://..."
          :value="form.preview_image_url || ''"
          @input="onFormInput('preview_image_url', $event)"
        />
      </view>

      <view class="drawer-actions">
        <view class="btn-ghost" @click="closeDrawer">
          <text>取消</text>
        </view>
        <view
          class="btn-primary"
          :class="{ disabled: saving }"
          @click="saveForm"
        >
          <text>{{ saving ? "保存中..." : "保存" }}</text>
        </view>
      </view>
    </view>
  </BaseAdminShell>
</template>

<script setup lang="ts">
/**
 * A02 模板管理 CRUD
 * - 列表 + 状态筛选 + 搜索
 * - 新建/编辑 Drawer（从右侧滑出）
 * - 上下架切换 / 软删
 */
import { computed, onMounted, reactive, ref } from "vue";
import { ensureAdminAuth } from "@/utils/admin-guard";
import { adminApi } from "@/services/admin";
import type {
  PromptTemplate,
  TemplateStatus,
  AdminCreateTemplateReq,
} from "@/types/api";

const statusTabs = [
  { key: "all" as const, label: "全部状态" },
  { key: "active" as const, label: "已上架" },
  { key: "inactive" as const, label: "已下架" },
] as const;

const loading = ref(false);
const saving = ref(false);
const list = ref<PromptTemplate[]>([]);
const keyword = ref("");
const statusFilter = ref<"all" | "active" | "inactive">("all");

const drawerShow = ref(false);
const drawerMode = ref<"new" | "edit">("new");
const editingId = ref<string | null>(null);

const form = reactive<AdminCreateTemplateReq>({
  name: "",
  description: "",
  detail: "",
  prompt_content: "",
  tags: [],
  points_cost: 0,
  sort_order: 0,
  preview_image_url: "",
});

const tagsText = computed(() => form.tags.join(", "));

const filteredList = computed(() => {
  let arr = list.value;
  if (statusFilter.value !== "all") {
    arr = arr.filter((t) => t.status === statusFilter.value);
  }
  const kw = keyword.value.trim().toLowerCase();
  if (kw) {
    arr = arr.filter(
      (t) =>
        t.name.toLowerCase().includes(kw) ||
        (t.description || "").toLowerCase().includes(kw),
    );
  }
  return arr;
});

function statusLabel(s: TemplateStatus | string) {
  if (s === "active") return "上架";
  if (s === "inactive") return "下架";
  return "已删";
}
function statusBadgeClass(s: TemplateStatus | string) {
  if (s === "active") return "badge-active";
  if (s === "inactive") return "badge-inactive";
  return "badge-deleted";
}
function formatDate(iso: string) {
  if (!iso) return "--";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function onKeywordInput(e: any) {
  keyword.value = e?.detail?.value ?? "";
}
function setStatusFilter(k: "all" | "active" | "inactive") {
  statusFilter.value = k;
  void fetchList();
}

function onFormInput(key: keyof AdminCreateTemplateReq, e: any) {
  (form as any)[key] = e?.detail?.value ?? "";
}
function onNumberInput(key: "points_cost" | "sort_order", e: any) {
  const v = e?.detail?.value;
  const n = Number(v);
  (form as any)[key] = Number.isNaN(n) ? 0 : n;
}
function onTagsInput(e: any) {
  const raw = e?.detail?.value ?? "";
  form.tags = raw
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
}

function resetForm() {
  form.name = "";
  form.description = "";
  form.detail = "";
  form.prompt_content = "";
  form.tags = [];
  form.points_cost = 0;
  form.sort_order = 0;
  form.preview_image_url = "";
  editingId.value = null;
}

function openDrawer(mode: "new" | "edit", tpl?: PromptTemplate) {
  drawerMode.value = mode;
  if (mode === "edit" && tpl) {
    editingId.value = tpl.id;
    form.name = tpl.name;
    form.description = tpl.description || "";
    form.detail = tpl.detail || "";
    form.prompt_content = tpl.prompt_content || "";
    form.tags = [...(tpl.tags || [])];
    form.points_cost = tpl.points_cost;
    form.sort_order = tpl.sort_order;
    form.preview_image_url = tpl.preview_image_url || "";
  } else {
    resetForm();
  }
  drawerShow.value = true;
}
function closeDrawer() {
  drawerShow.value = false;
  resetForm();
}

async function saveForm() {
  if (saving.value) return;
  if (!form.name.trim()) {
    uni.showToast({ title: "请填写模块名称", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    if (drawerMode.value === "edit" && editingId.value) {
      await adminApi.templates.update(editingId.value, { ...form });
      uni.showToast({ title: "已更新", icon: "none" });
    } else {
      await adminApi.templates.create({ ...form });
      uni.showToast({ title: "已创建（默认下架）", icon: "none" });
    }
    closeDrawer();
    await fetchList();
  } catch (err: any) {
    console.error("[admin-tpl] 保存失败", err);
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(tpl: PromptTemplate) {
  const next: TemplateStatus =
    tpl.status === "active" ? ("inactive" as any) : ("active" as any);
  try {
    await adminApi.templates.toggleStatus(tpl.id, { status: next });
    uni.showToast({
      title: next === "active" ? "已上架" : "已下架",
      icon: "none",
    });
    await fetchList();
  } catch (err) {
    console.error("[admin-tpl] 切换状态失败", err);
  }
}

function confirmDelete(tpl: PromptTemplate) {
  uni.showModal({
    title: "确认删除？",
    content: `将软删除「${tpl.name}」，用户端不可见`,
    confirmText: "删除",
    confirmColor: "#ff3333",
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await adminApi.templates.delete(tpl.id);
        uni.showToast({ title: "已删除", icon: "none" });
        await fetchList();
      } catch (err) {
        console.error("[admin-tpl] 删除失败", err);
      }
    },
  });
}

async function fetchList() {
  loading.value = true;
  try {
    const q: any = { page: 1, page_size: 100 };
    if (statusFilter.value !== "all") q.status = statusFilter.value;
    const resp = await adminApi.templates.list(q);
    list.value = resp.data?.items || [];
  } catch (err) {
    console.error("[admin-tpl] 拉列表失败", err);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!ensureAdminAuth()) return;
  await fetchList();
});
</script>

<style lang="scss" scoped>
.page-title {
  display: block;
  font-size: 22px;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 24px;
  font-weight: 600;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 10px 20px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid #d4af37;
  color: #d4af37;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: background 0.3s ease;

  &:active {
    background: rgba(212, 175, 55, 0.25);
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.btn-ghost {
  padding: 10px 16px;
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.85);
  font-size: 12px;
  cursor: pointer;
  text-align: center;
}

.tab-group {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 8px 14px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  cursor: pointer;

  &.active {
    color: #d4af37;
    border-color: #d4af37;
    background: rgba(212, 175, 55, 0.1);
  }
}

.search-input {
  flex: 1;
  max-width: 300px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
}

/* 表格（自制，用 flex） */
.table-wrap {
  background: rgba(10, 10, 15, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.1);
  overflow-x: auto;
}

.table-head,
.table-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-width: 900px;
}

.table-head {
  background: rgba(212, 175, 55, 0.05);
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
  font-size: 11px;
  color: #d4af37;
  letter-spacing: 1.5px;
}

.table-row {
  border-bottom: 1px solid rgba(212, 175, 55, 0.06);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);

  &:hover {
    background: rgba(212, 175, 55, 0.03);
  }
}

.cell {
  padding: 2px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.cell.id {
  width: 60px;
  flex-shrink: 0;
}
.cell.name {
  width: 160px;
  flex-shrink: 0;
}
.cell.tags {
  width: 160px;
  flex-shrink: 0;
}
.cell.price {
  width: 60px;
  flex-shrink: 0;
}
.cell.status {
  width: 80px;
  flex-shrink: 0;
}
.cell.count {
  width: 80px;
  flex-shrink: 0;
}
.cell.date {
  width: 100px;
  flex-shrink: 0;
}
.cell.actions {
  flex: 1;
  gap: 8px;
  flex-wrap: nowrap;
}

.badge {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 10px;
  letter-spacing: 1px;
  display: inline-block;
}

.badge.tag {
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: rgba(212, 175, 55, 0.8);
  padding: 2px 6px;
}

.badge-active {
  background: rgba(91, 140, 90, 0.15);
  color: #6ec06d;
  border: 1px solid rgba(91, 140, 90, 0.3);
}
.badge-inactive {
  background: rgba(212, 175, 55, 0.05);
  color: rgba(212, 175, 55, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.2);
}
.badge-deleted {
  background: rgba(255, 80, 80, 0.05);
  color: #ff8888;
  border: 1px solid rgba(255, 80, 80, 0.2);
}

.act {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  cursor: pointer;
  font-size: 11px;
  text-align: center;

  &:active {
    background: rgba(212, 175, 55, 0.08);
  }

  &.danger {
    color: #ff8888;
    border-color: rgba(255, 100, 100, 0.3);
  }
}

.empty-row {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  letter-spacing: 2px;
}

/* Drawer */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
}

.drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 480px;
  max-width: 100%;
  background: #0a0a0f;
  border-left: 1px solid #d4af37;
  padding: 24px;
  overflow-y: auto;
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  &.show {
    transform: translateX(0);
  }
}

.drawer-title {
  display: block;
  font-size: 18px;
  color: #d4af37;
  letter-spacing: 4px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.4);
}

.drawer-field {
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-label {
  font-size: 11px;
  color: #d4af37;
  letter-spacing: 2px;
}

.drawer-input,
.drawer-textarea {
  width: 100%;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
}

.drawer-input:focus,
.drawer-textarea:focus {
  border-color: #d4af37;
}

.drawer-textarea {
  min-height: 80px;
  line-height: 1.6;
  resize: vertical;
}

.drawer-textarea.tall {
  min-height: 140px;
}

.drawer-textarea.mono {
  font-family: monospace;
  font-size: 12px;
}

.drawer-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(212, 175, 55, 0.4);

  .btn-ghost {
    flex: 1;
  }
  .btn-primary {
    flex: 1;
    text-align: center;
  }
}
</style>
