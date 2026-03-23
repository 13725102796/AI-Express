"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/authStore";
import { deleteAccount } from "@/services/settings";
import { logout as logoutService } from "@/services/auth";

export function DangerZone() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const logoutStore = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logoutService();
    logoutStore();
    router.push("/login");
    toast("info", "已退出登录");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      logoutStore();
      router.push("/login");
      toast("success", "账户已删除");
    } catch {
      toast("error", "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-bg-card border border-error/20 rounded-[var(--radius-card)] p-6">
        <h3 className="text-sm font-semibold text-error mb-4">危险操作</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-main">退出登录</p>
              <p className="text-xs text-text-tert">退出当前账户</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-main">删除账户</p>
              <p className="text-xs text-text-tert">永久删除账户和所有数据，不可撤销</p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
              删除账户
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        title="确认删除账户"
        description="此操作将永久删除你的账户和所有数据（文档、对话历史、知识空间），不可恢复。"
        confirmText="永久删除"
        danger
        loading={deleting}
      />
    </>
  );
}
