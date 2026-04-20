# DevPerf Dashboard 技术架构文档

> 版本: v1.0
> 日期: 2026-04-09
> 基于用户 spec (devperf-dashboard-spec.md) + PRD v1.0 + page-specs.md 编写

---

## 1. 技术选型

### 1.1 技术栈矩阵（用户已指定，经验证为最优选）

| 层 | 选型 | 版本 | 选型理由 |
|---|------|------|---------|
| 运行时 | Bun | >= 1.2 (推荐 1.3) | 内置 TS 编译，SQLite 原生支持，99k req/s on Hono (vs Node 41k)。2026 年 npm 兼容率达 98% |
| 后端框架 | Hono | ^4.0 | Web Standards API，超轻量（12KB），Bun 上性能最优，内置中间件丰富 |
| ORM | Drizzle ORM | latest (~0.36) | 类型安全零开销，prepared statements 比 raw better-sqlite3 更快，schema-first 迁移 |
| 数据库 | SQLite (via better-sqlite3) | - | 单文件部署，与 Docker 卷完美配合，10 万行查询 < 200ms，足够 Dashboard 缓存层使用 |
| 前端框架 | Vue 3 + Vite + TypeScript | Vue >= 3.5, Vite >= 6 | Composition API + `<script setup>` 简洁高效，Vite 6 HMR 极快 |
| UI 组件库 | Naive UI | latest (~2.40) | 80+ 组件，原生 Vue 3 支持，TypeScript 友好，主题定制灵活 |
| 图表 | ECharts | >= 5.5 (推荐 5.5.1) | 功能最全的开源图表库，按需引入 tree-shaking，vue-echarts 8.x 封装 |
| 状态管理 | Pinia | latest (~2.3) | Vue 3 官方推荐，TypeScript 原生支持，devtools 集成 |
| HTTP 客户端 | Axios | ^1.7 | 拦截器机制成熟，JWT token 自动注入/刷新，请求取消支持 |
| 部署 | Docker Compose | v2.x | 与 Plane/Gitea 同 Docker Network，单机自托管 |
| 密码哈希 | bcrypt | - | 业界标准，cost factor 12 |
| JWT | jose | ^5.0 | 轻量 JWT 库，ESM 原生，Bun 兼容 |
| Cron 调度 | croner | ^9.0 | 轻量 Cron 调度，ESM 原生，Bun 兼容 |
| 校验 | zod | ^3.24 | 运行时 + 类型安全校验，与 Hono 内置 zod validator 集成 |
| 日期处理 | dayjs | ^1.11 | 轻量日期库，足够 Dashboard 场景 |

### 1.2 替代方案对比记录 (ADR)

**运行时**: Bun vs Node.js vs Deno
- Bun: 内置 SQLite, TS 原生, 性能最优 -> **选定**
- Node.js: 生态最大但需额外 TS 编译步骤
- Deno: SQLite 支持不如 Bun 原生

**后端框架**: Hono vs Elysia vs Express
- Hono: Web Standards, 跨运行时, 中间件丰富 -> **选定**
- Elysia: Bun 原生但锁定 Bun 运行时
- Express: 老牌但性能低, 不适合 Bun 最优路径

**ORM**: Drizzle vs Prisma vs Kysely
- Drizzle: 零开销, 类型推导最强, SQLite 一等支持 -> **选定**
- Prisma: 生成器开销大, SQLite 支持不如 Drizzle 灵活
- Kysely: 查询构建器, 缺少 schema 管理

---

## 2. 项目结构

### 2.1 Monorepo 结构

```
devperf-dashboard/
code/
├── backend/                           # 后端 (Bun + Hono)
│   ├── src/
│   │   ├── index.ts                   # Hono 入口 + 静态文件服务
│   │   ├── config.ts                  # 环境变量配置 (zod 校验)
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle Schema 定义
│   │   │   ├── migrate.ts            # 迁移脚本
│   │   │   ├── seed.ts               # 种子数据
│   │   │   └── index.ts              # DB 连接实例
│   │   ├── api/
│   │   │   ├── plane-client.ts       # Plane REST API 封装
│   │   │   └── gitea-client.ts       # Gitea REST API 封装
│   │   ├── sync/
│   │   │   ├── scheduler.ts          # Cron 调度器
│   │   │   ├── sync-plane.ts         # Plane 数据同步
│   │   │   └── sync-gitea.ts         # Gitea 数据同步
│   │   ├── routes/
│   │   │   ├── auth.ts               # POST /api/auth/login, GET /api/auth/me
│   │   │   ├── overview.ts           # GET /api/overview
│   │   │   ├── projects.ts           # GET /api/projects/:id
│   │   │   ├── members.ts            # GET /api/members/:id
│   │   │   ├── okr.ts                # GET/POST/PATCH /api/okr/*
│   │   │   ├── git.ts                # GET /api/git/activity
│   │   │   └── admin.ts              # /api/admin/* (users, mappings, sync)
│   │   ├── services/
│   │   │   ├── auth.ts               # 登录逻辑 + JWT 生成
│   │   │   ├── metrics.ts            # KPI 计算
│   │   │   ├── author-matching.ts    # Git 作者关联
│   │   │   └── okr.ts                # OKR CRUD + 进度计算
│   │   └── middleware/
│   │       ├── auth.ts               # JWT 验证中间件
│   │       ├── role.ts               # 角色权限中间件
│   │       ├── error-handler.ts      # 统一错误处理
│   │       └── logger.ts             # 请求日志
│   ├── tests/
│   │   ├── unit/                     # 单元测试
│   │   ├── api/                      # API 集成测试
│   │   └── setup.ts                  # 测试配置
│   ├── drizzle.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── frontend/                          # 前端 (Vue 3 + Vite)
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/
│   │   │   └── index.ts              # Vue Router 配置
│   │   ├── stores/
│   │   │   ├── auth.ts               # Pinia 认证状态
│   │   │   └── dashboard.ts          # Pinia 数据状态
│   │   ├── api/
│   │   │   ├── request.ts            # Axios 实例 + JWT 拦截器
│   │   │   ├── auth.ts               # 认证 API
│   │   │   ├── overview.ts           # 总览 API
│   │   │   ├── projects.ts           # 项目 API
│   │   │   ├── members.ts            # 成员 API
│   │   │   ├── okr.ts                # OKR API
│   │   │   ├── git.ts                # Git 活动 API
│   │   │   └── admin.ts              # 管理 API
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── Overview.vue
│   │   │   ├── ProjectDetail.vue
│   │   │   ├── MemberDetail.vue
│   │   │   ├── OKR.vue
│   │   │   ├── GitActivity.vue
│   │   │   └── Admin.vue
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppSidebar.vue
│   │   │   │   ├── AppHeader.vue
│   │   │   │   └── AppLayout.vue     # Sidebar + Header + <slot>
│   │   │   ├── shared/
│   │   │   │   ├── FilterBar.vue
│   │   │   │   ├── EmptyState.vue
│   │   │   │   ├── LoadingSkeleton.vue
│   │   │   │   ├── ErrorState.vue
│   │   │   │   ├── DataCard.vue
│   │   │   │   ├── ConfirmDialog.vue
│   │   │   │   └── Breadcrumb.vue
│   │   │   └── charts/
│   │   │       ├── SprintDeliveryChart.vue
│   │   │       ├── TaskStatusPie.vue
│   │   │       ├── ProjectProgressBars.vue
│   │   │       ├── WeeklyCodeActivity.vue
│   │   │       ├── OKRProgressBars.vue
│   │   │       ├── PRMergeTimeChart.vue
│   │   │       ├── BurndownChart.vue
│   │   │       ├── ContributionHeatmap.vue
│   │   │       └── KPIRadarChart.vue
│   │   ├── composables/
│   │   │   ├── useECharts.ts         # ECharts 响应式封装
│   │   │   ├── useAuth.ts            # 认证相关 composable
│   │   │   └── usePermission.ts      # 权限检查 composable
│   │   ├── types/
│   │   │   └── index.ts              # 从 shared-types 导入并 re-export
│   │   ├── styles/
│   │   │   ├── variables.css         # CSS 变量（设计令牌）
│   │   │   ├── global.css            # 全局样式
│   │   │   └── naive-overrides.ts    # Naive UI 主题覆盖
│   │   └── config/
│   │       └── index.ts              # 环境配置
│   ├── public/
│   │   └── favicon.svg
│   ├── __tests__/
│   │   ├── components/
│   │   └── views/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── shared/
│   └── types.ts                       # 前后端共享类型（单一事实来源）
├── docker-compose.yml
├── deploy/
│   └── nginx.conf
└── README.md
```

---

## 3. 数据模型

### 3.1 数据库 Schema (SQLite + Drizzle ORM)

> 完整 Schema 来自用户 spec，此处标注索引策略和约束。

```typescript
// backend/src/db/schema.ts
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ── 用户与角色 ──
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                    // UUID
  planeUserId: text('plane_user_id'),
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(),
  gitUsername: text('git_username'),
  role: text('role', { enum: ['admin', 'manager', 'developer', 'viewer'] }).notNull(),
  passwordHash: text('password_hash').notNull(),
  loginAttempts: integer('login_attempts').default(0),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('uniq_users_email').on(table.email),
}));

// ── 项目 ──
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  planeProjectId: text('plane_project_id').notNull(),
  name: text('name').notNull(),
  identifier: text('identifier'),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  planeProjectIdx: uniqueIndex('uniq_projects_plane_id').on(table.planeProjectId),
}));

// ── Sprint 快照 ──
export const sprintSnapshots = sqliteTable('sprint_snapshots', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  planeCycleId: text('plane_cycle_id').notNull(),
  name: text('name').notNull(),
  startDate: text('start_date'),                   // YYYY-MM-DD
  endDate: text('end_date'),
  totalPoints: integer('total_points').default(0),
  completedPoints: integer('completed_points').default(0),
  totalIssues: integer('total_issues').default(0),
  completedIssues: integer('completed_issues').default(0),
  burndownData: text('burndown_data', { mode: 'json' }),
  status: text('status', { enum: ['upcoming', 'active', 'completed'] }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  projectIdx: index('idx_sprint_project').on(table.projectId),
  statusIdx: index('idx_sprint_status').on(table.status),
}));

// ── 任务快照 ──
export const taskSnapshots = sqliteTable('task_snapshots', {
  id: text('id').primaryKey(),
  planeIssueId: text('plane_issue_id').notNull(),
  projectId: text('project_id').references(() => projects.id),
  sprintId: text('sprint_id').references(() => sprintSnapshots.id),
  title: text('title').notNull(),
  status: text('status'),
  priority: text('priority'),
  assigneeId: text('assignee_id').references(() => users.id),
  storyPoints: integer('story_points'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  dueDate: text('due_date'),
  labels: text('labels', { mode: 'json' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  projectIdx: index('idx_task_project').on(table.projectId),
  sprintIdx: index('idx_task_sprint').on(table.sprintId),
  assigneeIdx: index('idx_task_assignee').on(table.assigneeId),
  statusIdx: index('idx_task_status').on(table.status),
}));

// ── 里程碑 ──
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  planeModuleId: text('plane_module_id').notNull(),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  status: text('status'),
  targetDate: text('target_date'),
  totalIssues: integer('total_issues').default(0),
  completedIssues: integer('completed_issues').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  projectIdx: index('idx_milestone_project').on(table.projectId),
}));

// ── Git Commit 记录 ──
export const gitCommits = sqliteTable('git_commits', {
  id: text('id').primaryKey(),
  repoName: text('repo_name').notNull(),
  sha: text('sha').notNull().unique(),
  authorEmail: text('author_email'),
  authorName: text('author_name'),
  userId: text('user_id').references(() => users.id),
  message: text('message'),
  additions: integer('additions').default(0),
  deletions: integer('deletions').default(0),
  committedAt: integer('committed_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  shaIdx: uniqueIndex('uniq_commits_sha').on(table.sha),
  userIdx: index('idx_commits_user').on(table.userId),
  repoIdx: index('idx_commits_repo').on(table.repoName),
  committedAtIdx: index('idx_commits_committed_at').on(table.committedAt),
}));

// ── Git PR 记录 ──
export const gitPRs = sqliteTable('git_prs', {
  id: text('id').primaryKey(),
  repoName: text('repo_name').notNull(),
  externalId: integer('external_id').notNull(),
  title: text('title'),
  userId: text('user_id').references(() => users.id),
  authorUsername: text('author_username'),
  state: text('state'),
  additions: integer('additions').default(0),
  deletions: integer('deletions').default(0),
  reviewComments: integer('review_comments').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  mergedAt: integer('merged_at', { mode: 'timestamp' }),
  mergeTimeHours: real('merge_time_hours'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdx: index('idx_prs_user').on(table.userId),
  repoIdx: index('idx_prs_repo').on(table.repoName),
  stateIdx: index('idx_prs_state').on(table.state),
}));

// ── OKR ──
export const objectives = sqliteTable('objectives', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  ownerId: text('owner_id').references(() => users.id),
  projectId: text('project_id').references(() => projects.id),
  period: text('period').notNull(),                // "2026-Q2"
  progress: real('progress').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  periodIdx: index('idx_obj_period').on(table.period),
  ownerIdx: index('idx_obj_owner').on(table.ownerId),
}));

export const keyResults = sqliteTable('key_results', {
  id: text('id').primaryKey(),
  objectiveId: text('objective_id').references(() => objectives.id).notNull(),
  title: text('title').notNull(),
  targetValue: real('target_value').notNull(),
  currentValue: real('current_value').default(0),
  unit: text('unit'),
  weight: real('weight').default(1),
  linkedPlaneCycleId: text('linked_plane_cycle_id'),
  linkedPlaneModuleId: text('linked_plane_module_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  objectiveIdx: index('idx_kr_objective').on(table.objectiveId),
}));

// ── 作者映射 ──
export const authorMappings = sqliteTable('author_mappings', {
  id: text('id').primaryKey(),
  gitEmail: text('git_email'),
  gitUsername: text('git_username'),
  userId: text('user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('uniq_mapping_email').on(table.gitEmail),
  usernameIdx: uniqueIndex('uniq_mapping_username').on(table.gitUsername),
}));

// ── 同步日志 ──
export const syncLogs = sqliteTable('sync_logs', {
  id: text('id').primaryKey(),
  source: text('source', { enum: ['plane', 'gitea'] }).notNull(),
  status: text('status', { enum: ['success', 'error'] }).notNull(),
  message: text('message'),
  recordsProcessed: integer('records_processed').default(0),
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull(),
});
```

### 3.2 实体关系

```
users 1──N taskSnapshots     (assigneeId)
users 1──N gitCommits        (userId)
users 1──N gitPRs            (userId)
users 1──N objectives        (ownerId)
users 1──N authorMappings    (userId)

projects 1──N sprintSnapshots (projectId)
projects 1──N taskSnapshots   (projectId)
projects 1──N milestones      (projectId)
projects 1──N objectives      (projectId)

sprintSnapshots 1──N taskSnapshots (sprintId)

objectives 1──N keyResults (objectiveId)
```

---

## 4. API 设计

### 4.1 统一响应格式

```typescript
// 成功
{ "code": 0, "data": { ... }, "message": "success" }

// 分页
{ "code": 0, "data": { "items": [...], "total": N, "page": 1, "pageSize": 20 }, "message": "success" }

// 错误
{ "code": 40001, "data": null, "message": "错误描述" }
```

### 4.2 API 端点清单

#### 认证 (auth)

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| POST | /api/auth/login | 邮箱密码登录 | 公开 | - |
| GET | /api/auth/me | 获取当前用户信息 | Bearer | 全部 |

**POST /api/auth/login**
- Request: `{ email: string, password: string }`
- Response: `{ code: 0, data: { token: string, user: { id, displayName, email, role } }, message: "success" }`
- Errors: 401 (邮箱或密码错误), 423 (账号锁定)

**GET /api/auth/me**
- Response: `{ code: 0, data: { id, displayName, email, role }, message: "success" }`

#### 团队总览 (overview)

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | /api/overview | 获取团队总览数据 | Bearer | 全部角色 |

**GET /api/overview**
- Query: `?period=2026-Q2&projectIds=id1,id2`
- Response: 包含 sprintDelivery, taskDistribution, projectProgress, weeklyCodeActivity, okrProgress, prMergeTime 六大数据块

#### 项目明细 (projects)

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | /api/projects | 获取项目列表 | Bearer | 全部角色 |
| GET | /api/projects/:id | 获取项目明细 | Bearer | 全部角色 |

**GET /api/projects/:id**
- Response: 包含 project, currentCycle (含 burndown), milestones, taskMatrix, gitActivity

#### 个人产出 (members)

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | /api/members | 获取成员列表 | Bearer | admin/manager |
| GET | /api/members/:id | 获取个人产出数据 | Bearer | admin全部/manager下属/developer仅自己/viewer下钻 |

**GET /api/members/:id**
- Response: 包含 member, deliveryTrend, contributionHeatmap, currentTasks, kpiScorecard

#### OKR

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | /api/okr | 获取 OKR 列表 | Bearer | 全部角色 |
| POST | /api/okr/objectives | 创建目标 | Bearer | admin/manager |
| POST | /api/okr/objectives/:id/key-results | 创建 KR | Bearer | admin/manager |
| PATCH | /api/okr/key-results/:id | 更新 KR 进度 | Bearer | admin/manager |
| DELETE | /api/okr/objectives/:id | 删除目标 | Bearer | admin |
| DELETE | /api/okr/key-results/:id | 删除 KR | Bearer | admin |

#### Git 活动

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | /api/git/activity | 获取 Git 活动数据 | Bearer | admin/manager全部, developer仅自己 |

#### 管理接口 (admin)

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | /api/admin/users | 用户列表 | Bearer | admin |
| POST | /api/admin/users | 创建用户 | Bearer | admin |
| PATCH | /api/admin/users/:id | 更新用户 | Bearer | admin |
| DELETE | /api/admin/users/:id | 删除用户 | Bearer | admin |
| GET | /api/admin/author-mappings | 作者映射列表 | Bearer | admin |
| POST | /api/admin/author-mappings | 添加映射 | Bearer | admin |
| DELETE | /api/admin/author-mappings/:id | 删除映射 | Bearer | admin |
| POST | /api/admin/sync/trigger | 手动触发同步 | Bearer | admin |
| GET | /api/admin/sync/logs | 同步日志 | Bearer | admin |

#### 健康检查

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | /api/health | 健康检查 | 公开 | - |

---

## 5. 前端组件架构

### 5.1 组件层级

```
AppLayout (layout shell)
├── AppSidebar (role-based nav)
├── AppHeader (breadcrumb + page title)
└── <RouterView> (page content)
    ├── Login.vue (no layout)
    ├── Overview.vue
    │   ├── FilterBar
    │   ├── DataCard x 6
    │   │   ├── SprintDeliveryChart
    │   │   ├── TaskStatusPie
    │   │   ├── ProjectProgressBars
    │   │   ├── WeeklyCodeActivity
    │   │   ├── OKRProgressBars
    │   │   └── PRMergeTimeChart
    │   ├── Sprint任务弹窗 (NModal)
    │   └── 任务清单侧栏 (NDrawer)
    ├── ProjectDetail.vue
    │   ├── Breadcrumb
    │   ├── BurndownChart
    │   ├── 里程碑时间线 (NTimeline)
    │   ├── 任务分配矩阵 (NDataTable)
    │   └── Git活动概览 DataCard
    ├── MemberDetail.vue
    │   ├── Breadcrumb
    │   ├── 交付率趋势折线图
    │   ├── KPIRadarChart
    │   ├── ContributionHeatmap
    │   └── 当前任务表 (NDataTable)
    ├── OKR.vue
    │   ├── FilterBar (period)
    │   ├── OKR树形列表
    │   │   ├── Objective 行
    │   │   └── KR 行 (inline edit)
    │   └── ConfirmDialog (删除确认)
    ├── GitActivity.vue
    │   ├── ContributionHeatmap (团队级)
    │   ├── PR 指标表 (NDataTable)
    │   └── 仓库活动条形图
    └── Admin.vue
        ├── NTabs (#users, #mapping, #sync)
        ├── 用户管理 Tab (NDataTable + NModal)
        ├── 作者映射 Tab (NDataTable)
        └── 同步日志 Tab (NDataTable + 触发按钮)
```

### 5.2 路由配置

```typescript
const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  {
    path: '/', component: AppLayout, meta: { requiresAuth: true },
    children: [
      { path: '', component: Overview },
      { path: 'projects/:id', component: ProjectDetail },
      { path: 'members/:id', component: MemberDetail, meta: { roles: ['admin', 'manager', 'developer'] } },
      { path: 'okr', component: OKR },
      { path: 'git', component: GitActivity, meta: { roles: ['admin', 'manager', 'developer'] } },
      { path: 'admin', component: Admin, meta: { roles: ['admin'] } },
    ]
  }
];
```

### 5.3 Pinia Store 设计

**authStore**: token, user (id/displayName/email/role), isAuthenticated, login(), logout(), fetchMe()

**dashboardStore**: overviewData, projectDetail, memberDetail, okrData, gitActivity, adminData, loadingStates, errorStates

### 5.4 设计令牌 (CSS 变量)

```css
:root {
  /* Primary - Trusted Indigo */
  --color-primary: oklch(0.45 0.12 255);         /* #3B5998 */
  --color-primary-hover: oklch(0.40 0.12 255);
  --color-primary-light: oklch(0.92 0.03 255);

  /* Accent - Amber */
  --color-accent: oklch(0.75 0.15 75);           /* #D4920A */

  /* Semantic */
  --color-success: #0D9668;
  --color-warning: #D4920A;
  --color-error: #DC2626;
  --color-info: #2B8CA3;

  /* Chart palette (HEX for ECharts) */
  --chart-1: #3B5998;
  --chart-2: #0D9668;
  --chart-3: #D4920A;
  --chart-4: #7C4DBA;
  --chart-5: #2B8CA3;

  /* Typography */
  --font-heading: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Plus Jakarta Sans', sans-serif;
  --font-code: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border radius */
  --radius-btn: 8px;
  --radius-card: 12px;
  --radius-modal: 16px;
  --radius-pill: 9999px;

  /* Easing */
  --ease-default: cubic-bezier(0.25, 1, 0.5, 1);     /* ease-out-quart */
  --ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);     /* ease-out-expo */
  --duration-hover: 200ms;
  --duration-entrance: 600ms;
  --duration-collapse: 300ms;

  /* Z-index */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal: 300;
  --z-toast: 9999;
}
```

---

## 6. 认证与权限设计

### 6.1 JWT 流程

1. 用户提交 email + password
2. 后端验证密码 (bcrypt.compare)
3. 检查 loginAttempts >= 5 且 lockedUntil > now -> 返回 423
4. 密码正确 -> 重置 loginAttempts, 签发 JWT (HS256, 7天有效期)
5. 密码错误 -> loginAttempts++, 若达到 5 次设置 lockedUntil = now + 15min

### 6.2 中间件链

```
请求 -> logger -> auth (验证 JWT) -> role (检查权限) -> route handler -> error-handler
```

### 6.3 权限矩阵 (中间件实现)

| 路由 | admin | manager | developer | viewer |
|------|-------|---------|-----------|--------|
| /api/overview | Y | Y | Y | Y |
| /api/projects/* | Y | Y | Y | Y |
| /api/members/:id | Y (全部) | Y (全部) | Y (仅 self) | Y (仅 self) |
| /api/okr (GET) | Y | Y | Y | Y |
| /api/okr (POST/PATCH/DELETE) | Y | Y | N | N |
| /api/git/activity | Y | Y | Y (仅 self) | N |
| /api/admin/* | Y | N | N | N |

---

## 7. 数据同步设计

### 7.1 Plane 同步 (每 15 分钟)

流程: 获取 Projects -> 对每个 Project 获取 Cycles/Issues/Modules -> Upsert 到 SQLite

### 7.2 Gitea 同步 (每 30 分钟)

流程: 获取 Repos -> 对每个 Repo 获取 Commits/PRs (since lastSync) -> 执行作者关联 -> Upsert

### 7.3 作者关联逻辑

1. authorMappings.gitEmail 匹配
2. authorMappings.gitUsername 匹配
3. users.email 精确匹配 (自动创建 mapping)
4. 未关联 (userId = null, 等待管理员手动处理)

---

## 8. 部署架构

### 8.1 Docker Compose

```yaml
services:
  dashboard-api:
    build: ./code/backend
    ports: ["3200:3200"]
    volumes: [dashboard-data:/data]
    environment:
      - DATABASE_PATH=/data/devperf.db
      - JWT_SECRET=${JWT_SECRET}
      - PLANE_BASE_URL=http://plane-api:8000
      - PLANE_API_TOKEN=${PLANE_API_TOKEN}
      - PLANE_WORKSPACE_SLUG=${PLANE_WORKSPACE_SLUG}
      - GITEA_BASE_URL=http://gitea:3000
      - GITEA_API_TOKEN=${GITEA_API_TOKEN}
      - GITEA_ORG=${GITEA_ORG}
    networks: [devperf-net]
    restart: unless-stopped

  dashboard-web:
    build: ./code/frontend
    ports: ["3201:80"]
    depends_on: [dashboard-api]
    networks: [devperf-net]
    restart: unless-stopped

volumes:
  dashboard-data:

networks:
  devperf-net:
    external: true
```

### 8.2 环境变量

```bash
# .env.example
DATABASE_PATH=/data/devperf.db
JWT_SECRET=                          # 必填
PORT=3200

PLANE_BASE_URL=http://plane-api:8000
PLANE_API_TOKEN=                     # 必填
PLANE_WORKSPACE_SLUG=jasonqiyuan

GITEA_BASE_URL=http://gitea:3000
GITEA_API_TOKEN=                     # 必填
GITEA_ORG=jasonqiyuan

SYNC_PLANE_INTERVAL=15
SYNC_GITEA_INTERVAL=30

ADMIN_EMAIL=admin@jasonqiyuan.com    # 初始管理员邮箱
ADMIN_PASSWORD=                      # 初始管理员密码
```

---

## 9. 开发阶段（模块划分与依赖关系）

### 9.1 模块清单

| 模块 | 名称 | 后端范围 | 前端范围 | 依赖 |
|------|------|---------|---------|------|
| M0 | 项目骨架 | Bun+Hono+Drizzle 初始化, DB Schema, Health API, 错误处理中间件, 日志中间件 | Vue3+Vite+NaiveUI 初始化, 路由框架, Pinia setup, 设计令牌, AppLayout+AppSidebar+AppHeader | 无 |
| M1 | 认证模块 | JWT 登录 API, auth/role 中间件, 用户 CRUD service, 种子数据 | Login.vue, authStore, Axios JWT 拦截器, 路由守卫, useAuth/usePermission composables | M0 |
| M2 | 数据同步 | Plane Client, Gitea Client, Cron 调度器, sync-plane, sync-gitea, author-matching, syncLogs | 无前端 (后台服务) | M1 |
| M3 | 团队总览 | GET /api/overview (聚合查询 6 个数据块), GET /api/projects (列表) | Overview.vue, FilterBar, 6 个图表组件(SprintDelivery/TaskStatusPie/ProjectProgress/WeeklyCode/OKRProgress/PRMergeTime), DataCard, EmptyState, LoadingSkeleton, ErrorState, Sprint弹窗, 任务侧栏 | M2 |
| M4 | 项目明细+个人产出 | GET /api/projects/:id, GET /api/members/:id, GET /api/members, metrics.ts(KPI计算) | ProjectDetail.vue, MemberDetail.vue, Breadcrumb, BurndownChart, ContributionHeatmap, KPIRadarChart | M2 |
| M5 | OKR+Git活动 | OKR CRUD API, GET /api/git/activity | OKR.vue, GitActivity.vue, ConfirmDialog, OKR树形列表(inline edit) | M2 |
| M6 | 管理后台 | /api/admin/* (users CRUD, author-mappings, sync trigger/logs) | Admin.vue (3-tab: 用户管理/作者映射/同步日志) | M1 |
| M7 | Docker部署 | Dockerfile, docker-compose.yml, nginx.conf, 一键启动脚本 | Dockerfile, nginx.conf | M0-M6全部 |

### 9.2 依赖关系图

```
M0 (骨架)
  |
  v
M1 (认证) -----+
  |             |
  v             v
M2 (同步)     M6 (管理后台, 可与 M2 并行)
  |
  +--------+--------+
  |        |        |
  v        v        v
M3 (总览) M4 (项目+个人) M5 (OKR+Git)
  |        |        |
  +--------+--------+
           |
           v
         M7 (Docker)
```

### 9.3 开发顺序（流水线并行）

```
Phase 2 时间线 ->

M0: ──[开发]──
                \
M1: ────────[后端]──[测试+修复]──[前端]──[测试+修复]──
                                    \
M2: ────────────────[后端]──[测试+修复]──(无前端)──
                                    |           \
M6: ────────────────[后端]──────────+──[前端]──[测试+修复]──
                                    |
M3: ────────────────────────[后端]──[测试]──[前端]──[测试]──
M4: ────────────────────────[后端]──[测试]──[前端]──[测试]── (与M3并行)
M5: ────────────────────────[后端]──[测试]──[前端]──[测试]── (与M3并行)
                                                            \
M7: ────────────────────────────────────────────────[Docker]──
                                                            \
E2E: ──────────────────────────────────────────────────[测试]──
```

**关键规则**:
1. M0 必须最先完成（骨架）
2. M1 紧随 M0（认证是其他模块的前置）
3. M2 和 M6 可并行（M2 后端完成后 M3/M4/M5 前端才能用真实 API）
4. M3/M4/M5 无互相依赖，可完全并行
5. M7 在 M0-M6 全部完成后执行
6. E2E 在 M7 之后

---

## 10. 测试策略

### 10.1 测试分层

| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| 后端单元测试 | bun:test | services/*.ts 的纯函数（KPI 计算、作者匹配、OKR 进度计算） |
| 后端 API 测试 | bun:test + Hono testClient | 每个 API 端点的正常/边界/异常场景 |
| 前端组件测试 | Vitest + @vue/test-utils | 组件渲染、交互、状态 |
| E2E 测试 | Playwright | 完整用户流程 |

### 10.2 测试覆盖率目标

| 代码类型 | 目标 |
|---------|------|
| 后端 services | >= 80% |
| 后端 routes | >= 70% |
| 前端组件 | >= 60% |
| 整体 | >= 70% |

---

## 11. 启动命令

```bash
# 开发模式
cd code/backend && bun install && bun run dev    # http://localhost:3200
cd code/frontend && bun install && bun run dev   # http://localhost:5173

# 构建
cd code/backend && bun run build
cd code/frontend && bun run build

# Docker
docker-compose up --build

# 测试
cd code/backend && bun test
cd code/frontend && bun run test
```
