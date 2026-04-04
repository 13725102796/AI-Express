/** Emotion domains matching PRD Section 3.2 */
export type EmotionDomain =
  | "anxiety"    // 焦虑域
  | "sadness"    // 悲伤域
  | "anger"      // 愤怒域
  | "fatigue"    // 疲惫域
  | "positive"   // 积极域
  | "complex"    // 复合域
  | "social";    // 社交域

/** Fine-grained emotions (30+) */
export type Emotion =
  // Anxiety domain
  | "焦虑" | "紧张" | "不安" | "恐惧" | "坐立不安"
  // Sadness domain
  | "难过" | "失落" | "孤独" | "委屈" | "心疼" | "怀念"
  // Anger domain
  | "生气" | "烦躁" | "不满" | "挫败" | "被冒犯"
  // Fatigue domain
  | "倦怠" | "麻木" | "厌倦" | "提不起劲"
  // Positive domain
  | "开心" | "兴奋" | "感动" | "释然" | "期待" | "满足" | "骄傲"
  // Complex domain
  | "纠结" | "无奈" | "五味杂陈" | "又爱又恨" | "苦笑"
  // Social domain
  | "被忽视" | "嫉妒" | "社恐" | "讨好疲劳" | "边界感丧失";

/** Emotion intensity levels 1-5 */
export type EmotionIntensity = 1 | 2 | 3 | 4 | 5;

/** Emotion shift direction within a conversation */
export type EmotionShift = "stable" | "improving" | "worsening" | "fluctuating";

/** CSS color variable for emotion visualization */
export type EmotionColorKey =
  | "emotion-lonely"
  | "emotion-anxious"
  | "emotion-sad"
  | "emotion-angry"
  | "emotion-calm"
  | "emotion-happy"
  | "emotion-confused"
  | "emotion-touched";

/** Emotion analysis result from AI */
export interface EmotionAnalysis {
  primaryEmotion: string;
  secondaryEmotion?: string;
  intensity: EmotionIntensity;
  emotionDomain: EmotionDomain;
  surfaceVsDeep?: {
    surface: string;
    deep: string;
  };
  emotionShift: EmotionShift;
  safetyFlag: boolean;
}

/** Mapping from emotion domain to CSS color */
export const emotionDomainColorMap: Record<EmotionDomain, EmotionColorKey> = {
  anxiety: "emotion-anxious",
  sadness: "emotion-sad",
  anger: "emotion-angry",
  fatigue: "emotion-lonely",
  positive: "emotion-happy",
  complex: "emotion-confused",
  social: "emotion-lonely",
};
