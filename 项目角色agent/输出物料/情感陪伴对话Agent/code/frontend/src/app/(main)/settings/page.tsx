"use client";

import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { COMPANION_STYLE_LABELS, MEMBERSHIP_TIERS } from "@/types/user";
import type { CompanionStyle, Memory } from "@/types/user";

const MOCK_MEMORIES: Memory[] = [
  { id: "mem-001", type: "person", content: "养了一只猫叫糯米", createdAt: new Date("2026-03-05") },
  { id: "mem-002", type: "person", content: "有一个leader经常挑方案的毛病", createdAt: new Date("2026-03-10") },
  { id: "mem-003", type: "preference", content: "不喜欢别人说\"你应该\"", createdAt: new Date("2026-03-12") },
  { id: "mem-004", type: "pattern", content: "加班后的晚上特别脆弱", createdAt: new Date("2026-03-18") },
  { id: "mem-005", type: "person", content: "好朋友叫小鱼，在上海工作", createdAt: new Date("2026-03-20") },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuthStore();
  const { showToast } = useUIStore();

  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showDarkModePicker, setShowDarkModePicker] = useState(false);
  const [editModal, setEditModal] = useState<{ field: string; value: string } | null>(null);
  const [deleteDataModal, setDeleteDataModal] = useState(false);
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [memories, setMemories] = useState(MOCK_MEMORIES);
  const [deleteMemoryConfirm, setDeleteMemoryConfirm] = useState<Memory | null>(null);

  const handleStyleChange = useCallback((style: CompanionStyle) => {
    updateUser({ companionStyle: style });
    setShowStylePicker(false);
    showToast("下次对话将使用新风格");
  }, [updateUser, showToast]);

  const handleDeleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    setDeleteMemoryConfirm(null);
    showToast("留白已经忘记了这件事");
  }, [showToast]);

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* User profile header */}
      <div className="flex flex-col items-center pt-safe-area-top mt-4 px-5 pb-6">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full mb-3"
          style={{
            background: "linear-gradient(135deg, oklch(0.75 0.10 55), oklch(0.68 0.08 300))",
          }}
        />
        <h2 className="font-heading text-xl font-semibold text-text-primary">
          {user?.nickname || "阿栗"}
        </h2>
        <p className="text-sm text-text-tertiary mt-1">
          和留白在一起 {user?.registeredDays || 32} 天
        </p>
      </div>

      {/* Settings groups */}
      <div className="px-5 space-y-6">
        {/* Companion preferences */}
        <SettingsGroup title="陪伴偏好">
          <SettingsRow
            label="陪伴风格"
            value={COMPANION_STYLE_LABELS[user?.companionStyle || "warm"].label}
            onClick={() => setShowStylePicker(!showStylePicker)}
          />
          {showStylePicker && (
            <div className="mt-2 space-y-2 animate-float-up">
              {(Object.entries(COMPANION_STYLE_LABELS) as [CompanionStyle, typeof COMPANION_STYLE_LABELS["warm"]][]).map(
                ([key, style]) => (
                  <button
                    key={key}
                    onClick={() => handleStyleChange(key)}
                    className={`w-full p-3 rounded-[var(--radius-md)] text-left transition-all
                      ${user?.companionStyle === key
                        ? "bg-primary-subtle border border-primary/30"
                        : "bg-surface-1 hover:bg-surface-2"
                      }`}
                  >
                    <p className="text-sm font-medium text-text-primary">{style.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{style.description}</p>
                  </button>
                )
              )}
            </div>
          )}

          <SettingsRow
            label="AI 称呼"
            value={user?.aiName || "留白"}
            onClick={() => setEditModal({ field: "aiName", value: user?.aiName || "留白" })}
          />
          <SettingsRow
            label="我的称呼"
            value={user?.nickname || "阿栗"}
            onClick={() => setEditModal({ field: "nickname", value: user?.nickname || "" })}
          />
        </SettingsGroup>

        {/* Appearance */}
        <SettingsGroup title="外观">
          <SettingsRow
            label="暗色模式"
            value={theme === "dark" ? "始终暗色" : theme === "light" ? "始终亮色" : "跟随系统"}
            onClick={() => setShowDarkModePicker(!showDarkModePicker)}
          />
          {showDarkModePicker && (
            <div className="mt-2 flex gap-2 animate-float-up">
              {[
                { value: "system", label: "跟随系统" },
                { value: "light", label: "始终亮色" },
                { value: "dark", label: "始终暗色" },
              ].map((opt) => (
                <Pill
                  key={opt.value}
                  active={theme === opt.value}
                  onClick={() => {
                    setTheme(opt.value);
                    setShowDarkModePicker(false);
                  }}
                  size="md"
                >
                  {opt.label}
                </Pill>
              ))}
            </div>
          )}
        </SettingsGroup>

        {/* Notifications */}
        <SettingsGroup title="通知">
          <SettingsRowToggle
            label="关怀提醒"
            checked={user?.notificationsEnabled ?? true}
            onChange={(v) => updateUser({ notificationsEnabled: v })}
          />
          <SettingsRowToggle
            label="回声信到期提醒"
            checked={user?.echoLetterReminder ?? true}
            onChange={(v) => updateUser({ echoLetterReminder: v })}
          />
          <SettingsRowToggle
            label="呼吸引导震动反馈"
            checked={user?.breathingVibration ?? true}
            onChange={(v) => updateUser({ breathingVibration: v })}
          />
        </SettingsGroup>

        {/* Privacy & data */}
        <SettingsGroup title="隐私与数据">
          <SettingsRow
            label="管理 AI 记忆"
            value={`${memories.length} 条记忆`}
            onClick={() => setShowMemories(!showMemories)}
          />
          {showMemories && (
            <div className="mt-2 space-y-2 animate-float-up">
              {memories.map((mem) => (
                <div key={mem.id} className="flex items-center justify-between p-3 bg-surface-1 rounded-[var(--radius-md)]">
                  <p className="text-sm text-text-primary flex-1">{mem.content}</p>
                  <button
                    onClick={() => setDeleteMemoryConfirm(mem)}
                    className="text-xs text-text-tertiary hover:text-error transition-colors ml-2 flex-shrink-0"
                  >
                    忘记
                  </button>
                </div>
              ))}
            </div>
          )}

          <SettingsRow
            label="导出我的数据"
            onClick={() => showToast("数据导出文件已准备好")}
          />
          <SettingsRow
            label="清除所有数据"
            danger
            onClick={() => setDeleteDataModal(true)}
          />
        </SettingsGroup>

        {/* Membership */}
        <SettingsGroup title="会员">
          <div className="p-4 bg-primary-subtle rounded-[var(--radius-lg)] border border-primary/10">
            <div className="flex items-center justify-between mb-2">
              <p className="font-heading font-semibold text-text-primary">
                {MEMBERSHIP_TIERS[user?.tier || "free"].name}
              </p>
              <p className="text-sm text-primary font-medium">
                {MEMBERSHIP_TIERS[user?.tier || "free"].price}
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {MEMBERSHIP_TIERS[user?.tier || "free"].features.map((f) => (
                <Pill key={f} size="sm">{f}</Pill>
              ))}
            </div>
          </div>
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title="关于">
          <div className="p-3 bg-surface-1 rounded-[var(--radius-md)]">
            <p className="text-xs text-text-secondary leading-relaxed">
              留白是一个情绪陪伴工具，不是专业心理咨询服务。如果你正在经历严重的心理困扰，请寻求专业帮助。
            </p>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">版本</span>
            <span className="text-sm text-text-tertiary">v1.0.0</span>
          </div>
          <button className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            隐私政策
          </button>
        </SettingsGroup>

        {/* Danger zone */}
        <div className="pt-4 pb-8">
          <button
            onClick={() => setDeleteAccountModal(true)}
            className="text-sm text-error/60 hover:text-error transition-colors"
          >
            注销账号
          </button>
        </div>
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={editModal?.field === "aiName" ? "修改 AI 称呼" : "修改昵称"}
        confirmText="保存"
        onConfirm={() => {
          if (editModal) {
            updateUser({ [editModal.field]: editModal.value });
            setEditModal(null);
            showToast("已更新");
          }
        }}
      >
        <input
          type="text"
          value={editModal?.value || ""}
          onChange={(e) => setEditModal((prev) => prev ? { ...prev, value: e.target.value } : null)}
          className="w-full px-4 py-3 bg-surface-1 text-text-primary rounded-[var(--radius-md)]
            border border-border focus:border-border-focus focus:outline-none mt-2"
          autoFocus
        />
      </Modal>

      {/* Delete memory confirmation */}
      <Modal
        open={!!deleteMemoryConfirm}
        onClose={() => setDeleteMemoryConfirm(null)}
        title="确定让留白忘记这件事吗？"
        description={deleteMemoryConfirm?.content}
        confirmText="确定忘记"
        danger
        onConfirm={() => deleteMemoryConfirm && handleDeleteMemory(deleteMemoryConfirm.id)}
      />

      {/* Delete data confirmation */}
      <Modal
        open={deleteDataModal}
        onClose={() => setDeleteDataModal(false)}
        title="清除所有数据"
        description="这将删除所有对话、化石和记忆。此操作不可恢复。"
        confirmText="确定清除"
        danger
        onConfirm={() => {
          setDeleteDataModal(false);
          showToast("所有数据将在 24 小时内彻底删除", "warning");
        }}
      />

      {/* Delete account confirmation */}
      <Modal
        open={deleteAccountModal}
        onClose={() => setDeleteAccountModal(false)}
        title="注销账号"
        description="账号将在 7 天后注销，期间可随时登录取消。"
        confirmText="确定注销"
        danger
        onConfirm={() => {
          setDeleteAccountModal(false);
          showToast("账号将在 7 天后注销", "warning");
        }}
      />
    </div>
  );
}

// --- Helper components ---

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs text-text-tertiary font-medium mb-2 uppercase tracking-wider">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  onClick,
  danger = false,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 text-left hover:bg-surface-1 -mx-2 px-2 rounded-[var(--radius-sm)] transition-colors"
    >
      <span className={`text-sm ${danger ? "text-error/70" : "text-text-primary"}`}>{label}</span>
      {value && (
        <span className="text-sm text-text-tertiary">{value}</span>
      )}
    </button>
  );
}

function SettingsRowToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-text-primary">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
