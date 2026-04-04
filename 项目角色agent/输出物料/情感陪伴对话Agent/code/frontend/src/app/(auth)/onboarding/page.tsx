"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/authStore";
import type { OnboardingStep } from "@/types/user";

const STEPS: OnboardingStep[] = [
  {
    step: 1,
    aiText: "你好，这里是留白。\n你可以叫我任何你喜欢的名字，或者不叫也行。",
    inputType: "text",
    inputPlaceholder: "你想怎么称呼你的留白？",
    defaultValue: "留白",
  },
  {
    step: 2,
    aiText: "好的，{aiName}就{aiName}。\n那你希望我怎么叫你呢？",
    inputType: "text",
    inputPlaceholder: "你的名字或昵称",
  },
  {
    step: 3,
    aiText: "{nickname}，好名字。\n每个人需要的陪伴方式不一样。你觉得哪种更像你想要的？",
    inputType: "choice",
    choices: [
      { id: "quiet", label: "安静陪伴", description: "少说多听，你说我就在", icon: "moon" },
      { id: "warm", label: "温暖共情", description: "说出你说不出的感受", icon: "heart" },
      { id: "rational", label: "理性梳理", description: "帮你理清楚到底怎么了", icon: "compass" },
    ],
  },
  {
    step: 4,
    aiText: "{styleLabel}，记下了。\n你一般什么时候最想找人聊聊？",
    inputType: "choice",
    choices: [
      { id: "latenight", label: "深夜睡不着的时候", description: "", icon: "stars" },
      { id: "commute", label: "通勤路上", description: "", icon: "train" },
      { id: "afterwork", label: "下班回家后", description: "", icon: "home" },
      { id: "anytime", label: "随时都有可能", description: "", icon: "clock" },
    ],
  },
  {
    step: 5,
    aiText: "我记住了——\n你喜欢被叫{nickname}，\n比起给建议你更希望有人听你说。\n\n以后我就在这里。",
    inputType: "final",
    buttonText: "开始对话",
  },
];

const ICON_MAP: Record<string, string> = {
  moon: "\u{1F319}",
  heart: "\u{2764}\u{FE0F}",
  compass: "\u{1F9ED}",
  stars: "\u{2728}",
  train: "\u{1F689}",
  home: "\u{1F3E0}",
  clock: "\u{23F0}",
};

const STYLE_LABELS: Record<string, string> = {
  quiet: "安静陪伴型",
  warm: "温暖共情型",
  rational: "理性梳理型",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { updateUser } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    aiName: "留白",
    nickname: "",
    companionStyle: "",
    preferredTime: "",
  });
  const [textInput, setTextInput] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  const step = STEPS[currentStep];

  // Replace placeholders in AI text
  const getAiText = useCallback(() => {
    let text = step.aiText;
    text = text.replace(/{aiName}/g, answers.aiName || "留白");
    text = text.replace(/{nickname}/g, answers.nickname || "朋友");
    text = text.replace(/{styleLabel}/g, STYLE_LABELS[answers.companionStyle] || "温暖共情型");
    return text;
  }, [step.aiText, answers]);

  // Typewriter effect
  useState(() => {
    const text = getAiText();
    let i = 0;
    setDisplayedText("");
    setIsTyping(true);
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  });

  const handleNext = useCallback(
    (value?: string) => {
      const stepIndex = currentStep;

      if (stepIndex === 0) {
        setAnswers((prev) => ({ ...prev, aiName: textInput || "留白" }));
      } else if (stepIndex === 1) {
        setAnswers((prev) => ({ ...prev, nickname: textInput || "朋友" }));
      } else if (stepIndex === 2) {
        setAnswers((prev) => ({ ...prev, companionStyle: value || "warm" }));
      } else if (stepIndex === 3) {
        setAnswers((prev) => ({ ...prev, preferredTime: value || "anytime" }));
      }

      setTextInput("");

      if (stepIndex < STEPS.length - 1) {
        setCurrentStep(stepIndex + 1);
      }
    },
    [currentStep, textInput]
  );

  const handleFinish = useCallback(async () => {
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiName: answers.aiName,
          nickname: answers.nickname,
          companionStyle: answers.companionStyle || "warm",
          preferredTime: answers.preferredTime,
          onboardingCompleted: true,
        }),
      });
      updateUser({
        aiName: answers.aiName,
        nickname: answers.nickname,
        companionStyle: (answers.companionStyle as "quiet" | "warm" | "rational") || "warm",
        onboardingCompleted: true,
      });
    } catch {
      // Continue even if save fails
    }
    router.push("/chat");
  }, [answers, router, updateUser]);

  const handleSkip = useCallback(() => {
    updateUser({ onboardingCompleted: true });
    router.push("/chat");
  }, [router, updateUser]);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="flex-1 flex flex-col bg-surface-0 px-8">
      {/* Progress bar */}
      <div className="pt-safe-area-top mt-4">
        <div className="h-0.5 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-[var(--duration-slow)] ease-[var(--ease-out-quart)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* AI text area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-lg text-text-primary leading-relaxed whitespace-pre-line font-body">
            {displayedText}
            {isTyping && <span className="animate-breathing inline-block ml-0.5">|</span>}
          </p>
        </div>

        {/* Input area (appears after typing completes) */}
        {!isTyping && step.inputType === "text" && (
          <div className="mt-8 w-full max-w-sm animate-float-up">
            <input
              type="text"
              placeholder={step.inputPlaceholder}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNext()}
              className="w-full px-4 py-3 bg-surface-1 text-text-primary text-center
                border-b-2 border-border focus:border-border-focus focus:outline-none
                placeholder:text-text-tertiary rounded-[var(--radius-sm)]
                transition-colors duration-[var(--duration-normal)]"
              autoFocus
            />
            <Button
              className="w-full mt-4"
              pill
              onClick={() => handleNext()}
              disabled={!textInput.trim()}
            >
              好的
            </Button>
          </div>
        )}

        {!isTyping && step.inputType === "choice" && (
          <div className="mt-8 w-full max-w-sm space-y-3 animate-float-up">
            {step.choices?.map((choice) => (
              <button
                key={choice.id}
                onClick={() => handleNext(choice.id)}
                className="w-full p-4 bg-surface-1 rounded-[var(--radius-lg)] text-left
                  hover:bg-primary-subtle active:bg-primary-subtle
                  transition-all duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]
                  border border-transparent hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{ICON_MAP[choice.icon] || ""}</span>
                  <div>
                    <p className="font-medium text-text-primary">{choice.label}</p>
                    {choice.description && (
                      <p className="text-sm text-text-secondary mt-0.5">{choice.description}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!isTyping && step.inputType === "final" && (
          <div className="mt-8 w-full max-w-sm animate-float-up">
            <Button className="w-full" size="lg" pill onClick={handleFinish}>
              {step.buttonText || "开始对话"}
            </Button>
          </div>
        )}
      </div>

      {/* Skip button */}
      {currentStep < STEPS.length - 1 && (
        <div className="pb-8 text-center safe-area-bottom">
          <button
            onClick={handleSkip}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            暂时不想聊，先看看
          </button>
        </div>
      )}
    </div>
  );
}
