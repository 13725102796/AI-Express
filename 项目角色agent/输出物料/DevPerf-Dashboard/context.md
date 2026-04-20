# DevPerf-Dashboard 项目上下文

## 关键决策记录
| 时间 | Phase | Agent | 决策 | 理由 | 影响范围 |
|------|-------|-------|------|------|---------|
| 2026-04-09 | 0 | research-agent | 选用配色方案A"信赖靛蓝" | 管理层接受度5/5、行业契合度5/5、亮色为主更安全 | 全局配色方向 |
| 2026-04-09 | 0 | product-agent | PRD v1.0 定稿，8页面架构 | 基于竞品分析和用户画像，MVP覆盖6个P0+2个P1功能 | 功能范围和页面结构 |
| 2026-04-09 | 0 | design-agent | OKLCH色彩空间 + 4px间距 + 模块化字体比例尺1.25 | Impeccable设计原则：反AI味、感知均匀色彩 | 全局设计令牌体系 |
| 2026-04-09 | 0 | orchestrator | Warning色分层：大文字用0.65，小文字用0.55 | Round 2审查发现小文字AA不合规，增加warning-text变体 | 语义色使用规范 |
| 2026-04-09 | 0 | orchestrator | 图表调色板增加HEX回退值 | ECharts需要HEX配置，OKLCH不适合直接传入JS API | ECharts图表配色配置 |
| 2026-04-09 | 0 | orchestrator | Phase 1须为OKLCH添加HEX CSS fallback | Chrome 90-110不支持OKLCH，PRD要求Chrome 90+ | Phase 1 CSS编写规范 |
| 2026-04-09 | 1 | orchestrator | 7页面拆解定稿（P01-P07） | PRD信息架构定义7个独立路由页面，404不需独立设计 | 页面设计范围 |
| 2026-04-09 | 1 | orchestrator | 用户操作统一到AppSidebar底部 | AppHeader和AppSidebar同时有用户下拉造成歧义 | 全局组件交互规范 |
| 2026-04-09 | 1 | orchestrator | Toast固定右上角z-index:9999 | 需要确保Toast始终在所有弹窗/抽屉之上 | 全局UI层级 |
| 2026-04-09 | 1 | orchestrator | P04面包屑通过?from=projectId传递来源 | 直接导航和下钻导航需要不同面包屑层级 | 跨页导航机制 |
| 2026-04-09 | 1 | orchestrator | P07 Admin Tab使用URL hash持久化 | 支持直接链接和刷新保持当前Tab | 管理后台交互 |
| 2026-04-09 | 1 | orchestrator | OKR支持KR删除操作(admin/manager) | 页面规格审查Round 2发现缺失，补充完整CRUD | OKR页面功能 |
| 2026-04-09 | 2 | tech-architect | Bun >= 1.2 + Hono ^4.0 + Drizzle ~0.36 | ADR对比: Bun 99k req/s vs Node 41k, Hono跨运行时, Drizzle零开销类型推导 | 后端技术栈版本锁定 |
| 2026-04-09 | 2 | tech-architect | SQLite单文件DB + Docker Volume持久化 | 10万行查询<200ms, 足够Dashboard缓存层使用 | 数据存储方案 |
| 2026-04-09 | 2 | tech-architect | jose ^5.0 替代 jsonwebtoken | ESM原生, Bun兼容, 更轻量 | JWT库选择 |
| 2026-04-09 | 2 | tech-architect | croner ^9.0 Cron调度器 | ESM原生Cron, 替代node-cron | 定时同步方案 |
| 2026-04-09 | 2 | tech-architect | 10表数据模型(users/projects/sprints/tasks/milestones/commits/prs/objectives/keyResults/syncLogs) | 覆盖所有Plane+Gitea同步实体 + Dashboard自管OKR | 数据库架构 |
| 2026-04-09 | 2 | orchestrator | 登录锁定策略: 5次失败锁15分钟 | 防暴力破解, 无需Redis, 直接写users表 | 认证安全 |
| 2026-04-09 | 2 | orchestrator | ECharts useECharts composable + ResizeObserver | 统一图表响应式封装, 自动resize/dispose | 图表组件架构 |
| 2026-04-09 | 2 | orchestrator | 图表组件全部使用HEX色值(CHART_COLORS数组) | ECharts API不支持OKLCH, 从context.md图表调色板取HEX | 图表配色实现 |
| 2026-04-09 | 2 | orchestrator | ContributionHeatmap使用GitHub 5级色阶 | 0/1-2/3-5/6-10/10+ 对应 #EBEDF0/#9BE9A8/#40C463/#30A14E/#216E39 | 热力图视觉设计 |
| 2026-04-09 | 2 | orchestrator | BurndownChart含Today标记线 | markLine标记当前日期, amber色, 帮助判断进度 | 燃尽图交互增强 |
| 2026-04-09 | 2 | orchestrator | PRMergeTimeChart双Y轴(时间+PR数) | 左轴小时, 右轴PR数量, 48h红色虚线预警 | PR效率图表设计 |
| 2026-04-09 | 2 | orchestrator | types/index.ts 340行完整前端类型 | 从shared-types.md逐条映射, 含ErrorCodes常量 | 前端类型安全 |

## 设计令牌快照

### 色彩（OKLCH）
| Token | OKLCH | HEX近似 | 用途 |
|-------|-------|---------|------|
| --color-primary | oklch(0.45 0.12 255) | #3B5998 | 品牌色/主按钮/导航 |
| --color-primary-light | oklch(0.55 0.10 255) | - | Hover态 |
| --color-primary-dark | oklch(0.35 0.14 255) | - | Active态 |
| --color-primary-surface | oklch(0.95 0.02 255) | - | 浅色表面 |
| --color-secondary | oklch(0.55 0.03 250) | - | 次要操作/辅助文字 |
| --color-accent | oklch(0.75 0.15 75) | #D4920A | CTA/数据高亮 |
| --color-accent-hover | oklch(0.70 0.17 75) | - | CTA Hover |
| --color-success | oklch(0.55 0.15 160) | #0D9668 | 完成/正向 |
| --color-warning | oklch(0.65 0.16 70) | - | 预警/大文字 |
| --color-warning-text | oklch(0.55 0.18 70) | - | 预警/小文字AA |
| --color-error | oklch(0.55 0.18 25) | - | 错误/逾期 |
| --color-bg | oklch(0.985 0.005 250) | #F8FAFC | 页面背景 |
| --color-bg-elevated | oklch(1.0 0.0 0) | #FFFFFF | 卡片背景 |
| --color-bg-dark | oklch(0.15 0.02 255) | #0F172A | 暗色区域 |
| --color-text-primary | oklch(0.20 0.02 250) | #1E293B | 主要文字 |
| --color-text-secondary | oklch(0.45 0.02 250) | #64748B | 辅助文字 |

### 图表调色板
| Token | OKLCH | HEX | 系列 |
|-------|-------|-----|------|
| --color-chart-1 | oklch(0.45 0.12 255) | #3B5998 | Indigo |
| --color-chart-2 | oklch(0.55 0.15 160) | #0D9668 | Green |
| --color-chart-3 | oklch(0.75 0.15 75) | #D4920A | Amber |
| --color-chart-4 | oklch(0.50 0.12 310) | #7C4DBA | Plum |
| --color-chart-5 | oklch(0.60 0.12 200) | #2B8CA3 | Teal |

### 字体
| 用途 | 字体 | 字重 |
|------|------|------|
| 标题 | Plus Jakarta Sans | 700-800 (bold/extrabold) |
| 正文 | Plus Jakarta Sans | 400-500 (regular/medium) |
| 代码/SHA | JetBrains Mono | 400-500 |
| KPI数字 | Plus Jakarta Sans + tnum | 800 (extrabold) |

### 间距（4px基础）
--space-1(4px) / --space-2(8px) / --space-3(12px) / --space-4(16px) / --space-6(24px) / --space-8(32px) / --space-12(48px) / --space-16(64px) / --space-20(80px) / --space-24(96px)

### 圆角
--radius-sm(6px) / --radius-md(8px 按钮) / --radius-lg(12px 卡片) / --radius-xl(16px 弹窗) / --radius-full(9999px 头像)

### 动效
| Token | 值 | 用途 |
|-------|---|------|
| --duration-instant | 100ms | active/即时反馈 |
| --duration-fast | 200ms | hover/tooltip |
| --duration-normal | 300ms | tab切换/面板展开 |
| --duration-slow | 500ms | 图表过渡 |
| --duration-entrance | 600ms | 页面入场 |
| --ease-out-quart | cubic-bezier(0.25,1,0.5,1) | 默认easing |
| --ease-out-expo | cubic-bezier(0.16,1,0.3,1) | 入场/强调过渡 |

### 阴影（多层柔和）
--shadow-sm / --shadow-md / --shadow-lg / --shadow-xl（全部使用 oklch(0.20 0.02 250 / alpha) 带蓝色调）

## 技术选型快照
- 运行时: Bun >= 1.2 (推荐 1.3)
- 后端框架: Hono ^4.0
- ORM: Drizzle ORM ~0.36
- 数据库: SQLite (via better-sqlite3)
- 前端: Vue 3.5 + Vite 6 + TypeScript 5.7
- 图表: ECharts >= 5.5.1
- UI 组件: Naive UI ~2.40
- 状态管理: Pinia ~2.3
- HTTP客户端: Axios ^1.7
- JWT: jose ^5.0
- 校验: Zod ^3.24
- Cron: croner ^9.0
- 部署: Docker Compose v2

## 已知限制与风险
| 发现时间 | 发现者 | 描述 | 状态 |
|---------|--------|------|------|
| 2026-04-09 | orchestrator | 用户已指定完整技术栈，调研和PRD应增强而非替换用户已有技术决策 | 活跃 |
| 2026-04-09 | orchestrator | 本项目是展示层，不自建项目管理系统，Plane负责任务管理 | 活跃 |
| 2026-04-09 | orchestrator | OKLCH在Chrome 90-110不支持，Phase 1 CSS须提供HEX fallback | 已解决(global.css使用HEX) |
| 2026-04-09 | orchestrator | Plane社区版API频率限制未明确，同步频率可能需调整 | 活跃 |
| 2026-04-09 | orchestrator | 页面HTML使用CSS/SVG模拟图表，实际开发使用ECharts | 已解决(9个ECharts组件) |
| 2026-04-09 | orchestrator | 热力图使用随机数据，实际数据来自API | 已解决(ContributionHeatmap组件) |
| 2026-04-09 | orchestrator | 弹窗/模态框未实现focus trap，需Vue实现 | 待Phase 3 |
| 2026-04-09 | orchestrator | 无API速率限制中间件 | 待Phase 3(建议express-rate-limit或hono-rate-limiter) |
| 2026-04-09 | orchestrator | E2E测试需Docker环境运行 | 待Phase 3 |

## Phase 1 页面清单
| 编号 | 页面 | 文件 | 大小 | 状态数 | 审查状态 |
|------|------|------|------|--------|---------|
| P01 | Login | P01-login.html | 25KB | 5+2 | PASS |
| P02 | Overview | P02-overview.html | 38KB | 5 | PASS |
| P03 | ProjectDetail | P03-project.html | 29KB | 5 | PASS |
| P04 | MemberDetail | P04-member.html | 25KB | 5 | PASS |
| P05 | OKR | P05-okr.html | 24KB | 4+3 | PASS |
| P06 | GitActivity | P06-git.html | 21KB | 5 | PASS |
| P07 | Admin | P07-admin.html | 28KB | 2+tabs | PASS |

## Phase 2 代码清单
| 层 | 文件数 | 行数 | 说明 |
|----|--------|------|------|
| Backend (src/) | 26 | 2226 | Hono routes/services/middleware/sync/db |
| Frontend (src/) | 33 | ~3200 | 7 views + 3 layout + 3 shared + 10 charts + types + stores + api + composables |
| Tests | 14 | ~800 | 5 backend + 9 frontend test files |
| Config/Deploy | 6 | ~200 | Docker/nginx/package.json/vite |
| **Total** | **79** | **~6400** | |

## Phase 2 测试覆盖
| 测试类型 | 数量 | 通过率 |
|---------|------|--------|
| 后端单元测试 | 8 | 100% |
| API接口测试 | 13 | 100% |
| 前端组件测试 | 37 | 100% |
| **合计** | **58** | **100%** |
