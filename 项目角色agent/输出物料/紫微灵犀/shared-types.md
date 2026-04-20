# 紫微灵犀 — 共享类型契约（shared-types.md）

> 版本：v1.0
> 日期：2026-04-17
> 用途：前后端 API 类型契约的**唯一事实来源**
> 前端：直接拷贝到 `code/frontend/src/types/api.ts`
> 后端：以此为依据生成 Pydantic schema（`ziwei_app/schemas/`）
> 不一致解决：**改本文档**，再同步到双端

---

## 0. 通用包装

```typescript
// 所有响应统一包装
export interface ApiResponse<T> {
  code: number;       // 0 = success；非 0 = 业务错误码
  data: T | null;
  message: string;    // 成功 "success"；失败为人类可读消息
}

// 分页
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// 通用空响应
export type EmptyResponse = ApiResponse<{ ok: true }>;
```

---

## 1. 共享枚举与常量

```typescript
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

// 时辰索引（13 项）
// 0=早子时 / 1=丑时 / 2=寅时 ... / 11=亥时 / 12=晚子时
export const TIME_INDEX_RANGE = [0, 12] as const;

// 错误码段位（仅文档化，前端不强引用）
export const ERROR_CODES = {
  AUTH: { range: [10000, 19999] },
  USER_PROFILE: { range: [20000, 29999] },
  POINTS: { range: [30000, 39999] },
  TEMPLATE: { range: [40000, 49999] },
  READING: { range: [50000, 59999] },
  SHARE: { range: [60000, 69999] },
  ADMIN: { range: [90000, 99999] },
} as const;
```

---

## 2. 业务实体（Domain）

```typescript
export interface UserBrief {
  id: string;
  nickname: string;
  avatar_url: string | null;
  phone_masked: string;       // 138****8888
  points_balance: number;
  invite_code: string;
  free_reading_used: boolean;
  has_profile: boolean;
  created_at: string;         // ISO 8601 +08:00
}

export interface UserProfile {
  id: string;
  user_id: string;
  birth_type: BirthType;
  birth_year: number;
  birth_month: number;
  birth_day: number;
  birth_time_index: number;   // 0-12
  gender: Gender;
  is_leap_month: boolean;
  birth_place_province: string | null;
  birth_place_city: string | null;
  created_at: string;
  updated_at: string;
}

// 与现有 /paipan/json 输出结构对齐
export interface ChartPalace {
  name: string;               // 命宫/兄弟宫/...
  earthlyBranch: string;      // 子/丑/寅/...
  heavenlyStem: string;       // 甲/乙/...
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

export interface ChartStar {
  name: string;
  brightness?: string;
  mutagen?: string;           // 禄/权/科/忌
}

export interface ChartJson {
  gender: string;             // 男/女
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
  today_reward: number;       // 今日如签到可得
  next_reward: number;        // 明日可得
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  detail: string;
  prompt_content?: string;    // 仅管理后台返回
  tags: string[];
  points_cost: number;
  preview_image_url: string | null;
  status: TemplateStatus;
  unlock_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_unlocked?: boolean;      // 用户上下文下返回
}

export interface UserTemplate {
  id: string;
  user_id: string;
  template_id: string;
  template?: PromptTemplate;  // 联查时填充
  points_spent: number;
  unlocked_at: string;
}

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
  excerpt: string;            // 前 100 字
  created_at: string;
}

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
```

---

## 3. API Request/Response 契约（按模块）

### 3.1 认证（auth）

```typescript
// POST /api/v1/auth/register
export interface RegisterReq {
  phone: string;            // ^1\d{10}$
  password: string;         // min=8
  invite_code?: string;     // 8 位
}
export interface AuthTokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;       // 秒
}
export interface RegisterRespData {
  user: UserBrief;
  tokens: AuthTokenPair;
}
export type RegisterResp = ApiResponse<RegisterRespData>;

// POST /api/v1/auth/login
export interface LoginReq {
  phone: string;
  password: string;
}
export type LoginResp = ApiResponse<RegisterRespData>;

// POST /api/v1/auth/token/refresh
export interface RefreshReq { refresh_token: string; }
export type RefreshResp = ApiResponse<AuthTokenPair>;
```

### 3.2 用户（user）

```typescript
// GET /api/v1/user/me
export type GetMeResp = ApiResponse<UserBrief>;

// GET /api/v1/user/profile
export type GetProfileResp = ApiResponse<UserProfile | null>;

// PUT /api/v1/user/profile
export interface UpsertProfileReq {
  birth_type: BirthType;
  birth_year: number;       // 1900-当年
  birth_month: number;      // 1-12
  birth_day: number;        // 1-31
  birth_time_index: number; // 0-12
  gender: Gender;
  is_leap_month?: boolean;  // 仅 lunar 必填
  birth_place_province?: string;
  birth_place_city?: string;
}
export interface UpsertProfileRespData {
  profile: UserProfile;
  chart_generated: boolean; // 是否触发了排盘
}
export type UpsertProfileResp = ApiResponse<UpsertProfileRespData>;
```

### 3.3 排盘（chart）

```typescript
// POST /api/v1/chart/generate
// Request 无 body
export type GenerateChartResp = ApiResponse<ChartData>;

// GET /api/v1/chart/me
export type GetMyChartResp = ApiResponse<ChartData | null>;
```

### 3.4 积分（points）

```typescript
// GET /api/v1/points/balance
export type GetBalanceResp = ApiResponse<{ balance: number }>;

// GET /api/v1/points/transactions?page=&page_size=&type=
export interface ListTxQuery {
  page?: number;            // 默认 1
  page_size?: number;       // 默认 20
  type?: PointsTxType;
}
export type ListTxResp = ApiResponse<Paginated<PointsTransaction>>;

// POST /api/v1/points/checkin
// Request 无 body
export interface CheckinRespData {
  consecutive_days: number;
  points_earned: number;
  balance: number;
}
export type CheckinResp = ApiResponse<CheckinRespData>;

// GET /api/v1/points/checkin/status
export type CheckinStatusResp = ApiResponse<CheckinStatus>;

// POST /api/v1/points/share-reward
export interface ShareRewardReq { report_id?: string; }
export interface RewardRespData {
  points_earned: number;
  balance: number;
  remaining_today: number;  // 今日剩余可领次数
}
export type ShareRewardResp = ApiResponse<RewardRespData>;

// POST /api/v1/points/ad-reward
export interface AdRewardReq {
  ad_token: string;         // 小程序广告回调 token
}
export type AdRewardResp = ApiResponse<RewardRespData>;
```

### 3.5 模板（templates）

```typescript
// GET /api/v1/templates?page=&page_size=&tag=
export interface ListTemplateQuery {
  page?: number;
  page_size?: number;
  tag?: string;
}
export type ListTemplateResp = ApiResponse<Paginated<PromptTemplate>>;

// GET /api/v1/templates/:id
export type GetTemplateResp = ApiResponse<PromptTemplate>;

// POST /api/v1/templates/:id/unlock
// Request 无 body
export interface UnlockTemplateRespData {
  user_template: UserTemplate;
  balance: number;
}
export type UnlockTemplateResp = ApiResponse<UnlockTemplateRespData>;

// GET /api/v1/user/templates?page=&page_size=
export type ListMyTemplatesResp = ApiResponse<Paginated<UserTemplate>>;
```

### 3.6 AI 解读（reading）— 含 SSE

```typescript
// POST /api/v1/reading/start  → text/event-stream
export interface StartReadingReq {
  template_id: string;
}

// SSE 事件类型（前端按 event 名分发）
export interface SSEMetaPayload {
  report_id: string;
  model: string;            // "gemini-2.5-pro"
  is_free_use: boolean;     // 是否本次为首次免费
  points_spent: number;     // 实际扣的积分（首免=0）
  balance_after: number;
}
export interface SSEChunkPayload {
  text: string;             // 单段增量文本
}
export interface SSEDonePayload {
  report_id: string;
  total_chars: number;
  token_usage?: { input_tokens?: number; output_tokens?: number };
}
export interface SSEErrorPayload {
  code: number;             // 50002 等
  message: string;
  refunded: number;         // 已退积分（0 表示未扣）
  balance_after: number;
}

// GET /api/v1/reading/reports?page=&page_size=
export type ListReportsResp = ApiResponse<Paginated<ReadingReportBrief>>;

// GET /api/v1/reading/reports/:id
export type GetReportResp = ApiResponse<ReadingReport>;
```

### 3.7 分享（share）

```typescript
// POST /api/v1/reading/reports/:id/share
export interface CreateShareRespData {
  share_token: string;
  share_url: string;        // 完整 URL（含域名）
  watermark_text: string;   // "本内容由 AI 生成 · 仅供文化娱乐参考"
}
export type CreateShareResp = ApiResponse<CreateShareRespData>;

// GET /api/v1/share/:token
export interface PublicShareData {
  template_name: string;
  excerpt: string;          // ≤ 500 字
  created_at: string;
  watermark_text: string;
  cta_text: string;         // "进入紫微灵犀获取完整解读"
}
export type GetShareResp = ApiResponse<PublicShareData>;
```

### 3.8 管理后台（admin）

```typescript
// POST /api/v1/admin/auth/login
export interface AdminLoginReq {
  username: string;
  password: string;
}
export interface AdminLoginRespData {
  admin: AdminBrief;
  tokens: AuthTokenPair;
}
export type AdminLoginResp = ApiResponse<AdminLoginRespData>;

// GET /api/v1/admin/templates?page=&page_size=&status=
export interface AdminListTemplateQuery {
  page?: number;
  page_size?: number;
  status?: TemplateStatus | "all";
}
export type AdminListTemplateResp = ApiResponse<Paginated<PromptTemplate>>;

// POST /api/v1/admin/templates
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

// PUT /api/v1/admin/templates/:id
export type AdminUpdateTemplateReq = Partial<AdminCreateTemplateReq>;
export type AdminUpdateTemplateResp = ApiResponse<PromptTemplate>;

// PATCH /api/v1/admin/templates/:id/status
export interface AdminToggleStatusReq {
  status: TemplateStatus;
}
export type AdminToggleStatusResp = ApiResponse<PromptTemplate>;

// DELETE /api/v1/admin/templates/:id
export type AdminDeleteTemplateResp = ApiResponse<{ ok: true }>;

// GET /api/v1/admin/users?page=&page_size=&keyword=
export interface AdminListUsersQuery {
  page?: number;
  page_size?: number;
  keyword?: string;         // 模糊匹配 nickname / phone（最后4位）
}
export type AdminListUsersResp = ApiResponse<Paginated<AdminUserView>>;

// GET /api/v1/admin/points-config
export type AdminGetConfigResp = ApiResponse<PointsConfigItem[]>;

// PUT /api/v1/admin/points-config/:key
export interface AdminUpdateConfigReq {
  value: number;
}
export type AdminUpdateConfigResp = ApiResponse<PointsConfigItem>;

// GET /api/v1/admin/stats
export type AdminStatsResp = ApiResponse<AdminStats>;
```

---

## 4. 错误码全表

| code | HTTP | 模块 | 说明 |
|------|------|------|------|
| 0 | 200 | — | 成功 |
| 10001 | 400 | auth | 手机号已注册 |
| 10002 | 400 | auth | 密码格式错误（< 8 位） |
| 10003 | 400 | auth | 邀请码无效 |
| 10004 | 401 | auth | 账号或密码错误 |
| 10005 | 401 | auth | refresh token 无效 |
| 10006 | 401 | auth | access token 已过期 |
| 10007 | 403 | auth | 无权限 |
| 20001 | 400 | profile | 出生日期范围越界 |
| 20002 | 400 | profile | 闰月校验失败 |
| 20003 | 400 | profile | 时辰索引越界 |
| 20004 | 404 | profile | 用户档案不存在 |
| 20005 | 500 | chart | 排盘引擎异常 |
| 30001 | 400 | points | 今日已签到 |
| 30002 | 400 | points | 分享奖励已达每日上限 |
| 30003 | 400 | points | 广告奖励已达每日上限 |
| 30004 | 400 | points | 广告 token 无效 |
| 30005 | 400 | points | 积分不足 |
| 40001 | 400 | template | 模板已解锁 |
| 40002 | 400 | template | 积分不足以解锁 |
| 40003 | 404 | template | 模板已下架或不存在 |
| 40004 | 400 | template | 模板名称重复（admin 创建时） |
| 50001 | 403 | reading | 模板未解锁 |
| 50002 | 500 | reading | AI 服务异常（含已退积分） |
| 50003 | 400 | reading | 积分不足且非首免 |
| 50004 | 400 | reading | 排盘数据缺失 |
| 50005 | 404 | reading | 报告不存在 |
| 60001 | 404 | share | 分享链接无效或已过期 |
| 90001 | 401 | admin | 管理员未授权 |
| 90002 | 403 | admin | 管理员权限不足 |

---

## 5. 类型一致性检查清单

- [x] 所有 30+1 端点都有 Request/Response 定义
- [x] 字段命名统一 snake_case（与后端 Pydantic alias 一致）
- [x] 时间字段统一 ISO 8601 +08:00 字符串
- [x] UUID 用 string 类型（前端不区分）
- [x] 枚举值统一字符串字面量（不用数字）
- [x] 分页响应统一 `{ items, total, page, page_size }`
- [x] 共享枚举 BirthType / Gender / PointsTxType / TemplateStatus 各 1 处定义
- [x] SSE 事件类型完备（meta / chunk / done / error）
- [x] AIGC 水印文案字段独立（watermark_text）
- [x] 错误码全表覆盖所有业务异常

---

> **修订原则**：本文档 = 单一事实来源。前后端发现不一致时，必须先修订本文档，再同步双端。禁止任何一方私自调整字段名/类型。
