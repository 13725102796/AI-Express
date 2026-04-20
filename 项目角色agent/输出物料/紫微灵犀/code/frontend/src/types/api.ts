/**
 * 紫微灵犀 API 类型契约
 * 来源：shared-types.md（单一事实来源）
 * 不一致时先改 shared-types.md，再同步此文件
 */

// ============== 通用包装 ==============
export interface ApiResponse<T> {
  code: number;
  data: T | null;
  message: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type EmptyResponse = ApiResponse<{ ok: true }>;

// ============== 共享枚举 ==============
export enum BirthType {
  Solar = "solar",
  Lunar = "lunar",
}

export enum Gender {
  Male = "male",
  Female = "female",
}

export enum PointsTxType {
  RegisterBonus = "register_bonus",
  DailyCheckin = "daily_checkin",
  ShareReward = "share_reward",
  AdReward = "ad_reward",
  InviteReward = "invite_reward",
  UnlockTemplate = "unlock_template",
  AiReading = "ai_reading",
  Refund = "refund",
}

export enum TemplateStatus {
  Active = "active",
  Inactive = "inactive",
  Deleted = "deleted",
}

export const TIME_INDEX_RANGE = [0, 12] as const;

// ============== 业务实体 ==============
export interface UserBrief {
  id: string;
  nickname: string;
  avatar_url: string | null;
  phone_masked: string;
  points_balance: number;
  invite_code: string;
  free_reading_used: boolean;
  has_profile: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  birth_type: BirthType;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_time_index: number;
  gender: Gender;
  is_leap_month: boolean;
  birth_place_province: string | null;
  birth_place_city: string | null;
  created_at: string;
  updated_at: string;
}

// ============== 排盘实体（对齐 /paipan/json） ==============
export interface ChartStar {
  name: string;
  brightness?: string;
  mutagen?: string; // 禄/权/科/忌
}

export interface ChartPalace {
  name: string;
  earthlyBranch: string;
  heavenlyStem: string;
  isBodyPalace: boolean;
  majorStars: ChartStar[];
  minorStars: ChartStar[];
  adjectiveStars: ChartStar[];
  suiqian12: string;
  jiangqian12: string;
  changsheng12: string;
  boshi12: string;
  decadal?: { range: [number, number] };
  ages?: number[];
}

export interface ChartJson {
  gender: string;
  lunarDate: string;
  time: string;
  chineseDate: string;
  fiveElementsClass: string;
  earthlyBranchOfBodyPalace: string;
  soulMaster: string;
  bodyMaster: string;
  douJun: string;
  palaces: ChartPalace[];
}

export interface ChartData {
  id: string;
  user_id: string;
  profile_id: string;
  chart_json: ChartJson;
  chart_text: string;
  api_params: Record<string, unknown>;
  created_at: string;
}

// ============== 积分 ==============
export interface PointsTransaction {
  id: string;
  user_id: string;
  type: PointsTxType;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export interface CheckinStatus {
  checked_in_today: boolean;
  consecutive_days: number;
  today_reward: number;
  next_reward: number;
}

// ============== 模板 ==============
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  detail: string;
  prompt_content?: string;
  tags: string[];
  points_cost: number;
  preview_image_url: string | null;
  status: TemplateStatus;
  unlock_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_unlocked?: boolean;
}

export interface UserTemplate {
  id: string;
  user_id: string;
  template_id: string;
  template?: PromptTemplate;
  points_spent: number;
  unlocked_at: string;
}

// ============== 报告 ==============
export interface ReadingReport {
  id: string;
  user_id: string;
  template_id: string;
  template?: PromptTemplate;
  chart_id: string;
  ai_response: string;
  model_name: string;
  token_usage: { input_tokens?: number; output_tokens?: number } | null;
  points_spent: number;
  share_token: string | null;
  created_at: string;
}

export interface ReadingReportBrief {
  id: string;
  template_name: string;
  excerpt: string;
  created_at: string;
}

// ============== 管理后台 ==============
export interface PointsConfigItem {
  id: string;
  key: string;
  value: number;
  description: string | null;
  updated_at: string;
}

export interface AdminBrief {
  id: string;
  username: string;
  created_at: string;
}

export interface AdminUserView {
  id: string;
  nickname: string;
  phone_masked: string;
  points_balance: number;
  invite_code: string;
  invited_by: string | null;
  free_reading_used: boolean;
  has_profile: boolean;
  reports_count: number;
  unlocks_count: number;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_charts: number;
  total_reports: number;
  total_unlocks: number;
  dau_today: number;
  dau_7d: number[];
  top5_templates: Array<{ id: string; name: string; unlock_count: number }>;
}

// ============== 认证请求/响应 ==============
export interface RegisterReq {
  phone: string;
  password: string;
  invite_code?: string;
}

export interface AuthTokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface RegisterRespData {
  user: UserBrief;
  tokens: AuthTokenPair;
}

export interface LoginReq {
  phone: string;
  password: string;
}

export interface RefreshReq {
  refresh_token: string;
}

export type RegisterResp = ApiResponse<RegisterRespData>;
export type LoginResp = ApiResponse<RegisterRespData>;
export type RefreshResp = ApiResponse<AuthTokenPair>;

// ============== 用户 ==============
export type GetMeResp = ApiResponse<UserBrief>;
export type GetProfileResp = ApiResponse<UserProfile | null>;

export interface UpsertProfileReq {
  birth_type: BirthType;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_time_index: number;
  gender: Gender;
  is_leap_month?: boolean;
  birth_place_province?: string;
  birth_place_city?: string;
}

export interface UpsertProfileRespData {
  profile: UserProfile;
  chart_generated: boolean;
}

export type UpsertProfileResp = ApiResponse<UpsertProfileRespData>;

// ============== 排盘 ==============
export type GenerateChartResp = ApiResponse<ChartData>;
export type GetMyChartResp = ApiResponse<ChartData | null>;

// ============== 积分 ==============
export type GetBalanceResp = ApiResponse<{ balance: number }>;

export interface ListTxQuery {
  page?: number;
  page_size?: number;
  type?: PointsTxType;
}

export type ListTxResp = ApiResponse<Paginated<PointsTransaction>>;

export interface CheckinRespData {
  consecutive_days: number;
  points_earned: number;
  balance: number;
}

export type CheckinResp = ApiResponse<CheckinRespData>;
export type CheckinStatusResp = ApiResponse<CheckinStatus>;

export interface ShareRewardReq {
  report_id?: string;
}

export interface RewardRespData {
  points_earned: number;
  balance: number;
  remaining_today: number;
}

export type ShareRewardResp = ApiResponse<RewardRespData>;

export interface AdRewardReq {
  ad_token: string;
}

export type AdRewardResp = ApiResponse<RewardRespData>;

// ============== 模板 ==============
export interface ListTemplateQuery {
  page?: number;
  page_size?: number;
  tag?: string;
}

export type ListTemplateResp = ApiResponse<Paginated<PromptTemplate>>;
export type GetTemplateResp = ApiResponse<PromptTemplate>;

export interface UnlockTemplateRespData {
  user_template: UserTemplate;
  balance: number;
}

export type UnlockTemplateResp = ApiResponse<UnlockTemplateRespData>;
export type ListMyTemplatesResp = ApiResponse<Paginated<UserTemplate>>;

// ============== AI 解读（SSE） ==============
export interface StartReadingReq {
  template_id: string;
}

export interface SSEMetaPayload {
  report_id: string;
  model: string;
  is_free_use: boolean;
  points_spent: number;
  balance_after: number;
}

export interface SSEChunkPayload {
  text: string;
}

export interface SSEDonePayload {
  report_id: string;
  total_chars: number;
  token_usage?: { input_tokens?: number; output_tokens?: number };
}

export interface SSEErrorPayload {
  code: number;
  message: string;
  refunded: number;
  balance_after: number;
}

export type ListReportsResp = ApiResponse<Paginated<ReadingReportBrief>>;
export type GetReportResp = ApiResponse<ReadingReport>;

// ============== 分享 ==============
export interface CreateShareRespData {
  share_token: string;
  share_url: string;
  watermark_text: string;
}

export type CreateShareResp = ApiResponse<CreateShareRespData>;

export interface PublicShareData {
  template_name: string;
  excerpt: string;
  created_at: string;
  watermark_text: string;
  cta_text: string;
}

export type GetShareResp = ApiResponse<PublicShareData>;

// ============== 管理后台 ==============
export interface AdminLoginReq {
  username: string;
  password: string;
}

export interface AdminLoginRespData {
  admin: AdminBrief;
  tokens: AuthTokenPair;
}

export type AdminLoginResp = ApiResponse<AdminLoginRespData>;

export interface AdminListTemplateQuery {
  page?: number;
  page_size?: number;
  status?: TemplateStatus | "all";
}

export type AdminListTemplateResp = ApiResponse<Paginated<PromptTemplate>>;

export interface AdminCreateTemplateReq {
  name: string;
  description: string;
  detail: string;
  prompt_content: string;
  tags: string[];
  points_cost: number;
  preview_image_url?: string;
  sort_order?: number;
}

export type AdminCreateTemplateResp = ApiResponse<PromptTemplate>;
export type AdminUpdateTemplateReq = Partial<AdminCreateTemplateReq>;
export type AdminUpdateTemplateResp = ApiResponse<PromptTemplate>;

export interface AdminToggleStatusReq {
  status: TemplateStatus;
}

export type AdminToggleStatusResp = ApiResponse<PromptTemplate>;
export type AdminDeleteTemplateResp = ApiResponse<{ ok: true }>;

export interface AdminListUsersQuery {
  page?: number;
  page_size?: number;
  keyword?: string;
}

export type AdminListUsersResp = ApiResponse<Paginated<AdminUserView>>;
export type AdminGetConfigResp = ApiResponse<PointsConfigItem[]>;

export interface AdminUpdateConfigReq {
  value: number;
}

export type AdminUpdateConfigResp = ApiResponse<PointsConfigItem>;
export type AdminStatsResp = ApiResponse<AdminStats>;
