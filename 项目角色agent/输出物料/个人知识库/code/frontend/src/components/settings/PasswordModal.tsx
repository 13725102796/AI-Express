"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { changePassword } from "@/services/settings";

interface PasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function PasswordModal({ open, onClose }: PasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!oldPassword) errs.oldPassword = "请输入原密码";
    if (!newPassword) errs.newPassword = "请输入新密码";
    else if (newPassword.length < 8) errs.newPassword = "密码长度不少于 8 位";
    if (newPassword !== confirmPassword) errs.confirmPassword = "两次输入的密码不一致";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast("success", "密码已修改");
      onClose();
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast("error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="修改密码" size="sm">
      <div className="space-y-4">
        <Input
          type="password"
          label="原密码"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          error={errors.oldPassword}
        />
        <Input
          type="password"
          label="新密码"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
        />
        <Input
          type="password"
          label="确认新密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit} loading={loading}>确认修改</Button>
        </div>
      </div>
    </Modal>
  );
}
