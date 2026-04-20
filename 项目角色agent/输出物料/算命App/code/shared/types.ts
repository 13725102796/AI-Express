/** 天干 */
export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/** 地支 */
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 五行 */
export type FiveElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth';

/** 单柱 */
export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  element: string;
}

/** 八字数据 */
export interface BaziData {
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar | null;
  fiveElements: Record<FiveElement, number>;
  summary: string;
}

/** 出生数据 */
export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;       // 0-11 for 12 时辰, -1 = 不确定
  gender: 'male' | 'female' | null;
}

/** 运势维度 */
export type FortuneDimension = 'overall' | 'personality' | 'career' | 'love' | 'wealth';

/** 单维度运势 */
export interface FortuneItem {
  dimension: FortuneDimension;
  title: string;
  summary: string;
  detail: string;
}

/** 对话消息 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fortunes?: FortuneItem[];
  timestamp: number;
}

/** 签文数据 */
export interface FortuneSign {
  style: 'ink-gold' | 'cinnabar' | 'ink-wash';
  type: string;
  keywords: string[];
  poem: string;
  interpretation: string;
  dateLunar: string;
  dateSolar: string;
}

/** 首次算命请求 */
export interface FortuneStartRequest {
  baziData: BaziData;
  gender?: 'male' | 'female' | null;
}

/** 对话追问请求 */
export interface FortuneChatRequest {
  message: string;
  baziData: BaziData;
  history: { role: 'user' | 'assistant'; content: string }[];
  round: number;
}

/** API 错误 */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
