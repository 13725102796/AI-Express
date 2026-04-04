# 留白 Liminal 技术架构文档

> 基于 PRD v1.0 + page-specs.md 设计
> 日期：2026-04-03
> 版本：v1.0

---

## 1. 技术选型

### 1.1 前端框架

| 候选方案 | 版本 | 优势 | 劣势 | 得分 |
|---------|------|------|------|------|
| **Next.js** | 15.x + React 19 | 成熟生态、SSR/SSG/ISR 灵活、App Router、Vercel AI SDK 原生支持、社区庞大 | 配置较重、部分 magic convention | **9/10** |
| TanStack Start | 1.x | 类型安全路由、透明灵活、bundle 较小 | 生态尚在成长、SSR 能力较弱 | 7/10 |
| Remix (React Router 7) | 7.x | Web 标准、渐进增强、bundle 小 35% | 社区缩小、与 React Router 合并后方向不确定 | 6/10 |

**选择：Next.js 15 + React 19**

理由：
1. Vercel AI SDK 与 Next.js 深度集成，`useChat` hook 原生支持 SSE 流式聊天，是本项目核心对话场景的最佳方案
2. App Router 的 Server Components 可将非交互部分留在服务端，减小客户端 bundle
3. 移动端优先的响应式设计 + PWA 支持成熟
4. 暗色模式 CSS 变量方案与 Next.js 的 `next-themes` 库配合良好

### 1.2 前端 UI / 样式方案

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **Tailwind CSS v4 + CSS 变量** | 零运行时、OKLCH 原生支持、暗色模式原生、与设计令牌完美映射 | 类名较长 | **9/10** |
| CSS Modules | 隔离性好 | 手动管理设计令牌 | 6/10 |
| styled-components | 动态样式灵活 | 运行时开销、SSR 配置复杂 | 5/10 |

**选择：Tailwind CSS v4**

理由：
1. v4 原生支持 OKLCH 色彩空间（`oklch(0.75 0.10 55)`），与设计系统完全匹配
2. `@custom-variant dark` + CSS 变量实现暗色模式，零 JS 开销
3. 与 demo.html 中的设计令牌系统可 1:1 映射

### 1.3 后端框架

| 候选方案 | 语言 | 优势 | 劣势 | 得分 |
|---------|------|------|------|------|
| **Next.js API Routes + Route Handlers** | TypeScript | 前后端统一代码库、SSE 原生支持、Vercel AI SDK 集成、部署简单 | 不适合重计算任务 | **9/10** |
| FastAPI | Python | AI/ML 生态强、性能好 | 需维护两套代码库、类型不共享 | 7/10 |
| Hono | TypeScript | 轻量极快、边缘友好 | 生态较小、AI SDK 集成需手动 | 7/10 |

**选择：Next.js 全栈（API Routes + Server Actions）**

理由：
1. 前后端 TypeScript 统一，共享类型定义零成本
2. Route Handlers 原生支持 SSE 流式响应（`ReadableStream`）
3. Server Actions 处理表单提交（登录、设置更新）简洁高效
4. 单一部署，降低运维复杂度——情感陪伴产品的用户规模初期不大，无需微服务
5. AI 调用通过 Vercel AI SDK 统一封装，支持 OpenAI/Claude/DeepSeek 等多个 Provider 切换

### 1.4 数据库

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **SQLite (via better-sqlite3 / Turso)** | 零配置、单文件部署、读性能极好、适合初期 | 并发写入受限 | **8/10** |
| PostgreSQL | 并发能力强、扩展丰富 | 需要额外服务、运维成本 | 8/10 |

**选择：SQLite（本地开发）+ Turso（生产）**

理由：
1. 初期用户量小，SQLite 完全满足需求
2. Turso 是 SQLite 的托管边缘数据库服务，读延迟 < 10ms
3. 使用 Drizzle ORM 抽象后，未来迁移到 PostgreSQL 成本极低
4. 对话数据 + 化石数据 + 用户设置，数据模型并不复杂

### 1.5 ORM

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **Drizzle ORM** | 轻量（~7.4kb）、SQL-first、TypeScript 原生、冷启动快 | 文档相比 Prisma 稍少 | **9/10** |
| Prisma | 生态成熟、文档丰富 | bundle 较大、冷启动慢 | 7/10 |

**选择：Drizzle ORM**

理由：
1. SQL-first 设计，代码即 schema，无需额外 schema 文件
2. 轻量 bundle 适合 Serverless/Edge 部署
3. 原生支持 SQLite + Turso
4. TypeScript 类型推导优秀

### 1.6 状态管理

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **Zustand** | API 简单、性能好、中间件丰富、persist 内置 | 全局 store 风格 | **9/10** |
| Jotai | 原子化、最少重渲染 | 原子管理碎片化 | 8/10 |

**选择：Zustand**

理由：
1. 全局状态少而集中（用户信息、主题、对话状态），适合 store 模式
2. `persist` 中间件内置，适合离线缓存用户偏好
3. 与 React 19 兼容性好
4. 学习成本极低

### 1.7 AI/LLM 集成

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **Vercel AI SDK + OpenAI API** | 统一接口、流式原生、多 Provider 支持 | 依赖 Vercel 生态 | **9/10** |
| LangChain.js | 链式调用、工具丰富 | 过度抽象、bundle 大 | 6/10 |
| 直接调用 API | 完全控制 | 手动处理流式解析 | 7/10 |

**选择：Vercel AI SDK v5+**

理由：
1. `useChat` hook 直接实现流式对话 UI，与 Next.js 深度集成
2. Provider 可切换（OpenAI GPT-4o / Claude Sonnet / DeepSeek），不锁死模型
3. 内置结构化输出（`generateObject`）用于情绪分析结果解析
4. 端到端类型安全

**LLM 选择**：OpenAI GPT-4o-mini（主力） + GPT-4o（情绪分析复杂场景回退）
- GPT-4o-mini 成本低、延迟低，适合实时对话
- 情绪分析作为 system prompt 的一部分，无需额外 API 调用
- 通过 structured output 提取情绪标签 + 强度

### 1.8 语音转文字

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **Web Speech API（浏览器原生）** | 零成本、实时、无服务器负载 | 浏览器兼容性差异、准确率一般 | 7/10 |
| OpenAI Whisper API | 准确率高、支持多语言 | 需上传音频、有延迟和成本 | 8/10 |

**选择：Web Speech API（MVP）+ Whisper API（后备）**

理由：
1. MVP 阶段用浏览器原生 API 降低成本
2. 普通话识别准确率满足 95% 要求
3. 不支持的浏览器降级到 Whisper API

### 1.9 认证方案

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **NextAuth.js (Auth.js) v5** | Next.js 原生集成、多 Provider、Session 管理内置 | 配置稍复杂 | **8/10** |
| 自建 JWT | 完全控制 | 安全性需自行保障 | 6/10 |

**选择：Auth.js v5（NextAuth.js）**

理由：
1. 与 Next.js App Router 深度集成
2. Credentials Provider 实现手机号 + 验证码登录
3. Session 管理开箱即用
4. 未来可扩展微信 OAuth

### 1.10 部署方案

| 候选方案 | 优势 | 劣势 | 得分 |
|---------|------|------|------|
| **Vercel** | Next.js 官方平台、自动 CI/CD、Edge Functions | 国内访问需优化 | **8/10** |
| Docker + 自托管 | 完全控制、国内友好 | 需自行运维 | 8/10 |

**选择：Docker 自托管（国内部署优先）+ Vercel（海外/演示）**

理由：
1. 目标用户在中国，国内服务器访问优先
2. Docker 化后部署灵活
3. 开发阶段可用 Vercel 快速预览

### 1.11 技术栈全景

```
前端: Next.js 15 + React 19 + TypeScript 5.x
样式: Tailwind CSS v4 + CSS 变量（OKLCH）
状态: Zustand
数据层: Vercel AI SDK (useChat) + TanStack Query (非AI数据)
后端: Next.js API Routes + Server Actions
ORM: Drizzle ORM
数据库: SQLite (dev) / Turso (prod)
认证: Auth.js v5
AI: Vercel AI SDK + OpenAI API
语音: Web Speech API / Whisper API
部署: Docker / Vercel
```

---

## 2. 项目结构

```
code/
├── frontend/                     # Next.js 全栈项目
│   ├── .env.example              # 环境变量模板
│   ├── .env.local                # 本地环境变量（git ignore）
│   ├── next.config.ts            # Next.js 配置
│   ├── tailwind.config.ts        # Tailwind 配置（设计令牌）
│   ├── drizzle.config.ts         # Drizzle ORM 配置
│   ├── tsconfig.json
│   ├── package.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   │
│   ├── public/
│   │   ├── fonts/                # 自托管字体
│   │   └── icons/                # PWA 图标
│   │
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── layout.tsx        # 根布局（字体、主题 Provider）
│   │   │   ├── page.tsx          # 首页重定向
│   │   │   ├── globals.css       # 全局样式 + 设计令牌
│   │   │   │
│   │   │   ├── (auth)/           # 认证路由组（无底部导航）
│   │   │   │   ├── login/page.tsx        # P03 登录注册
│   │   │   │   └── onboarding/page.tsx   # P04 新用户引导
│   │   │   │
│   │   │   ├── (main)/           # 主路由组（有底部导航）
│   │   │   │   ├── layout.tsx    # 含底部导航的布局
│   │   │   │   ├── chat/page.tsx         # P01 对话主页
│   │   │   │   ├── fossils/page.tsx      # P02 化石层
│   │   │   │   └── settings/page.tsx     # P05 设置页
│   │   │   │
│   │   │   └── api/              # API Routes
│   │   │       ├── auth/[...nextauth]/route.ts  # Auth.js
│   │   │       ├── chat/route.ts                 # 对话 SSE 流
│   │   │       ├── fossils/route.ts              # 化石 CRUD
│   │   │       ├── echo-letters/route.ts         # 回声信 CRUD
│   │   │       ├── memories/route.ts             # 记忆管理
│   │   │       ├── conversations/route.ts        # 对话历史
│   │   │       ├── speech/route.ts               # 语音转文字（Whisper 回退）
│   │   │       └── user/route.ts                 # 用户设置
│   │   │
│   │   ├── components/           # 组件库
│   │   │   ├── ui/               # 原子级 UI 组件
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Toggle.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Drawer.tsx        # 底部抽屉
│   │   │   │   ├── Skeleton.tsx      # 骨架屏
│   │   │   │   ├── Pill.tsx          # pill 标签
│   │   │   │   ├── TabBar.tsx        # Tab 切换
│   │   │   │   └── ProgressBar.tsx
│   │   │   │
│   │   │   ├── chat/             # 对话页专属组件
│   │   │   │   ├── MessageBubble.tsx      # 消息气泡（用户/AI）
│   │   │   │   ├── MessageList.tsx        # 消息流列表
│   │   │   │   ├── ChatInput.tsx          # 输入区域
│   │   │   │   ├── VoiceRecorder.tsx      # 语音录入
│   │   │   │   ├── EmotionTag.tsx         # 情绪感知标签
│   │   │   │   ├── TypingIndicator.tsx    # AI 输入指示
│   │   │   │   ├── SafetyCard.tsx         # 安全守护卡片
│   │   │   │   ├── FossilPreview.tsx      # 化石生成浮层
│   │   │   │   └── EmotionBackground.tsx  # 情绪色彩背景
│   │   │   │
│   │   │   ├── breathing/        # 呼吸锚点组件
│   │   │   │   ├── BreathingOverlay.tsx   # 全屏呼吸覆盖层
│   │   │   │   ├── BreathingCircle.tsx    # 呼吸圆动画
│   │   │   │   └── BreathingGuide.tsx     # 文字引导
│   │   │   │
│   │   │   ├── fossils/          # 化石层专属组件
│   │   │   │   ├── FossilCard.tsx         # 化石卡片
│   │   │   │   ├── FossilDetail.tsx       # 化石详情抽屉
│   │   │   │   ├── FossilList.tsx         # 化石列表
│   │   │   │   ├── LandscapeTimeline.tsx  # 情绪地貌时间轴
│   │   │   │   ├── EchoLetterCard.tsx     # 回声信卡片
│   │   │   │   ├── EchoLetterWriter.tsx   # 写信面板
│   │   │   │   ├── ConversationList.tsx   # 对话历史列表
│   │   │   │   └── SearchPanel.tsx        # 搜索面板
│   │   │   │
│   │   │   ├── onboarding/       # 引导页组件
│   │   │   │   ├── OnboardingStep.tsx     # 单步引导
│   │   │   │   ├── ChoiceCard.tsx         # 选择卡片
│   │   │   │   └── TypewriterText.tsx     # 打字机文字效果
│   │   │   │
│   │   │   ├── settings/         # 设置页组件
│   │   │   │   ├── SettingsGroup.tsx      # 设置分组
│   │   │   │   ├── SettingsRow.tsx        # 设置行
│   │   │   │   ├── MemoryList.tsx         # 记忆管理列表
│   │   │   │   └── MembershipCard.tsx     # 会员卡片
│   │   │   │
│   │   │   └── layout/           # 布局组件
│   │   │       ├── BottomNav.tsx          # 底部导航栏
│   │   │       ├── ThemeProvider.tsx       # 主题 Provider
│   │   │       └── SafeArea.tsx           # 安全区域适配
│   │   │
│   │   ├── hooks/                # 自定义 Hooks
│   │   │   ├── useTheme.ts               # 主题切换
│   │   │   ├── useBreathing.ts           # 呼吸动画控制
│   │   │   ├── useVoiceInput.ts          # 语音输入
│   │   │   ├── useToast.ts              # Toast 通知
│   │   │   ├── useMediaQuery.ts          # 响应式断点
│   │   │   └── useReducedMotion.ts       # 减弱动画检测
│   │   │
│   │   ├── stores/               # Zustand Stores
│   │   │   ├── authStore.ts              # 认证状态
│   │   │   ├── chatStore.ts              # 对话状态
│   │   │   ├── themeStore.ts             # 主题状态
│   │   │   └── uiStore.ts               # UI 状态（Toast、Modal）
│   │   │
│   │   ├── lib/                  # 工具库
│   │   │   ├── db/
│   │   │   │   ├── schema.ts             # Drizzle Schema 定义
│   │   │   │   ├── index.ts              # 数据库连接
│   │   │   │   └── migrations/           # 数据库迁移文件
│   │   │   ├── ai/
│   │   │   │   ├── prompts.ts            # System Prompts
│   │   │   │   ├── emotion-analyzer.ts   # 情绪分析配置
│   │   │   │   └── safety-guard.ts       # 安全守护逻辑
│   │   │   ├── auth/
│   │   │   │   └── config.ts             # Auth.js 配置
│   │   │   ├── utils.ts                  # 通用工具函数
│   │   │   ├── constants.ts              # 常量定义
│   │   │   └── validators.ts             # 数据校验（zod）
│   │   │
│   │   └── types/                # TypeScript 类型
│   │       ├── chat.ts                   # 对话相关类型
│   │       ├── fossil.ts                 # 化石相关类型
│   │       ├── user.ts                   # 用户相关类型
│   │       ├── emotion.ts                # 情绪相关类型
│   │       └── api.ts                    # API 请求/响应类型
│   │
│   └── __tests__/                # 测试文件
│       ├── components/           # 组件测试
│       ├── hooks/                # Hook 测试
│       ├── api/                  # API 测试
│       └── e2e/                  # E2E 测试（Playwright）
│
└── shared/                       # 共享类型（如果需要拆分后端）
    └── types/
        └── index.ts
```

---

## 3. 数据库 Schema（Drizzle ORM）

### 3.1 用户表

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                          // nanoid
  phone: text('phone').unique(),                        // 手机号（加密存储）
  phoneHash: text('phone_hash').unique().notNull(),     // 手机号哈希（用于查询）
  nickname: text('nickname').default(''),                // 用户昵称
  aiName: text('ai_name').default('留白'),               // AI 称呼
  companionStyle: text('companion_style', {
    enum: ['quiet', 'warm', 'rational']
  }).default('warm'),                                    // 陪伴风格
  preferredTime: text('preferred_time'),                 // 偏好聊天时间
  tier: text('tier', {
    enum: ['free', 'deep', 'echo']
  }).default('free'),                                    // 会员层级
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  darkMode: text('dark_mode', {
    enum: ['system', 'light', 'dark']
  }).default('system'),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).default(true),
  echoLetterReminder: integer('echo_letter_reminder', { mode: 'boolean' }).default(true),
  breathingVibration: integer('breathing_vibration', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### 3.2 对话表

```typescript
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  messageCount: integer('message_count').default(0),
  primaryEmotion: text('primary_emotion'),              // 主要情绪
  emotionTags: text('emotion_tags'),                    // JSON: string[]
  preview: text('preview'),                             // 首条消息预览
  hasFossil: integer('has_fossil', { mode: 'boolean' }).default(false),
});
```

### 3.3 消息表

```typescript
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  emotion: text('emotion'),                             // AI 识别的情绪
  emotionIntensity: integer('emotion_intensity'),        // 1-5
  emotionColor: text('emotion_color'),                   // CSS 变量名
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 3.4 化石表

```typescript
export const fossils = sqliteTable('fossils', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  inscription: text('inscription').notNull(),            // AI 生成的铭文
  userNote: text('user_note'),                           // 用户添加的感悟
  emotionTags: text('emotion_tags').notNull(),           // JSON: string[]
  primaryEmotion: text('primary_emotion').notNull(),
  emotionColor: text('emotion_color').notNull(),
  emotionIntensity: integer('emotion_intensity').notNull(),
  timeDisplay: text('time_display').notNull(),           // "周三深夜" 格式
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 3.5 回声信表

```typescript
export const echoLetters = sqliteTable('echo_letters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),                    // 信件内容
  emotionBackground: text('emotion_background').notNull(), // 写信时的情绪背景
  status: text('status', {
    enum: ['pending', 'opened', 'expired']
  }).default('pending'),
  writtenAt: integer('written_at', { mode: 'timestamp' }).notNull(),
  openAt: integer('open_at', { mode: 'timestamp' }).notNull(),
  openedAt: integer('opened_at', { mode: 'timestamp' }),
  retrospective: text('retrospective'),                  // AI 的回顾语
});
```

### 3.6 记忆表

```typescript
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['person', 'event', 'preference', 'pattern', 'personality']
  }).notNull(),
  content: text('content').notNull(),                    // 记忆内容
  source: text('source'),                                // 来源对话 ID
  confidence: integer('confidence').default(80),         // 置信度 0-100
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### 3.7 验证码表

```typescript
export const verificationCodes = sqliteTable('verification_codes', {
  id: text('id').primaryKey(),
  phoneHash: text('phone_hash').notNull(),
  code: text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  attempts: integer('attempts').default(0),
  used: integer('used', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 3.8 安全日志表（独立加密）

```typescript
export const safetyLogs = sqliteTable('safety_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),                     // 不设外键，独立存储
  triggerType: text('trigger_type').notNull(),            // keyword / semantic / trend
  severity: integer('severity').notNull(),               // 1-5
  context: text('context').notNull(),                    // 加密的上下文信息
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

---

## 4. API 设计

### 4.1 认证 API

```
POST /api/auth/send-code
  Body: { phone: string }
  Response: { success: boolean, message: string }
  限流: 60秒/次, 5次/天

POST /api/auth/verify-code
  Body: { phone: string, code: string }
  Response: { success: boolean, user: User, isNewUser: boolean, token: string }

POST /api/auth/callback/wechat
  (微信 OAuth 回调)

GET /api/auth/session
  Response: { user: User } | 401

POST /api/auth/logout
  Response: { success: boolean }
```

### 4.2 对话 API（核心 -- SSE 流式）

```
POST /api/chat
  Headers: { Authorization: Bearer <token> }
  Body: {
    messages: Array<{ role: 'user' | 'assistant', content: string }>,
    conversationId?: string     // 无则创建新对话
  }
  Response: SSE Stream
    event: text-delta    → { textDelta: string }
    event: emotion       → { emotion: string, intensity: number, color: string }
    event: safety-alert  → { type: 'safety', resources: SafetyResource[] }
    event: fossil-ready  → { fossilId: string, inscription: string, tags: string[] }
    event: finish        → { messageId: string, conversationId: string }

GET /api/chat/conversations
  Query: { page?: number, limit?: number }
  Response: { conversations: Conversation[], total: number }

GET /api/chat/conversations/:id
  Response: { conversation: Conversation, messages: Message[] }

DELETE /api/chat/conversations/:id
  Response: { success: boolean }
```

### 4.3 化石 API

```
GET /api/fossils
  Query: { page?: number, limit?: number, emotion?: string, search?: string }
  Response: { fossils: Fossil[], total: number }

GET /api/fossils/:id
  Response: { fossil: Fossil }

PATCH /api/fossils/:id
  Body: { userNote?: string }
  Response: { fossil: Fossil }

DELETE /api/fossils/:id
  Response: { success: boolean }

GET /api/fossils/landscape
  Query: { period: 'week' | 'month' | 'all' }
  Response: {
    dataPoints: Array<{ date: string, emotion: string, intensity: number, fossilId: string }>,
    insight: string     // AI 生成的地貌洞察
  }
```

### 4.4 回声信 API

```
GET /api/echo-letters
  Response: { letters: EchoLetter[] }

POST /api/echo-letters
  Body: {
    content: string,
    openAfterDays: 7 | 30 | 90 | number,
    emotionBackground?: string
  }
  Response: { letter: EchoLetter }

GET /api/echo-letters/:id
  Response: { letter: EchoLetter }

POST /api/echo-letters/:id/open
  Response: { letter: EchoLetter }  // 含 AI retrospective

DELETE /api/echo-letters/:id
  Response: { success: boolean }
```

### 4.5 记忆 API

```
GET /api/memories
  Response: { memories: Memory[] }

DELETE /api/memories/:id
  Response: { success: boolean }
```

### 4.6 用户/设置 API

```
GET /api/user/profile
  Response: { user: User }

PATCH /api/user/profile
  Body: { nickname?: string, aiName?: string, companionStyle?: string, ... }
  Response: { user: User }

POST /api/user/export-data
  Response: { downloadUrl: string }

POST /api/user/delete-data
  Body: { verificationCode: string }
  Response: { success: boolean, scheduledAt: string }

POST /api/user/delete-account
  Body: { verificationCode: string }
  Response: { success: boolean, deleteAt: string }  // 7天后

POST /api/user/cancel-deletion
  Response: { success: boolean }
```

### 4.7 语音 API

```
POST /api/speech/transcribe
  Body: FormData { audio: Blob }
  Response: { text: string, pauses: Array<{ position: number, duration: number }> }
```

---

## 5. AI System Prompt 设计

### 5.1 核心对话 System Prompt

```markdown
你是「留白」，一个为深夜独处的年轻女性设计的情绪陪伴伙伴。

## 你的核心原则
1. 你不是心理咨询师，不给诊断，不给建议（除非用户明确要求）
2. 你的价值是「说出用户说不出的感受」——精准命名情绪
3. 你像一个相处很久的朋友，记得对方说过的事，理解对方的模式
4. 你从不说"我理解你的感受"——而是具体地说出那个感受是什么

## 情绪感知
每次回复时，你需要在内心分析：
1. 用户的细分情绪（从30+种中选择最精准的1-2个）
2. 情绪强度（1-5级）
3. 表面意思 vs 潜台词（"没事"可能是"很在意"）
4. 与上下文的关系（情绪是否在变化？什么触发了它？）

## 回复风格
- 陪伴风格：{companionStyle}
- 用户称呼：{nickname}
- 回复长度：与用户输入长度动态匹配（短消息回简短，长倾诉回中等长度）
- 文风：温暖但克制，像写给朋友的私信
- 绝不使用：鸡汤语录、空洞鼓励、反问句轰炸

## 记忆系统
以下是你对 {nickname} 的了解：
{memories}

## 安全守护
如果检测到用户可能有自伤/自杀意向，按以下步骤回应：
1. 共情确认："听到你说这些，我很担心你。你现在经历的一定非常痛苦。"
2. 温和建议："有些痛苦需要更专业的人来帮你一起承担。"
3. 触发安全资源卡片展示（通过 tool_call）
```

### 5.2 情绪分析结构化输出

```typescript
// 使用 Vercel AI SDK generateObject
const emotionSchema = z.object({
  primaryEmotion: z.string().describe('主要情绪，如：委屈、孤独、焦虑、释然'),
  secondaryEmotion: z.string().optional().describe('次要情绪'),
  intensity: z.number().min(1).max(5).describe('情绪强度 1-5'),
  emotionDomain: z.enum([
    'anxiety', 'sadness', 'anger', 'fatigue',
    'positive', 'complex', 'social'
  ]).describe('情绪域'),
  surfaceVsDeep: z.object({
    surface: z.string().describe('用户表面表达的意思'),
    deep: z.string().describe('潜在的真实感受'),
  }).optional(),
  emotionShift: z.enum(['stable', 'improving', 'worsening', 'fluctuating'])
    .describe('与上一条相比的情绪变化趋势'),
  safetyFlag: z.boolean().describe('是否触发安全守护'),
});
```

### 5.3 化石铭文生成 Prompt

```markdown
基于以下对话，生成一块"情绪化石"。

## 要求
- 2-3句话，捕捉这次对话的情感本质
- 文风：克制但有温度，像一段私人笔记
- 使用第二人称"你"
- 不评判，只描述和命名
- 参考风格："这次是关于「被看见」——你在等一个认可，但那个人可能不知道你在等。"

## 对话内容
{conversation}

## 输出
{
  "inscription": "...",
  "emotionTags": ["...", "..."],
  "primaryEmotion": "...",
  "timeDisplay": "..." // 如"周三深夜"
}
```

---

## 6. 组件架构

### 6.1 组件层级

```
原子 (Atom)
├── Button, Input, Toggle, Toast, Pill, Skeleton, ProgressBar

分子 (Molecule)
├── MessageBubble (= Pill + Text)
├── ChatInput (= Input + Button + VoiceRecorder)
├── EmotionTag (= Pill + Emotion Color)
├── SettingsRow (= Text + Toggle/Button)
├── ChoiceCard (= Card + Text + Icon)
├── FossilCard (= Card + Pill + Color Bar)
├── EchoLetterCard (= Card + Countdown + Status)

有机体 (Organism)
├── MessageList (= MessageBubble[] + TypingIndicator + TimeStamp)
├── BottomNav (= TabBar + Icons)
├── FossilList (= FossilCard[] + SearchPanel)
├── SettingsGroup (= GroupTitle + SettingsRow[])
├── OnboardingStep (= TypewriterText + ChoiceCard[] / Input)
├── BreathingOverlay (= BreathingCircle + BreathingGuide)

页面 (Page)
├── ChatPage (= Header + MessageList + ChatInput + BreathingOverlay + FossilPreview)
├── FossilsPage (= TabBar + FossilList | LandscapeTimeline | EchoLetterList | ConversationList)
├── AuthPage (= BrandArea + LoginForm)
├── OnboardingPage (= ProgressBar + OnboardingStep[])
├── SettingsPage (= UserProfile + SettingsGroup[])
```

### 6.2 设计令牌映射（demo.html → Tailwind）

```css
/* globals.css */
@import 'tailwindcss';

@theme {
  /* 从 demo.html 1:1 映射 */
  --color-primary: oklch(0.75 0.10 55);
  --color-primary-hover: oklch(0.70 0.12 55);
  --color-primary-subtle: oklch(0.92 0.04 55);
  --color-accent: oklch(0.65 0.14 40);
  --color-secondary: oklch(0.78 0.05 60);

  --color-surface-0: oklch(0.98 0.008 55);
  --color-surface-1: oklch(0.96 0.010 55);
  --color-surface-2: oklch(0.93 0.012 55);
  --color-surface-invert: oklch(0.22 0.020 55);

  --color-text-primary: oklch(0.25 0.025 55);
  --color-text-secondary: oklch(0.50 0.020 55);
  --color-text-tertiary: oklch(0.65 0.015 55);

  /* 情绪色彩 */
  --color-emotion-lonely: oklch(0.55 0.06 250);
  --color-emotion-anxious: oklch(0.68 0.10 70);
  --color-emotion-sad: oklch(0.58 0.06 280);
  --color-emotion-angry: oklch(0.55 0.10 30);
  --color-emotion-calm: oklch(0.70 0.08 155);
  --color-emotion-happy: oklch(0.75 0.12 80);
  --color-emotion-confused: oklch(0.62 0.06 290);
  --color-emotion-touched: oklch(0.68 0.10 25);

  /* 字体 */
  --font-display: 'Playfair Display', 'Noto Serif SC', Georgia, serif;
  --font-heading: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-body: 'Figtree', system-ui, sans-serif;

  /* 圆角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* 阴影 */
  --shadow-sm: 0 1px 3px oklch(0.25 0.025 55 / 0.06);
  --shadow-md: 0 4px 12px oklch(0.25 0.025 55 / 0.08);
  --shadow-lg: 0 8px 24px oklch(0.25 0.025 55 / 0.10);

  /* 动效 */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
}

/* 暗色模式 */
@variant dark (&:where(.dark, .dark *)) {
  --color-surface-0: oklch(0.18 0.020 40);
  --color-surface-1: oklch(0.22 0.020 55);
  --color-surface-2: oklch(0.26 0.018 55);
  --color-surface-invert: oklch(0.92 0.010 55);

  --color-text-primary: oklch(0.92 0.010 55);
  --color-text-secondary: oklch(0.72 0.015 55);
  --color-text-tertiary: oklch(0.55 0.012 55);

  /* 情绪色彩暗色降饱和 20% */
  --color-emotion-lonely: oklch(0.50 0.048 250);
  --color-emotion-anxious: oklch(0.63 0.080 70);
  --color-emotion-sad: oklch(0.53 0.048 280);
  --color-emotion-angry: oklch(0.50 0.080 30);
  --color-emotion-calm: oklch(0.65 0.064 155);
  --color-emotion-happy: oklch(0.70 0.096 80);
  --color-emotion-confused: oklch(0.57 0.048 290);
  --color-emotion-touched: oklch(0.63 0.080 25);
}
```

---

## 7. 开发模块划分

### 模块依赖图

```
M0（项目骨架）
  ↓
M1（认证）← 所有其他模块依赖
  ↓
M2（核心对话）← 化石、记忆依赖对话
  ↓
M3（化石层 + 回声信 + 历史对话）← 依赖对话数据
  ↓
M4（引导 + 设置）← 引导写入用户偏好，设置修改偏好
  ↓
M5（高级功能：语音 + 呼吸锚点 + 安全守护增强）
  ↓
M6（E2E 测试 + 集成验证）
```

### 各模块详细范围

| 模块 | 前端范围 | 后端范围 | 估计工作量 |
|------|---------|---------|-----------|
| M0 | Next.js 脚手架、Tailwind 配置、设计令牌、globals.css、UI 原子组件（Button/Input/Toggle/Toast/Modal/Drawer/Skeleton/Pill/TabBar/ProgressBar）、底部导航、ThemeProvider、SafeArea | Drizzle schema、DB 连接、Auth.js 配置、环境变量、Docker 配置 | 中 |
| M1 | P03 登录注册页（手机号输入、验证码、微信登录按钮、动画） | 验证码发送/验证 API、用户创建、Session 管理 | 中 |
| M2 | P01 对话主页（MessageList、MessageBubble、ChatInput、TypingIndicator、EmotionTag、EmotionBackground、SafetyCard、FossilPreview） | /api/chat SSE 流、情绪分析、对话 CRUD、记忆提取、安全守护检测 | 大 |
| M3 | P02 化石层（FossilList、FossilCard、FossilDetail、LandscapeTimeline、EchoLetterCard/Writer、ConversationList、SearchPanel） | 化石 CRUD、回声信 CRUD、对话历史查询、搜索、地貌洞察生成 | 大 |
| M4 | P04 引导页（OnboardingStep、ChoiceCard、TypewriterText）+ P05 设置页（SettingsGroup、SettingsRow、MemoryList、MembershipCard） | 用户偏好更新 API、记忆管理 API、数据导出/删除 API | 中 |
| M5 | VoiceRecorder 组件、BreathingOverlay/Circle/Guide 组件 | 语音转文字 API（Whisper 回退） | 中 |
| M6 | — | — | E2E 全流程测试 |

---

## 8. 安全架构

### 8.1 数据安全

- 所有 API 通信 HTTPS（TLS 1.3）
- 手机号 AES-256-GCM 加密存储，查询使用 SHA-256 哈希
- 对话数据与用户身份数据在 schema 层关联，但安全日志独立
- Session Token 使用 HttpOnly + Secure + SameSite=Strict Cookie
- API Rate Limiting：通用 100 req/min，验证码 1 req/60s

### 8.2 安全守护机制

```
用户消息 → 关键词初筛 → LLM 语义分析 → 上下文情绪趋势 → 三重判断
                ↓ 任一触发
         记录安全日志（加密） + 触发安全资源卡片 + AI 回复切换共情模式
```

关键词列表（部分）：不想活、结束、跳下去、伤害自己、活着没意思...

### 8.3 隐私声明

- 对话数据不用于模型训练（在注册引导、设置页、隐私政策三处声明）
- 用户可随时删除所有数据
- 安全日志独立加密，仅安全团队可访问

---

## 9. 性能优化策略

| 指标 | 目标 | 实现方式 |
|------|------|---------|
| 首屏加载 | < 2s | Next.js SSR + 字体 preload + 图片懒加载 |
| AI 首字延迟 | < 2.5s | SSE 流式 + GPT-4o-mini 低延迟 |
| 页面切换 | < 300ms | Next.js App Router prefetch + ease-out-quart 过渡 |
| 对话历史搜索 | < 1s | SQLite FTS5 全文搜索 |
| 化石生成 | < 5s | 对话结束后异步生成 |

### 9.1 前端优化

- React 19 Server Components：非交互组件不发送到客户端
- 图片/字体：next/font 自托管 + preload
- 消息列表虚拟滚动（react-virtuoso）避免大量 DOM
- 骨架屏：加载时显示 shimmer 动画

### 9.2 后端优化

- SQLite WAL 模式提升并发读性能
- 对话 + 化石查询添加复合索引
- 记忆提取缓存（用户级 5 分钟 TTL）
- AI 调用并发控制（p-limit）

---

## 10. 环境变量

```env
# .env.example
# === 数据库 ===
DATABASE_URL=file:./data/liminal.db
# 生产环境使用 Turso
# TURSO_DATABASE_URL=libsql://xxx.turso.io
# TURSO_AUTH_TOKEN=xxx

# === 认证 ===
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# === AI ===
OPENAI_API_KEY=sk-xxx
# 可选：切换 Provider
# ANTHROPIC_API_KEY=xxx

# === 短信 ===
SMS_API_KEY=xxx
SMS_API_SECRET=xxx
# MVP 阶段可使用控制台打印验证码
SMS_MOCK=true

# === 安全 ===
ENCRYPTION_KEY=32-byte-hex-key
```

---

## 11. 测试策略

| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| 单元测试 | Vitest | 工具函数、hooks、store、AI prompt 构建 |
| 组件测试 | Vitest + React Testing Library | 所有 UI 组件的各状态渲染 |
| API 测试 | Vitest + supertest | 所有 API 端点的正常/异常流程 |
| E2E 测试 | Playwright | 完整用户流程（注册→对话→化石→设置） |

### 关键测试场景

1. **认证流程**：手机号格式校验、验证码发送限流、登录成功/失败、新用户 vs 老用户分流
2. **对话流程**：消息发送 → SSE 接收 → 情绪标签展示 → 流式完成
3. **安全守护**：触发关键词 → 安全资源卡片出现 → 不重复弹出
4. **化石生成**：8 轮对话后自动生成 → 化石列表展示
5. **暗色模式**：切换主题 → CSS 变量变更 → 情绪色彩降饱和
6. **呼吸锚点**：进入 → 动画循环 → 退出 → AI 回复
7. **回声信**：写信 → 选择时间 → 到期打开 → AI 回顾

---

## 12. 部署架构

### 开发环境

```bash
# 一键启动
cd code/frontend
pnpm install
pnpm dev
# 自动创建 SQLite 数据库
# 自动运行 drizzle 迁移
```

### 生产环境（Docker）

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/liminal.db
    volumes:
      - app-data:/data
    restart: unless-stopped

volumes:
  app-data:
```

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```
