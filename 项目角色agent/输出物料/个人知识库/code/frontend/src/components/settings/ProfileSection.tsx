"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { updateProfile } from "@/services/settings";

interface ProfileSectionProps {
  name: string;
  email: string;
  avatar?: string;
}

export function ProfileSection({ name, email, avatar }: ProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await updateProfile({ name: editName.trim() });
      toast("success", "个人信息已更新");
      setEditing(false);
    } catch {
      toast("error", "更新失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6">
      <h3 className="text-sm font-semibold text-text-main mb-4">个人信息</h3>
      <div className="flex items-center gap-4 mb-4">
        <div className="avatar w-20 h-20 rounded-full bg-primary-light text-white flex items-center justify-center text-2xl font-semibold">
          {name.charAt(0)}
        </div>
        <div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-48"
              />
              <Button size="sm" onClick={handleSave} loading={loading}>保存</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(name); }}>取消</Button>
            </div>
          ) : (
            <>
              <p className="text-base font-medium text-text-main">
                {name}
                <button
                  onClick={() => setEditing(true)}
                  className="ml-2 text-xs text-primary hover:underline"
                >
                  编辑
                </button>
              </p>
              <p className="text-sm text-text-sec">{email}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
