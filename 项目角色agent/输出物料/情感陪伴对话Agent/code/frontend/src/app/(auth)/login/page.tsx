"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

type AuthStep = "phone" | "code" | "verifying";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { showToast } = useUIStore();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isPhoneValid = /^1[3-9]\d{9}$/.test(phone);

  const handleSendCode = useCallback(async () => {
    if (!isPhoneValid) {
      setPhoneError("请输入正确的手机号");
      return;
    }
    setPhoneError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.success) {
        setStep("code");
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        showToast(data.message || "发送失败，请稍后再试", "error");
      }
    } catch {
      showToast("网络有点不稳定，等一下再试", "error");
    } finally {
      setLoading(false);
    }
  }, [phone, isPhoneValid, showToast]);

  const handleCodeInput = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newCode = [...code];
      newCode[index] = value.slice(-1);
      setCode(newCode);
      setCodeError("");

      // Auto-focus next input
      if (value && index < 5) {
        codeRefs.current[index + 1]?.focus();
      }

      // Auto-verify when all 6 digits entered
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    },
    [code]
  );

  const handleCodeKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !code[index] && index > 0) {
        codeRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handleVerify = useCallback(
    async (fullCode: string) => {
      setStep("verifying");
      setLoading(true);

      try {
        const res = await fetch("/api/auth/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: fullCode }),
        });
        const data = await res.json();

        if (data.success) {
          setUser(data.user);
          if (data.isNewUser) {
            router.push("/onboarding");
          } else {
            router.push("/chat");
          }
        } else {
          setCodeError("验证码不正确，请重试");
          setCode(["", "", "", "", "", ""]);
          setStep("code");
          codeRefs.current[0]?.focus();
        }
      } catch {
        showToast("网络有点不稳定，等一下再试", "error");
        setStep("code");
      } finally {
        setLoading(false);
      }
    },
    [phone, router, setUser, showToast]
  );

  return (
    <div className="flex-1 flex flex-col bg-surface-0 relative overflow-hidden">
      {/* Background emotion spectrum animation */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.75 0.10 55 / 0.3), oklch(0.68 0.08 300 / 0.2), oklch(0.70 0.08 155 / 0.2))",
            animation: "breathing 8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Brand area -- top half */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <h1 className="font-display text-5xl text-text-primary mb-2 animate-float-up">
          留白
        </h1>
        <p className="font-heading text-lg text-text-secondary tracking-wider animate-float-up" style={{ animationDelay: "100ms" }}>
          Liminal
        </p>
        <p
          className="mt-6 text-center text-text-secondary text-sm leading-relaxed max-w-xs animate-float-up"
          style={{ animationDelay: "200ms" }}
        >
          在两种状态之间，给情绪留出呼吸的空间
        </p>
      </div>

      {/* Form area -- bottom half */}
      <div
        className="bg-surface-1 rounded-t-[var(--radius-xl)] px-8 pt-8 pb-10 safe-area-bottom relative z-10 animate-float-up"
        style={{ animationDelay: "300ms" }}
      >
        {/* Phone input */}
        <div className="mb-6">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="手机号"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError("");
            }}
            maxLength={11}
            className={`
              w-full px-4 py-4 bg-surface-0 text-text-primary text-lg
              border-b-2 ${phoneError ? "border-error" : "border-border focus:border-border-focus"}
              focus:outline-none placeholder:text-text-tertiary
              transition-colors duration-[var(--duration-normal)]
              rounded-t-[var(--radius-sm)]
            `}
          />
          {phoneError && (
            <p className="mt-1.5 text-sm text-error animate-float-up">
              {phoneError}
            </p>
          )}
        </div>

        {/* Verification code area */}
        {step !== "phone" && (
          <div className="mb-6 animate-float-up">
            <div className="flex gap-2.5 justify-center">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className={`
                    w-11 h-13 text-center text-xl font-heading font-semibold
                    bg-surface-0 rounded-[var(--radius-sm)]
                    border-b-2 ${codeError ? "border-error animate-shake" : "border-border focus:border-border-focus"}
                    focus:outline-none
                    transition-colors duration-[var(--duration-normal)]
                  `}
                />
              ))}
            </div>
            {codeError && (
              <p className="mt-2 text-sm text-error text-center animate-float-up">
                {codeError}
              </p>
            )}
          </div>
        )}

        {/* Send code / Login button */}
        {step === "phone" ? (
          <Button
            className="w-full"
            size="lg"
            pill
            onClick={handleSendCode}
            disabled={!isPhoneValid}
            loading={loading}
          >
            获取验证码
          </Button>
        ) : (
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-text-tertiary">{countdown}s 后可重发</p>
            ) : (
              <button
                onClick={handleSendCode}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                重新发送验证码
              </button>
            )}
          </div>
        )}

        {/* WeChat login */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-text-tertiary">或</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <Button
          variant="secondary"
          className="w-full mt-4"
          size="lg"
          pill
          onClick={() => showToast("微信登录即将上线", "warning")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18z" />
            <path d="M23.96 14.789c0-3.168-3.038-5.734-6.786-5.734-3.748 0-6.786 2.566-6.786 5.734 0 3.17 3.038 5.735 6.786 5.735.75 0 1.477-.109 2.166-.291a.67.67 0 0 1 .554.074l1.453.849a.246.246 0 0 0 .128.042.225.225 0 0 0 .222-.225c0-.055-.022-.109-.037-.163l-.3-1.127a.458.458 0 0 1 .163-.508c1.417-1.05 2.437-2.732 2.437-4.386zm-9.357-1.07c-.487 0-.882-.4-.882-.893s.395-.893.882-.893.882.4.882.893-.395.893-.882.893zm5.143 0c-.487 0-.882-.4-.882-.893s.395-.893.882-.893.882.4.882.893-.395.893-.882.893z" />
          </svg>
          微信登录
        </Button>

        {/* Agreement */}
        <p className="mt-6 text-xs text-text-tertiary text-center leading-relaxed">
          登录即同意
          <button className="text-text-secondary underline mx-0.5">用户协议</button>
          和
          <button className="text-text-secondary underline mx-0.5">隐私政策</button>
        </p>

        {/* Safety note */}
        <p className="mt-3 text-[10px] text-text-tertiary text-center">
          你的每一句话都会被加密保护，我们不会用于任何训练
        </p>
      </div>
    </div>
  );
}
