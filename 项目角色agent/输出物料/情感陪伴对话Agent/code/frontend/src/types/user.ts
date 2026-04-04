/** User profile */
export interface User {
  id: string;
  nickname: string;
  aiName: string;
  phone?: string;
  companionStyle: CompanionStyle;
  preferredTime?: string;
  tier: MembershipTier;
  onboardingCompleted: boolean;
  darkMode: DarkModePreference;
  notificationsEnabled: boolean;
  echoLetterReminder: boolean;
  breathingVibration: boolean;
  registeredDays: number;
  createdAt: Date;
}

export type CompanionStyle = "quiet" | "warm" | "rational";

export const COMPANION_STYLE_LABELS: Record<CompanionStyle, { label: string; description: string; icon: string }> = {
  quiet: { label: "安静陪伴", description: "少说多听，你说我就在", icon: "moon" },
  warm: { label: "温暖共情", description: "说出你说不出的感受", icon: "heart" },
  rational: { label: "理性梳理", description: "帮你理清楚到底怎么了", icon: "compass" },
};

export type MembershipTier = "free" | "deep" | "echo";

export const MEMBERSHIP_TIERS: Record<MembershipTier, { name: string; price: string; features: string[] }> = {
  free: {
    name: "自由层",
    price: "免费",
    features: ["无限对话", "基础情绪识别", "14天记忆"],
  },
  deep: {
    name: "深层",
    price: "19.9元/月",
    features: ["30种情绪识别", "完整记忆", "情绪地貌图"],
  },
  echo: {
    name: "回声层",
    price: "29.9元/月",
    features: ["深层全部", "无限回声信", "月度洞察"],
  },
};

export type DarkModePreference = "system" | "light" | "dark";

/** Memory - AI's understanding of the user */
export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  createdAt: Date;
}

export type MemoryType = "person" | "event" | "preference" | "pattern" | "personality";

/** Onboarding step configuration */
export interface OnboardingStep {
  step: number;
  aiText: string;
  inputType: "text" | "choice" | "final";
  inputPlaceholder?: string;
  defaultValue?: string;
  choices?: OnboardingChoice[];
  buttonText?: string;
}

export interface OnboardingChoice {
  id: string;
  label: string;
  description: string;
  icon: string;
}
