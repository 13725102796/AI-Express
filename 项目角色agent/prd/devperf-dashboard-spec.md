# 研发人效 Dashboard (DevPerf Dashboard)

> **目标**：基于 Plane (自托管) + Gitea 已有基础设施，构建一个轻量级数据聚合展示层，替代飞书表格管理，为杰森集团管理层提供只读的团队产出透明化窗口。
>
> **核心原则**：不自建项目管理系统。Plane 社区版负责任务管理/Sprint/看板，本项目只做 Dashboard 展示层。

---

## 技术栈

| 层 | 选型 | 版本要求 |
|---|------|---------|
| 运行时 | Bun | >= 1.1 |
| 后端框架 | Hono | latest |
| ORM | Drizzle ORM | latest |
| 数据库 | SQLite (via better-sqlite3) | - |
| 前端 | Vue 3 + Vite + TypeScript | Vue >= 3.4 |
| 图表 | ECharts | >= 5.5 |
| UI 组件 | Naive UI | latest |
| 部署 | Docker Compose | 与 Plane/Gitea 同机部署 |

---

## 项目结构

```
devperf-dashboard/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── drizzle.config.ts
├── src/
│   ├── index.ts                    # Hono 入口
│   ├── config.ts                   # 环境变量配置
│   ├── db/
│   │   ├── schema.ts               # Drizzle Schema 定义
│   │   └── migrate.ts              # 迁移脚本
│   ├── api/
│   │   ├── plane-client.ts         # Plane REST API 封装
│   │   └── gitea-client.ts         # Gitea REST API 封装
│   ├── sync/
│   │   ├── scheduler.ts            # Cron 调度器
│   │   ├── sync-plane.ts           # Plane 数据同步逻辑
│   │   └── sync-gitea.ts           # Gitea 数据同步逻辑
│   ├── routes/
│   │   ├── auth.ts                 # JWT 登录
│   │   ├── overview.ts             # 团队总览 API
│   │   ├── projects.ts             # 项目明细 API
│   │   ├── members.ts              # 个人产出 API
│   │   ├── okr.ts                  # OKR 数据 API
│   │   └── git.ts                  # Git 活动 API
│   ├── services/
│   │   ├── metrics.ts              # KPI 计算逻辑
│   │   ├── author-matching.ts      # Git 作者 → 成员关联
│   │   └── okr.ts                  # OKR CRUD + 进度计算
│   └── middleware/
│       ├── auth.ts                 # JWT 验证中间件
│       └── role.ts                 # 角色权限中间件
├── web/
│   ├── index.html
│   ├── vite.config.ts
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/index.ts
│   │   ├── stores/
│   │   │   ├── auth.ts             # Pinia 认证状态
│   │   │   └── dashboard.ts        # Pinia 数据状态
│   │   ├── api/
│   │   │   └── request.ts          # Axios + JWT 拦截器
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── Overview.vue        # 团队总览（默认落地页）
│   │   │   ├── ProjectDetail.vue   # 项目明细
│   │   │   ├── MemberDetail.vue    # 个人产出
│   │   │   ├── OKR.vue             # OKR 看板
│   │   │   └── GitActivity.vue     # Git 活动
│   │   ├── components/
│   │   │   ├── charts/             # ECharts 封装组件
│   │   │   │   ├── SprintDeliveryChart.vue
│   │   │   │   ├── TaskStatusPie.vue
│   │   │   │   ├── ProjectProgressBars.vue
│   │   │   │   ├── WeeklyCodeActivity.vue
│   │   │   │   ├── OKRProgressBars.vue
│   │   │   │   ├── PRMergeTimeChart.vue
│   │   │   │   ├── BurndownChart.vue
│   │   │   │   └── ContributionHeatmap.vue
│   │   │   ├── FilterBar.vue       # 时间/项目/人员筛选
│   │   │   └── KPICard.vue         # KPI 指标卡片
│   │   ├── composables/
│   │   │   └── useECharts.ts       # ECharts 响应式封装
│   │   └── types/
│   │       └── index.ts            # 全局类型定义
│   └── package.json
└── deploy/
    ├── nginx.conf                  # Nginx 反向代理配置
    └── docker-compose.prod.yml     # 生产部署配置
```

---

## 数据库 Schema (SQLite)

Dashboard 服务用 SQLite 缓存从 Plane/Gitea 同步来的聚合数据，不直接读 Plane 或 Gitea 的数据库。

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── 用户与角色 ──
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                    // 内部 UUID
  planeUserId: text('plane_user_id'),             // Plane 用户 ID
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(),
  gitUsername: text('git_username'),               // Gitea 用户名
  role: text('role', { enum: ['admin', 'manager', 'developer', 'viewer'] }).notNull(),
  // viewer = 杰森侧只读账号
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// ── 项目（对应 Plane Project）──
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  planeProjectId: text('plane_project_id').notNull(),
  name: text('name').notNull(),
  identifier: text('identifier'),                  // 如 "AVATAR", "AIRFLOW"
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
});

// ── Sprint 快照（对应 Plane Cycle）──
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
  // 燃尽图数据，JSON 格式: [{date, ideal, actual}]
  burndownData: text('burndown_data', { mode: 'json' }),
  status: text('status', { enum: ['upcoming', 'active', 'completed'] }),
});

// ── 任务快照（对应 Plane Issue）──
export const taskSnapshots = sqliteTable('task_snapshots', {
  id: text('id').primaryKey(),
  planeIssueId: text('plane_issue_id').notNull(),
  projectId: text('project_id').references(() => projects.id),
  sprintId: text('sprint_id').references(() => sprintSnapshots.id),
  title: text('title').notNull(),
  status: text('status'),                          // todo/in_progress/review/done
  priority: text('priority'),                      // urgent/high/medium/low/none
  assigneeId: text('assignee_id').references(() => users.id),
  storyPoints: integer('story_points'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  dueDate: text('due_date'),
  labels: text('labels', { mode: 'json' }),        // JSON string[]
});

// ── 里程碑（对应 Plane Module）──
export const milestones = sqliteTable('milestones', {
  id: text('id').primaryKey(),
  planeModuleId: text('plane_module_id').notNull(),
  projectId: text('project_id').references(() => projects.id),
  name: text('name').notNull(),
  status: text('status'),                          // backlog/active/completed/cancelled
  targetDate: text('target_date'),
  totalIssues: integer('total_issues').default(0),
  completedIssues: integer('completed_issues').default(0),
});

// ── Git Commit 记录 ──
export const gitCommits = sqliteTable('git_commits', {
  id: text('id').primaryKey(),
  repoName: text('repo_name').notNull(),
  sha: text('sha').notNull().unique(),
  authorEmail: text('author_email'),
  authorName: text('author_name'),
  userId: text('user_id').references(() => users.id),  // 关联后的本地用户
  message: text('message'),
  additions: integer('additions').default(0),
  deletions: integer('deletions').default(0),
  committedAt: integer('committed_at', { mode: 'timestamp' }).notNull(),
});

// ── Git PR 记录 ──
export const gitPRs = sqliteTable('git_prs', {
  id: text('id').primaryKey(),
  repoName: text('repo_name').notNull(),
  externalId: integer('external_id').notNull(),
  title: text('title'),
  userId: text('user_id').references(() => users.id),
  authorUsername: text('author_username'),
  state: text('state'),                            // open/closed/merged
  additions: integer('additions').default(0),
  deletions: integer('deletions').default(0),
  reviewComments: integer('review_comments').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  mergedAt: integer('merged_at', { mode: 'timestamp' }),
  // 合入耗时（小时），mergedAt - createdAt
  mergeTimeHours: real('merge_time_hours'),
});

// ── OKR（Dashboard 自管理，非来自 Plane）──
export const objectives = sqliteTable('objectives', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  ownerId: text('owner_id').references(() => users.id),
  projectId: text('project_id').references(() => projects.id),
  period: text('period').notNull(),                // "2026-Q2"
  progress: real('progress').default(0),           // 0-100，KR 加权自动计算
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const keyResults = sqliteTable('key_results', {
  id: text('id').primaryKey(),
  objectiveId: text('objective_id').references(() => objectives.id).notNull(),
  title: text('title').notNull(),
  targetValue: real('target_value').notNull(),
  currentValue: real('current_value').default(0),
  unit: text('unit'),                              // "%", "个", "天" 等
  weight: real('weight').default(1),               // 权重，用于加权计算
  // 可选：关联 Plane Module/Cycle ID，自动同步进度
  linkedPlaneCycleId: text('linked_plane_cycle_id'),
  linkedPlaneModuleId: text('linked_plane_module_id'),
});

// ── 作者映射表（Git 作者 → 本地用户）──
export const authorMappings = sqliteTable('author_mappings', {
  id: text('id').primaryKey(),
  gitEmail: text('git_email').unique(),
  gitUsername: text('git_username').unique(),
  userId: text('user_id').references(() => users.id),
});

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

---

## API 设计

### 认证

```
POST /api/auth/login
  Body: { email, password }
  Response: { token, user: { id, displayName, role } }
  说明: JWT Token，有效期 7 天

GET /api/auth/me
  Header: Authorization: Bearer <token>
  Response: { id, displayName, email, role }
```

### 团队总览

```
GET /api/overview
  Query: ?period=2026-Q2&projectId=xxx
  Response: {
    sprintDelivery: {
      // 近 6 个 Cycle 的交付率数据
      cycles: [{ name, plannedPoints, completedPoints, deliveryRate }]
    },
    taskDistribution: {
      // 全局任务状态分布
      todo: number, inProgress: number, review: number, done: number
    },
    projectProgress: [
      // 各产品线当前 Sprint 完成率
      { projectId, name, identifier, currentCycleProgress, totalPoints, completedPoints }
    ],
    weeklyCodeActivity: {
      // 近 12 周每周代码活动（按人堆叠）
      weeks: [{ weekStart, members: [{ userId, name, commits, prs }] }]
    },
    okrProgress: [
      // 各 Objective 进度
      { id, title, ownerName, progress, keyResults: [{ title, current, target, unit }] }
    ],
    prMergeTime: {
      // 近 12 周 PR 平均合入时间
      weeks: [{ weekStart, avgHours, prCount }]
    }
  }
```

### 项目明细

```
GET /api/projects/:id
  Response: {
    project: { id, name, identifier },
    currentCycle: {
      name, startDate, endDate, deliveryRate,
      burndown: [{ date, ideal, actual }]
    },
    milestones: [
      { id, name, status, targetDate, progress, totalIssues, completedIssues }
    ],
    taskMatrix: {
      // 人员 × 状态 矩阵
      members: [{ userId, name, todo, inProgress, review, done, totalPoints }]
    },
    gitActivity: {
      // 该项目关联仓库的 Git 统计
      recentCommits: number,
      recentPRs: number,
      weeklyTrend: [{ weekStart, commits, prs }]
    }
  }
```

### 个人产出

```
GET /api/members/:id
  Response: {
    member: { id, displayName, email },
    deliveryTrend: {
      // 近 6 个 Sprint 个人交付率
      cycles: [{ name, assignedPoints, completedPoints, rate }]
    },
    contributionHeatmap: {
      // GitHub 风格热力图，按天展示近 6 个月
      days: [{ date, commits, prsCreated, prsMerged, tasksCompleted }]
    },
    currentTasks: [
      { id, title, projectName, status, priority, storyPoints, dueDate }
    ],
    kpiScorecard: {
      sprintDeliveryRate: number,    // 个人 Sprint 交付率
      avgDeliveryDays: number,       // 平均交付周期（天）
      bugDensity: number,            // Bug 密度
      prMergeTimeAvg: number,        // PR 平均合入时间（小时）
      reviewParticipation: number,   // Review 参与率
      activityStreak: number,        // 当前连续活跃天数
    }
  }
```

### OKR

```
GET /api/okr
  Query: ?period=2026-Q2
  Response: {
    objectives: [{
      id, title, ownerName, projectName, period, progress,
      keyResults: [{ id, title, targetValue, currentValue, unit, weight, progress }]
    }]
  }

POST /api/okr/objectives
  Body: { title, ownerId, projectId, period }

POST /api/okr/objectives/:id/key-results
  Body: { title, targetValue, unit, weight, linkedPlaneCycleId?, linkedPlaneModuleId? }

PATCH /api/okr/key-results/:id
  Body: { currentValue }
  说明: 更新 KR 进度后自动重算 Objective progress（加权平均）
```

### Git 活动

```
GET /api/git/activity
  Query: ?userId=xxx&weeks=12
  Response: {
    heatmap: [{ date, commits, additions, deletions }],
    prMetrics: {
      totalPRs: number,
      mergedPRs: number,
      avgMergeTimeHours: number,
      reviewedPRs: number
    },
    weeklyTrend: [{ weekStart, commits, prs, additions, deletions }]
  }
```

### 管理接口（仅 admin）

```
GET    /api/admin/users           # 用户列表
POST   /api/admin/users           # 创建用户（含杰森侧 viewer 账号）
PATCH  /api/admin/users/:id       # 更新用户信息/角色
GET    /api/admin/author-mappings # Git 作者映射列表
POST   /api/admin/author-mappings # 手动添加映射
POST   /api/admin/sync/trigger    # 手动触发同步
GET    /api/admin/sync/logs       # 同步日志
```

---

## 数据同步逻辑

### Plane 同步 (每 15 分钟)

```
sync-plane.ts 执行流程：
1. 调用 Plane API GET /api/v1/workspaces/{slug}/projects/ 获取全部项目
2. 对每个项目：
   a. GET /api/v1/workspaces/{slug}/projects/{id}/cycles/ 获取全部 Cycle
   b. GET /api/v1/workspaces/{slug}/projects/{id}/cycles/{id}/cycle-issues/ 获取 Cycle 内任务
   c. GET /api/v1/workspaces/{slug}/projects/{id}/issues/ 获取全部任务（含状态、指派人、story points）
   d. GET /api/v1/workspaces/{slug}/projects/{id}/modules/ 获取全部 Module（里程碑）
3. 写入/更新 SQLite 对应表
4. 记录 syncLogs
```

**关键配置项：**
```
PLANE_BASE_URL=http://plane:8082     # Plane 容器内部地址
PLANE_API_TOKEN=plane-api-xxxxx      # Plane API Token (在 Plane 后台生成)
PLANE_WORKSPACE_SLUG=jasonqiyuan     # Workspace slug
```

### Gitea 同步 (每 30 分钟)

```
sync-gitea.ts 执行流程：
1. 调用 Gitea API GET /api/v1/orgs/{org}/repos 获取组织下全部仓库
2. 对每个仓库：
   a. GET /api/v1/repos/{owner}/{repo}/commits?limit=50&since={lastSyncTime} 获取新增 Commit
   b. GET /api/v1/repos/{owner}/{repo}/pulls?state=all&sort=updated&limit=50 获取 PR 列表
3. 对每条 commit/PR，执行作者关联逻辑（见下方）
4. 写入/更新 SQLite 对应表
5. 记录 syncLogs
```

**关键配置项：**
```
GITEA_BASE_URL=http://gitea:3000     # Gitea 容器内部地址
GITEA_API_TOKEN=gitea-token-xxxxx    # Gitea API Token
GITEA_ORG=jasonqiyuan               # Gitea 组织名
```

### 作者关联逻辑 (author-matching.ts)

```
对每条 commit/PR：
1. 查 authorMappings 表，按 git_email 匹配 → 找到则关联 userId
2. 未找到：按 git_username 匹配 → 找到则关联 userId
3. 未找到：查 users 表，按 email 精确匹配 → 找到则自动创建 mapping 并关联
4. 仍未找到：userId 留空，在管理后台展示为"未关联"，等待手动处理
```

---

## KPI 计算逻辑 (metrics.ts)

### 结果层指标（权重 70%）

```typescript
// Sprint 交付率
sprintDeliveryRate = completedPoints / totalPoints * 100
// 目标: >= 80%

// 平均交付周期（天）
avgDeliveryDays = mean(taskSnapshots.where(status='done').map(t => daysBetween(t.createdAt, t.completedAt)))
// 目标: 按复杂度分级，S(1-2天) M(3-5天) L(5-10天) XL(10-20天)

// Bug 密度
bugDensity = taskSnapshots.where(labels.includes('bug') && createdAt > 上线后7天).count / completedPoints
// 目标: <= 0.5 Bug/功能点

// OKR 完成率
objectiveProgress = sum(keyResults.map(kr => (kr.currentValue / kr.targetValue) * kr.weight)) / sum(kr.weight) * 100
// 目标: >= 70%

// 里程碑达成率
milestoneRate = milestones.where(status='completed' && completedAt <= targetDate).count / milestones.total
// 目标: >= 75%
```

### 过程层指标（权重 30%，仅诊断用）

```typescript
// PR 合入周期（小时）
prMergeTime = mean(gitPRs.where(state='merged').map(pr => pr.mergeTimeHours))
// 预警: > 48h

// 活动连续性
inactivityDays = daysSince(max(lastCommitDate, lastTaskUpdateDate))
// 预警: > 3 天无任何活动

// Code Review 参与度
reviewParticipation = gitPRs.where(reviewedByUser).count / gitPRs.total
// 预警: < 20%

// 每周代码变更量（仅展示趋势，无阈值）
weeklyChanges = sum(additions + deletions) per week
```

**重要：过程指标不作为绩效打分依据。它们仅用于帮助 CTO 和组长发现流程瓶颈和个人阻塞，及时介入支持。**

---

## 前端页面规格

### 路由表

| 路由 | 组件 | 说明 | 权限 |
|------|------|------|------|
| /login | Login.vue | 登录页 | 公开 |
| / | Overview.vue | 团队总览（默认落地页） | 全部角色 |
| /projects/:id | ProjectDetail.vue | 项目明细 | 全部角色 |
| /members/:id | MemberDetail.vue | 个人产出 | admin, manager |
| /okr | OKR.vue | OKR 看板 | 全部角色 |
| /git | GitActivity.vue | Git 活动统计 | admin, manager |
| /admin | Admin.vue | 用户管理/作者映射/同步日志 | admin |

### 团队总览页 (Overview.vue) — 6 个图表面板

**顶部筛选栏 (FilterBar.vue)：**
- 时间范围选择器（本季度/上季度/自定义日期）
- 产品线多选下拉（Plane Project 列表）
- 筛选结果联动全部 6 个面板

**面板 1：Sprint 交付率趋势**
- 图表：柱状图 + 80% 目标虚线
- 数据：近 6 个 Cycle 的 plannedPoints vs completedPoints
- 交互：点击柱子 → 弹窗展示该 Sprint 的任务列表

**面板 2：任务状态分布**
- 图表：环形图
- 数据：Todo / In Progress / Review / Done 各状态任务数
- 交互：点击扇区 → 侧栏展示对应状态的任务清单

**面板 3：产品线进度总览**
- 图表：横向进度条组
- 数据：各 Project 当前活跃 Cycle 的完成百分比
- 交互：点击进度条 → 跳转到 /projects/:id

**面板 4：每周代码活动**
- 图表：堆叠面积图（按成员堆叠）
- 数据：近 12 周每周 Commits + PRs
- 交互：Hover 显示各人贡献明细

**面板 5：OKR 完成进度**
- 图表：水平进度条 + 百分比数值
- 数据：各 Objective 的加权进度
- 交互：点击展开 → 显示 KR 明细

**面板 6：PR 平均合入时间**
- 图表：折线图 + 48h 预警虚线
- 数据：近 12 周每周 PR 平均 mergeTimeHours
- 交互：Hover 显示该周 PR 列表

**布局：** 2 列 × 3 行 Grid，响应式在移动端变为 1 列。每个面板内含标题、数值摘要、图表区域。

### 项目明细页 (ProjectDetail.vue)

- 燃尽图：理想线 vs 实际线
- 里程碑时间线：已完成(绿) / 进行中(蓝) / 即将到期(橙) / 已逾期(红)
- 任务分配矩阵：表格，行=成员，列=状态(Todo/InProgress/Review/Done)，单元格=任务数
- 该项目 Git 活动概览：近期 Commit 数、PR 数、周趋势小图

### 个人产出页 (MemberDetail.vue)

- 个人 Sprint 交付率趋势（近 6 个 Sprint 折线图）
- Git 贡献热力图（GitHub 风格，按天着色，近 6 个月）
- 当前进行中任务列表（表格：项目、标题、状态、优先级、Story Points、截止日期）
- KPI 综合评分卡片：雷达图展示结果层 5 项指标

### OKR 看板页 (OKR.vue)

- 按 Period 筛选（2026-Q1, 2026-Q2 等）
- 树形展示：Objective → Key Results
- 每个 KR 显示进度条（current/target），支持内联编辑 currentValue
- 进度自动计算：更新 KR 后 Objective progress 实时重算

### Git 活动页 (GitActivity.vue)

- 团队整体贡献热力图
- PR 指标表格：每人的 PR 数、平均合入时间、Review 参与率
- 仓库维度统计：每个仓库的 Commit 趋势

### 管理后台页 (Admin.vue，仅 admin 可见)

- 用户管理：CRUD，创建杰森侧 viewer 账号
- 作者映射：展示未关联的 Git 作者，支持手动关联到本地用户
- 同步状态：最近同步时间、同步日志、手动触发同步按钮
- 系统配置：Plane/Gitea 连接配置

---

## 角色权限矩阵

| 操作 | admin | manager | developer | viewer (杰森) |
|------|-------|---------|-----------|--------------|
| 查看团队总览 | ✅ | ✅ | ✅ | ✅ |
| 查看项目明细 | ✅ | ✅ | ✅ | ✅ |
| 查看个人产出 | ✅ 全部 | ✅ 下属 | ✅ 仅自己 | ✅ 需点击下钻 |
| 查看 OKR | ✅ | ✅ | ✅ | ✅ |
| 查看 Git 活动 | ✅ | ✅ | ✅ 仅自己 | ❌ |
| 编辑 OKR 进度 | ✅ | ✅ | ❌ | ❌ |
| 用户管理 | ✅ | ❌ | ❌ | ❌ |
| 作者映射管理 | ✅ | ❌ | ❌ | ❌ |
| 触发同步 | ✅ | ❌ | ❌ | ❌ |

**杰森侧 viewer 特殊逻辑：**
- 默认落地到团队总览页
- 看到的数据维度默认是"按项目"
- 可点击进入项目明细
- 可点击成员名字下钻到个人产出（但默认不在导航中暴露）
- 不可查看 Git 活动页和管理后台

---

## Docker 部署

### docker-compose.yml

```yaml
version: '3.8'
services:
  dashboard-api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3200:3200"
    environment:
      - DATABASE_PATH=/data/devperf.db
      - PLANE_BASE_URL=http://plane-api:8000
      - PLANE_API_TOKEN=${PLANE_API_TOKEN}
      - PLANE_WORKSPACE_SLUG=${PLANE_WORKSPACE_SLUG}
      - GITEA_BASE_URL=http://gitea:3000
      - GITEA_API_TOKEN=${GITEA_API_TOKEN}
      - GITEA_ORG=${GITEA_ORG}
      - JWT_SECRET=${JWT_SECRET}
      - SYNC_PLANE_INTERVAL=15       # 分钟
      - SYNC_GITEA_INTERVAL=30       # 分钟
    volumes:
      - dashboard-data:/data
    restart: unless-stopped
    networks:
      - devperf-net

  dashboard-web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "3201:80"
    depends_on:
      - dashboard-api
    restart: unless-stopped
    networks:
      - devperf-net

volumes:
  dashboard-data:

networks:
  devperf-net:
    external: true    # 加入 Plane/Gitea 所在的 Docker 网络
```

### Dockerfile (后端)

```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY src/ src/
COPY drizzle.config.ts tsconfig.json ./
RUN bun build src/index.ts --outdir=dist --target=bun

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./
EXPOSE 3200
CMD ["bun", "run", "dist/index.js"]
```

### web/Dockerfile (前端)

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/ /usr/share/nginx/html/
COPY ../deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 环境变量清单

```bash
# Dashboard 服务
DATABASE_PATH=/data/devperf.db
JWT_SECRET=your-jwt-secret-here
PORT=3200

# Plane 连接
PLANE_BASE_URL=http://plane-api:8000
PLANE_API_TOKEN=                     # 在 Plane 后台 Settings > API Tokens 生成
PLANE_WORKSPACE_SLUG=jasonqiyuan

# Gitea 连接
GITEA_BASE_URL=http://gitea:3000
GITEA_API_TOKEN=                     # 在 Gitea Settings > Applications 生成
GITEA_ORG=jasonqiyuan

# 同步频率（分钟）
SYNC_PLANE_INTERVAL=15
SYNC_GITEA_INTERVAL=30
```

---

## 实施阶段

### Phase 1: 基础设施 (0.5 天)
- [ ] 部署 Plane 社区版，Docker Compose 启动
- [ ] 创建 Workspace `jasonqiyuan`，按 8 条产品线建 Project
- [ ] 导入团队成员，配置角色
- [ ] 将飞书表格中的现有任务迁入 Plane
- **验收：** 团队成员能登录 Plane、查看任务、更新状态

### Phase 2: Dashboard 后端 (1 天)
- [ ] 初始化 Bun + Hono 项目，配置 Drizzle + SQLite
- [ ] 实现 Plane API Client (plane-client.ts)
- [ ] 实现 Gitea API Client (gitea-client.ts)
- [ ] 实现定时同步 (scheduler.ts + sync-plane.ts + sync-gitea.ts)
- [ ] 实现作者关联逻辑 (author-matching.ts)
- [ ] 实现全部 Dashboard API 路由
- [ ] 实现 JWT 认证 + 角色权限中间件
- [ ] 实现 KPI 计算服务 (metrics.ts)
- [ ] 实现 OKR CRUD + 自动进度计算
- **验收：** curl 调用所有 API 端点返回真实数据
- **注意：** Schema、API 结构、同步逻辑已在本文档中完整定义，用 Claude Code 直接生成。主要耗时在调试 Plane/Gitea API 实际返回格式。

### Phase 3: Dashboard 前端 (1.5 天)
- [ ] 初始化 Vue 3 + Vite + Naive UI + ECharts 项目
- [ ] 实现登录页 + Axios JWT 拦截器
- [ ] 实现团队总览页（6 个图表面板 + 筛选栏）
- [ ] 实现项目明细页（燃尽图 + 里程碑 + 任务矩阵）
- [ ] 实现个人产出页（热力图 + KPI 雷达图）
- [ ] 实现 OKR 看板页（树形展示 + 内联编辑）
- [ ] 实现 Git 活动页
- [ ] 响应式布局适配
- **验收：** 浏览器打开看到完整图表，筛选/下钻功能正常
- **注意：** ECharts 图表组件和 Naive UI 页面由 Claude Code 生成，主要耗时在图表交互细节和样式微调。

### Phase 4: 权限 + 上线 (0.5 天)
- [ ] 实现管理后台页（用户管理 + 作者映射 + 同步日志）
- [ ] 实现杰森侧 viewer 角色的只读限制
- [ ] Docker Compose 生产配置 + Nginx 反向代理
- [ ] 创建杰森侧测试账号，验证只读访问
- [ ] 基本操作日志
- **验收：** 杰森测试账号登录后能看到全部数据，不能修改任何内容

### 总工期: 3.5 个工作日（Vibe Coding 模式，Claude Code 辅助开发）
