# DevPerf Dashboard 共享类型定义

> 单一事实来源 (Single Source of Truth)
> 前后端共同引用此文件中的类型定义
> 日期: 2026-04-09

---

## 通用类型

```typescript
// ── 统一响应格式 ──

interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── 角色枚举 ──

type UserRole = 'admin' | 'manager' | 'developer' | 'viewer';

// ── 任务状态 ──

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

// ── 任务优先级 ──

type TaskPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

// ── Sprint 状态 ──

type SprintStatus = 'upcoming' | 'active' | 'completed';

// ── 里程碑状态 ──

type MilestoneStatus = 'backlog' | 'active' | 'completed' | 'cancelled';

// ── PR 状态 ──

type PRState = 'open' | 'closed' | 'merged';

// ── 同步源 ──

type SyncSource = 'plane' | 'gitea';

// ── 同步状态 ──

type SyncStatus = 'success' | 'error';
```

---

## 认证 API 类型

```typescript
// POST /api/auth/login

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponseData {
  token: string;
  user: UserBasic;
}

type LoginResponse = ApiResponse<LoginResponseData>;

// GET /api/auth/me

interface UserBasic {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

type MeResponse = ApiResponse<UserBasic>;
```

---

## 团队总览 API 类型

```typescript
// GET /api/overview?period=2026-Q2&projectIds=id1,id2

interface OverviewRequest {
  period?: string;
  projectIds?: string;  // comma-separated
}

interface SprintDeliveryData {
  cycles: SprintCycleData[];
}

interface SprintCycleData {
  name: string;
  plannedPoints: number;
  completedPoints: number;
  deliveryRate: number;
}

interface TaskDistributionData {
  todo: number;
  inProgress: number;
  review: number;
  done: number;
}

interface ProjectProgressItem {
  projectId: string;
  name: string;
  identifier: string;
  currentCycleProgress: number;
  totalPoints: number;
  completedPoints: number;
}

interface WeeklyCodeActivityData {
  weeks: WeekCodeData[];
}

interface WeekCodeData {
  weekStart: string;  // YYYY-MM-DD
  members: MemberCodeData[];
}

interface MemberCodeData {
  userId: string;
  name: string;
  commits: number;
  prs: number;
}

interface OKRProgressItem {
  id: string;
  title: string;
  ownerName: string;
  progress: number;
  keyResults: KRProgressItem[];
}

interface KRProgressItem {
  title: string;
  current: number;
  target: number;
  unit: string;
}

interface PRMergeTimeData {
  weeks: WeekPRData[];
}

interface WeekPRData {
  weekStart: string;
  avgHours: number;
  prCount: number;
}

interface OverviewData {
  sprintDelivery: SprintDeliveryData;
  taskDistribution: TaskDistributionData;
  projectProgress: ProjectProgressItem[];
  weeklyCodeActivity: WeeklyCodeActivityData;
  okrProgress: OKRProgressItem[];
  prMergeTime: PRMergeTimeData;
}

type OverviewResponse = ApiResponse<OverviewData>;
```

---

## 项目 API 类型

```typescript
// GET /api/projects

interface ProjectListItem {
  id: string;
  name: string;
  identifier: string;
  lastSyncedAt: string | null;
}

type ProjectListResponse = ApiResponse<ProjectListItem[]>;

// GET /api/projects/:id

interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

interface CurrentCycleData {
  name: string;
  startDate: string;
  endDate: string;
  deliveryRate: number;
  burndown: BurndownPoint[];
}

interface MilestoneItem {
  id: string;
  name: string;
  status: MilestoneStatus;
  targetDate: string;
  progress: number;
  totalIssues: number;
  completedIssues: number;
}

interface TaskMatrixMember {
  userId: string;
  name: string;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  totalPoints: number;
}

interface TaskMatrixData {
  members: TaskMatrixMember[];
}

interface ProjectGitActivity {
  recentCommits: number;
  recentPRs: number;
  weeklyTrend: WeeklyGitTrend[];
}

interface WeeklyGitTrend {
  weekStart: string;
  commits: number;
  prs: number;
}

interface ProjectDetailData {
  project: ProjectListItem;
  currentCycle: CurrentCycleData | null;
  milestones: MilestoneItem[];
  taskMatrix: TaskMatrixData;
  gitActivity: ProjectGitActivity;
}

type ProjectDetailResponse = ApiResponse<ProjectDetailData>;
```

---

## 成员 API 类型

```typescript
// GET /api/members

interface MemberListItem {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

type MemberListResponse = ApiResponse<MemberListItem[]>;

// GET /api/members/:id

interface MemberDeliveryTrend {
  cycles: MemberCycleData[];
}

interface MemberCycleData {
  name: string;
  assignedPoints: number;
  completedPoints: number;
  rate: number;
}

interface HeatmapDay {
  date: string;
  commits: number;
  prsCreated: number;
  prsMerged: number;
  tasksCompleted: number;
}

interface ContributionHeatmapData {
  days: HeatmapDay[];
}

interface CurrentTaskItem {
  id: string;
  title: string;
  projectName: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number | null;
  dueDate: string | null;
}

interface KPIScorecard {
  sprintDeliveryRate: number;
  avgDeliveryDays: number;
  bugDensity: number;
  prMergeTimeAvg: number;
  reviewParticipation: number;
  activityStreak: number;
}

interface MemberDetailData {
  member: MemberListItem;
  deliveryTrend: MemberDeliveryTrend;
  contributionHeatmap: ContributionHeatmapData;
  currentTasks: CurrentTaskItem[];
  kpiScorecard: KPIScorecard;
}

type MemberDetailResponse = ApiResponse<MemberDetailData>;
```

---

## OKR API 类型

```typescript
// GET /api/okr?period=2026-Q2

interface OKRRequest {
  period?: string;
}

interface KeyResultItem {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  progress: number;  // computed: (currentValue / targetValue) * 100
}

interface ObjectiveItem {
  id: string;
  title: string;
  ownerName: string;
  projectName: string;
  period: string;
  progress: number;
  keyResults: KeyResultItem[];
}

interface OKRData {
  objectives: ObjectiveItem[];
}

type OKRResponse = ApiResponse<OKRData>;

// POST /api/okr/objectives

interface CreateObjectiveRequest {
  title: string;
  ownerId: string;
  projectId: string;
  period: string;
}

type CreateObjectiveResponse = ApiResponse<{ id: string }>;

// POST /api/okr/objectives/:id/key-results

interface CreateKeyResultRequest {
  title: string;
  targetValue: number;
  unit: string;
  weight: number;
  linkedPlaneCycleId?: string;
  linkedPlaneModuleId?: string;
}

type CreateKeyResultResponse = ApiResponse<{ id: string }>;

// PATCH /api/okr/key-results/:id

interface UpdateKeyResultRequest {
  currentValue: number;
}

type UpdateKeyResultResponse = ApiResponse<{ id: string; progress: number; objectiveProgress: number }>;

// DELETE /api/okr/objectives/:id

type DeleteObjectiveResponse = ApiResponse<null>;

// DELETE /api/okr/key-results/:id

type DeleteKeyResultResponse = ApiResponse<null>;
```

---

## Git 活动 API 类型

```typescript
// GET /api/git/activity?userId=xxx&weeks=12

interface GitActivityRequest {
  userId?: string;
  weeks?: number;
}

interface GitHeatmapDay {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface PRMetrics {
  totalPRs: number;
  mergedPRs: number;
  avgMergeTimeHours: number;
  reviewedPRs: number;
}

interface WeeklyGitActivity {
  weekStart: string;
  commits: number;
  prs: number;
  additions: number;
  deletions: number;
}

interface GitActivityData {
  heatmap: GitHeatmapDay[];
  prMetrics: PRMetrics;
  weeklyTrend: WeeklyGitActivity[];
}

type GitActivityResponse = ApiResponse<GitActivityData>;
```

---

## 管理 API 类型

```typescript
// GET /api/admin/users

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  planeUserId: string | null;
  gitUsername: string | null;
  createdAt: string;
}

type AdminUsersResponse = ApiResponse<AdminUser[]>;

// POST /api/admin/users

interface CreateUserRequest {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  planeUserId?: string;
  gitUsername?: string;
}

type CreateUserResponse = ApiResponse<{ id: string }>;

// PATCH /api/admin/users/:id

interface UpdateUserRequest {
  displayName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  planeUserId?: string;
  gitUsername?: string;
}

type UpdateUserResponse = ApiResponse<{ id: string }>;

// DELETE /api/admin/users/:id

type DeleteUserResponse = ApiResponse<null>;

// GET /api/admin/author-mappings

interface AuthorMappingItem {
  id: string;
  gitEmail: string | null;
  gitUsername: string | null;
  userId: string | null;
  userName: string | null;
}

type AuthorMappingsResponse = ApiResponse<AuthorMappingItem[]>;

// POST /api/admin/author-mappings

interface CreateMappingRequest {
  gitEmail?: string;
  gitUsername?: string;
  userId: string;
}

type CreateMappingResponse = ApiResponse<{ id: string }>;

// DELETE /api/admin/author-mappings/:id

type DeleteMappingResponse = ApiResponse<null>;

// POST /api/admin/sync/trigger

interface SyncTriggerRequest {
  source?: SyncSource;  // if omitted, sync both
}

type SyncTriggerResponse = ApiResponse<{ message: string }>;

// GET /api/admin/sync/logs?page=1&pageSize=20

interface SyncLogItem {
  id: string;
  source: SyncSource;
  status: SyncStatus;
  message: string | null;
  recordsProcessed: number;
  syncedAt: string;
}

type SyncLogsResponse = ApiResponse<PaginatedData<SyncLogItem>>;
```

---

## 健康检查类型

```typescript
// GET /api/health

interface HealthData {
  status: 'ok';
  version: string;
  uptime: number;
  dbConnected: boolean;
}

type HealthResponse = ApiResponse<HealthData>;
```

---

## 错误类型

```typescript
interface ApiError {
  code: number;
  data: null;
  message: string;
  details?: Record<string, unknown>;
}

// 业务错误码
const ErrorCodes = {
  // 参数校验
  VALIDATION_ERROR: 40001,
  INVALID_FORMAT: 40002,

  // 认证
  UNAUTHORIZED: 40101,
  TOKEN_EXPIRED: 40102,
  FORBIDDEN: 40103,

  // 资源
  USER_NOT_FOUND: 40401,
  PROJECT_NOT_FOUND: 40402,
  OBJECTIVE_NOT_FOUND: 40403,
  KEY_RESULT_NOT_FOUND: 40404,

  // 冲突
  EMAIL_EXISTS: 40901,
  MAPPING_EXISTS: 40902,

  // 服务
  INTERNAL_ERROR: 50001,
  SYNC_FAILED: 50002,
  ACCOUNT_LOCKED: 42300,
} as const;
```
