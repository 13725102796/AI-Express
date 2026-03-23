"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/stores/authStore";
import { loginWithEmail, registerWithEmail } from "@/services/auth";

type Tab = "login" | "register";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const { toast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = "请输入邮箱地址";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "请输入有效的邮箱地址";
    if (!password) errs.password = "请输入密码";
    else if (password.length < 8) errs.password = "密码长度不少于 8 位";
    if (tab === "register" && password !== confirmPassword)
      errs.confirmPassword = "两次输入的密码不一致";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const user =
        tab === "login"
          ? await loginWithEmail(email, password)
          : await registerWithEmail(email, password);
      setUser(user);
      toast("success", tab === "login" ? "登录成功" : "注册成功，欢迎使用 KnowBase");
      router.push("/chat");
    } catch (err) {
      toast("error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="700" fontFamily="var(--font-ui)">K</text>
          </svg>
          <h1 className="text-2xl font-bold text-text-main">KnowBase</h1>
        </div>
        <p className="text-text-sec text-sm">个人知识的搜索引擎</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md bg-bg-card rounded-[var(--radius-modal)] shadow-[var(--shadow-card)] border border-border p-8">
        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setErrors({}); }}
              className={`flex-1 pb-3 text-sm font-medium transition-all border-b-2 ${
                tab === t
                  ? "text-primary border-primary"
                  : "text-text-tert border-transparent hover:text-text-sec"
              }`}
            >
              {t === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="邮箱"
            placeholder="请输入邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <Input
            type="password"
            label="密码"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          {tab === "register" && (
            <Input
              type="password"
              label="确认密码"
              placeholder="请确认密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
            />
          )}
          {tab === "login" && (
            <div className="text-right">
              <button type="button" className="text-xs text-primary hover:underline">
                忘记密码？
              </button>
            </div>
          )}
          <Button type="submit" className="w-full" loading={loading}>
            {tab === "login" ? "登录" : "创建账户"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-tert">或使用以下方式登录</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* OAuth buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 text-xs" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#07C160"><path d="M8.69 13.7c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.33.75-.75.75zm6.62 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.33.75-.75.75zM12 2C6.48 2 2 6.48 2 12c0 2.76 1.12 5.26 2.93 7.07L12 22l7.07-2.93A9.96 9.96 0 0022 12c0-5.52-4.48-10-10-10z"/></svg>
            微信
          </Button>
          <Button variant="secondary" className="flex-1 text-xs" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </Button>
          <Button variant="secondary" className="flex-1 text-xs" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </Button>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-text-tert">
        登录即表示同意
        <a href="#" className="text-primary hover:underline mx-0.5">服务条款</a>
        和
        <a href="#" className="text-primary hover:underline mx-0.5">隐私政策</a>
      </p>
    </div>
  );
}
