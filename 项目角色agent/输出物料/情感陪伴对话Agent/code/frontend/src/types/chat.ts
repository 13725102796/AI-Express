import type { EmotionColorKey } from "./emotion";

/** Chat message as displayed in UI */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  emotion?: string;
  emotionIntensity?: number;
  emotionColor?: EmotionColorKey;
  createdAt: Date;
}

/** Conversation summary for list views */
export interface ConversationSummary {
  id: string;
  dateDisplay: string;
  preview: string;
  emotionTags: string[];
  messageCount: number;
  startedAt: Date;
}

/** Safety resources shown when safety guard triggers */
export interface SafetyResource {
  name: string;
  phone: string;
}

export const SAFETY_RESOURCES: SafetyResource[] = [
  { name: "24小时心理援助热线", phone: "400-161-9995" },
  { name: "北京心理危机研究与干预中心", phone: "010-82951332" },
  { name: "生命热线", phone: "400-821-1215" },
];

/** Breathing session configuration */
export interface BreathingSession {
  phase: "inhale" | "hold" | "exhale";
  phaseText: string;
  inhaleDuration: number;  // seconds
  holdDuration: number;
  exhaleDuration: number;
}

export const DEFAULT_BREATHING: BreathingSession = {
  phase: "inhale",
  phaseText: "吸...",
  inhaleDuration: 4,
  holdDuration: 4,
  exhaleDuration: 6,
};
