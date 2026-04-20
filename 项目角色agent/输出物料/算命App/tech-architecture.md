# 天机 AI 算命 -- 技术架构文档

> 版本：v1.0
> 基于 PRD.md + page-specs.md v1.3 设计

---

## 1. 架构总览

### 1.1 设计原则

- **精简优先**：这是一个 3 页面的娱乐 Web App，拒绝过度工程化
- **前后端分离**：前端 SPA + 后端 API，职责清晰
- **流式优先**：AI 对话使用 SSE 流式输出，提供打字机效果
- **隐私优先**：不存储用户数据，八字计算在前端完成，对话不持久化

### 1.2 系统架构图

```
用户浏览器 (Mobile/Desktop)
    |
    |  HTTPS
    v
+---------------------------+
|   Frontend (Next.js 15)   |
|   - P01 首页（八字输入）     |
|   - P02 对话页（AI 算命）    |
|   - P03 签文分享页          |
|   - lunar-javascript 八字   |
|   - html-to-image 签文生成  |
+---------------------------+
    |
    |  REST + SSE
    v
+---------------------------+
|   Backend (Hono.js)       |
|   - /api/fortune/start    |
|   - /api/fortune/chat     |
|   - /api/health           |
+---------------------------+
    |
    |  OpenAI-compatible API
    v
+---------------------------+
|   LLM Provider            |
|   (DeepSeek / OpenAI)     |
+---------------------------+
```

### 1.3 核心决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 产品形态 | H5 Web App | PRD 建议，低成本验证 PMF |
| 前端框架 | Next.js 15 (App Router) | React 生态成熟，SSR 首屏快，社区资源丰富 |
| 后端框架 | Hono.js (Node.js) | 轻量（14KB），原生 SSE 支持，TypeScript 优先，性能优秀 |
| 八字计算 | lunar-javascript | 唯一成熟的 JS 八字排盘库，支持天干地支/五行/纳音 |
| LLM 接入 | DeepSeek API（兼容 OpenAI 格式） | 中文能力强，价格低，SSE 流式支持 |
| 签文图片 | html-to-image | 现代轻量，支持多种输出格式，比 html2canvas 更轻 |
| 样式方案 | Tailwind CSS 4 + CSS Variables | 与 demo.html 设计令牌对齐，开发效率高 |
| 部署 | Docker Compose | 前后端各一个容器，一键启动 |

---

## 2. 技术选型详情

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.x | 前端框架，App Router |
| React | 19.x | UI 库 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 原子化 CSS |
| lunar-javascript | 1.x | 八字排盘计算（前端计算，无需后端） |
| html-to-image | 1.x | 签文卡片导出为图片 |
| framer-motion | 11.x | 动效（入场/过渡/打字机） |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Hono.js | 4.x | API 框架 |
| Node.js | 20.x LTS | 运行时 |
| TypeScript | 5.x | 类型安全 |
| openai SDK | 4.x | LLM API 调用（兼容 DeepSeek） |
| zod | 3.x | 请求参数校验 |
| cors | - | Hono 内置 CORS 中间件 |

### 2.3 不使用的技术（刻意省略）

| 省略项 | 理由 |
|--------|------|
| 数据库 | 无用户系统，无数据持久化需求 |
| 认证系统 | PRD 明确无需登录 |
| 状态管理库 (Redux/Zustand) | 3 个页面，React Context + useState 足够 |
| ORM | 无数据库 |
| CI/CD | MVP 阶段不需要 |
| 消息队列 | 无异步任务 |

---

## 3. 前端架构

### 3.1 目录结构

```
frontend/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # 根布局（字体加载、全局样式）
│   ├── page.tsx               # P01 首页（生辰输入）
│   ├── chat/
│   │   └── page.tsx           # P02 对话页
│   └── globals.css            # 全局样式 + 设计令牌
├── components/
│   ├── ui/                    # 基础 UI 组件
│   │   ├── Button.tsx         # 金色主按钮 / Ghost / Secondary
│   │   ├── Badge.tsx          # 标签组件（五行/签文类型）
│   │   ├── Toast.tsx          # Toast 提示
│   │   └── Disclaimer.tsx     # 免责声明栏
│   ├── home/                  # P01 页面组件
│   │   ├── HeroSection.tsx    # 品牌 Logo + 标语
│   │   ├── BirthInput.tsx     # 生辰输入区（4 个选择器 + 性别）
│   │   └── BaziPreview.tsx    # 八字预览行
│   ├── chat/                  # P02 页面组件
│   │   ├── ChatHeader.tsx     # 顶部导航栏
│   │   ├── BaziPanel.tsx      # 八字排盘区（可折叠）
│   │   ├── ChatMessages.tsx   # 对话消息列表
│   │   ├── AiMessage.tsx      # AI 消息气泡（含打字机效果）
│   │   ├── UserMessage.tsx    # 用户消息气泡
│   │   ├── FortuneCards.tsx   # 五维运势卡片组
│   │   ├── FortuneCard.tsx    # 单个运势卡片（手风琴）
│   │   ├── QuickTags.tsx      # 快捷追问标签栏
│   │   ├── ChatInput.tsx      # 输入框 + 发送按钮
│   │   └── TypingIndicator.tsx # "大师正在卜算..." 动画
│   └── share/                 # P03 页面组件
│       ├── ShareOverlay.tsx   # 签文分享 Overlay
│       ├── FortuneCard.tsx    # 签文卡片（3 种风格）
│       ├── StyleSwitcher.tsx  # 风格切换器
│       └── ActionSheet.tsx    # 分享操作面板
├── lib/
│   ├── bazi.ts               # 八字计算封装（基于 lunar-javascript）
│   ├── api.ts                # 后端 API 调用封装
│   └── constants.ts          # 常量（时辰/月份名称/快捷标签等）
├── hooks/
│   ├── useChat.ts            # 对话状态管理 Hook
│   ├── useBazi.ts            # 八字计算 Hook
│   └── useTypewriter.ts      # 打字机效果 Hook
├── types/
│   └── index.ts              # TypeScript 类型定义
├── public/
│   └── icons/                # SVG 图标（八卦/太极/印章等）
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 3.2 页面-组件映射

| 页面 | 组件树 |
|------|--------|
| P01 首页 | `page.tsx` -> HeroSection + BirthInput + BaziPreview + Button + Disclaimer |
| P02 对话页 | `chat/page.tsx` -> ChatHeader + BaziPanel + ChatMessages(AiMessage + UserMessage + FortuneCards + TypingIndicator) + QuickTags + ChatInput + Disclaimer + ShareOverlay(条件渲染) |
| P03 签文分享 | `ShareOverlay` (overlay) -> FortuneCard + StyleSwitcher + ActionSheet + Toast |

### 3.3 状态管理

使用 React Context + Hooks，无需引入外部状态库：

```typescript
// 八字数据 Context（P01 -> P02 传递）
interface BaziContextType {
  birthData: BirthData | null;       // 用户输入的生辰
  baziResult: BaziResult | null;     // 计算后的八字结果
  setBirthData: (data: BirthData) => void;
}

// 对话状态 Hook（P02 内部）
interface ChatState {
  messages: Message[];               // 对话消息列表
  isLoading: boolean;                // AI 是否在响应
  round: number;                     // 当前轮次 (max 20)
  fortuneData: FortuneData | null;   // 五维运势数据
  error: string | null;              // 错误信息
}
```

### 3.4 设计令牌对齐

从 demo.html 提取的 CSS Variables 直接写入 `globals.css`，Tailwind 通过 `@theme` 扩展引用：

```css
/* globals.css */
:root {
  --color-bg-primary: oklch(0.16 0.01 60);
  --color-bg-card: oklch(0.19 0.012 55);
  --color-bg-secondary: oklch(0.22 0.01 55);
  --color-accent-gold: oklch(0.76 0.12 80);
  --color-accent-red: oklch(0.55 0.14 25);
  --color-accent-green: oklch(0.55 0.10 150);
  --color-text-primary: oklch(0.95 0.008 80);
  --color-text-secondary: oklch(0.72 0.01 60);
  --color-text-muted: oklch(0.55 0.008 60);
  --color-text-on-gold: oklch(0.16 0.01 60);
  --font-display: 'LXGW WenKai', 'KaiTi', serif;
  --font-body: 'Noto Serif SC', 'SimSun', serif;
  --font-english: 'Fraunces', 'Georgia', serif;
}
```

### 3.5 关键交互实现

**打字机效果**：
```typescript
// useTypewriter.ts
function useTypewriter(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return displayed;
}
```

**SSE 流式接收**：
```typescript
// useChat.ts 中处理流式响应
async function streamChat(message: string) {
  const response = await fetch('/api/fortune/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, baziData, history }),
  });
  
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // 解析 SSE data: 行，追加到当前消息
    parseSSEChunks(chunk, onToken);
  }
}
```

**签文图片生成**：
```typescript
// 使用 html-to-image 将签文 DOM 导出为 PNG
import { toPng } from 'html-to-image';

async function generateCardImage(element: HTMLElement) {
  const dataUrl = await toPng(element, {
    width: 280 * 2,  // 2x for retina
    height: 497 * 2,
    pixelRatio: 2,
  });
  return dataUrl;
}
```

---

## 4. 后端架构

### 4.1 目录结构

```
backend/
├── src/
│   ├── index.ts              # 入口，Hono app 启动
│   ├── routes/
│   │   ├── fortune.ts        # /api/fortune/* 路由
│   │   └── health.ts         # /api/health 健康检查
│   ├── services/
│   │   ├── llm.ts            # LLM 调用封装（DeepSeek/OpenAI）
│   │   └── prompt.ts         # 算命大师 System Prompt 管理
│   ├── middleware/
│   │   ├── cors.ts           # CORS 配置
│   │   ├── rateLimit.ts      # 简单速率限制（内存计数）
│   │   └── errorHandler.ts   # 全局错误处理
│   ├── validators/
│   │   └── fortune.ts        # Zod 请求校验 Schema
│   └── types/
│       └── index.ts          # 类型定义
├── tsconfig.json
├── package.json
└── .env.example
```

### 4.2 API 设计

#### POST /api/fortune/start

**用途**：发起首次算命，AI 返回开场白 + 五维运势分析（流式 SSE）

**请求**：
```typescript
{
  baziData: {
    yearPillar: { stem: string, branch: string },
    monthPillar: { stem: string, branch: string },
    dayPillar: { stem: string, branch: string },
    hourPillar: { stem: string, branch: string } | null,  // null = 不确定
    fiveElements: { metal: number, wood: number, water: number, fire: number, earth: number },
    summary: string,         // "木旺水相，缺金缺土"
  },
  gender?: 'male' | 'female' | null
}
```

**响应**：SSE 流式输出
```
Content-Type: text/event-stream

data: {"type":"greeting","content":"施主有礼了..."}

data: {"type":"fortune","dimension":"overall","title":"总体运势","summary":"此命木旺水相...","detail":"命主日元甲木..."}

data: {"type":"fortune","dimension":"personality","title":"性格分析","summary":"...","detail":"..."}

data: {"type":"fortune","dimension":"career","title":"事业运","summary":"...","detail":"..."}

data: {"type":"fortune","dimension":"love","title":"感情运","summary":"...","detail":"..."}

data: {"type":"fortune","dimension":"wealth","title":"财运","summary":"...","detail":"..."}

data: [DONE]
```

#### POST /api/fortune/chat

**用途**：对话追问，AI 流式回复

**请求**：
```typescript
{
  message: string,           // 用户消息
  baziData: BaziData,        // 八字数据（每次带上以供 AI 参考）
  history: {                 // 对话历史（前端维护）
    role: 'user' | 'assistant',
    content: string
  }[],
  round: number              // 当前轮次
}
```

**响应**：SSE 流式输出
```
data: {"type":"chat","content":"施主问得好..."}
data: {"type":"chat","content":"观你明年流年运势..."}
...
data: [DONE]
```

**错误响应**：
```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "请稍后再试"
  }
}
```

#### GET /api/health

**用途**：健康检查

**响应**：
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 4.3 System Prompt 设计

```
你是"天机"AI 算命大师，一位仙风道骨、学识渊博的古代术士。

## 角色设定
- 称呼用户为"施主"
- 自称"贫道"
- 说话风格：文言白话混合，优雅而不晦涩，带有智慧和幽默
- 语气：温和、正面、鼓励性，绝不贩卖焦虑

## 核心规则
1. **绝对正面**：所有分析必须积极正面，不给出任何负面断言
2. **娱乐性质**：你的分析仅供娱乐参考，这一点要在必要时提醒用户
3. **专业感**：结合八字术语（天干/地支/五行/十神/纳音等），让用户感受到专业性
4. **个性化**：基于用户提供的八字数据进行分析，不使用通用模板
5. **安全边界**：
   - 不预测具体的负面事件（死亡/疾病/离婚等）
   - 不建议用户基于算命结果做重大决策
   - 如用户表现出心理困扰，建议寻求专业帮助

## 首次分析格式
收到八字数据后，请严格按以下 JSON 格式输出五维分析：

<format>
{greeting}（开场白，100字左右）
---FORTUNE_START---
{"dimension":"overall","title":"总体运势","summary":"50-100字摘要","detail":"150-300字详细分析"}
---FORTUNE_SEP---
{"dimension":"personality","title":"性格分析","summary":"...","detail":"..."}
---FORTUNE_SEP---
{"dimension":"career","title":"事业运","summary":"...","detail":"..."}
---FORTUNE_SEP---
{"dimension":"love","title":"感情运","summary":"...","detail":"..."}
---FORTUNE_SEP---
{"dimension":"wealth","title":"财运","summary":"...","detail":"..."}
---FORTUNE_END---
</format>

## 追问回复
- 每次回复 100-300 字
- 结合八字数据给出有针对性的分析
- 保持角色一致性
```

### 4.4 LLM 调用封装

```typescript
// services/llm.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || 'https://api.deepseek.com',
});

export async function* streamChat(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<string> {
  const stream = await client.chat.completions.create({
    model: process.env.LLM_MODEL || 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
    temperature: 0.8,     // 稍高温度增加创造性
    max_tokens: 2000,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}
```

### 4.5 速率限制

简单的内存计数器，按 IP 限制：
- 每个 IP 每分钟最多 10 次请求
- 超限返回 429 状态码
- 无需 Redis（MVP 阶段单实例足够）

### 4.6 环境变量

```env
# .env.example
LLM_API_KEY=sk-xxx              # DeepSeek 或 OpenAI API Key
LLM_BASE_URL=https://api.deepseek.com  # API 基地址
LLM_MODEL=deepseek-chat         # 模型名称
PORT=3001                       # 后端端口
FRONTEND_URL=http://localhost:3000  # 前端地址（CORS 白名单）
```

---

## 5. 共享类型定义

```typescript
// shared/types.ts

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
  month: number;     // 1-12
  day: number;       // 1-30
  hour: number;      // 0-12 (12 个时辰，-1 = 不确定)
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
  fortunes?: FortuneItem[];  // 首条 AI 消息包含五维运势
  timestamp: number;
}

/** 签文数据 */
export interface FortuneSign {
  style: 'ink-gold' | 'cinnabar' | 'ink-wash';
  type: string;          // "上上签" | "上签" | "中上签"
  keywords: string[];
  poem: string;
  interpretation: string;
  dateLunar: string;
  dateSolar: string;
}

/** SSE 事件类型 */
export type SSEEvent =
  | { type: 'greeting'; content: string }
  | { type: 'fortune'; dimension: FortuneDimension; title: string; summary: string; detail: string }
  | { type: 'chat'; content: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

/** API 错误响应 */
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
```

---

## 6. 开发计划

### 6.1 模块划分

| 模块 | 范围 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| M0: 项目骨架 | 前后端脚手架、设计令牌、基础组件 | 小 | 无 |
| M1: 八字输入 + 计算 | P01 页面 + lunar-javascript 集成 | 中 | M0 |
| M2: 后端 AI 对话 | LLM 调用 + SSE 流式 + Prompt | 中 | M0 |
| M3: 对话页面 | P02 页面 + 流式对接 + 五维卡片 | 大 | M1, M2 |
| M4: 签文分享 | P03 签文生成 + 图片导出 + 分享 | 中 | M3 |
| M5: 集成测试 | E2E 测试 + 联调 | 中 | M1-M4 |

### 6.2 开发顺序

```
M0（骨架） → M1（八字输入） ──→ M3（对话页面） → M4（签文分享） → M5（测试）
              ↗                ↗
M0（骨架） → M2（后端AI对话） ─┘
```

M1 和 M2 可并行开发，M3 依赖两者完成。

### 6.3 验收标准（对照 PRD）

| PRD 需求 | 验收条件 | 对应模块 |
|----------|---------|---------|
| 3.1 生辰八字输入 | 4 个选择器可用，八字实时计算正确，500ms 内跳转 | M1 |
| 3.2 AI 对话式算命 | 首次分析 <3s，打字机效果，20 轮上限，重试机制 | M2+M3 |
| 3.3 算命结果展示 | 五维卡片展示，手风琴展开/折叠，图标+颜色正确 | M3 |
| 3.4 结果分享 | 签文卡片 9:16，3 种风格，保存/分享功能 | M4 |
| 非功能-性能 | 首屏 <2s，AI 响应 <3s，签文生成 <2s | 全部 |
| 非功能-安全 | 不存储用户数据，HTTPS，免责声明 | 全部 |
| 非功能-兼容 | 移动端优先，最小 320px | 全部 |

---

## 7. 部署方案

### 7.1 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./code/frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    depends_on:
      - backend

  backend:
    build: ./code/backend
    ports:
      - "3001:3001"
    env_file:
      - ./code/backend/.env
```

### 7.2 本地开发

```bash
# 后端
cd code/backend
cp .env.example .env  # 填入 LLM_API_KEY
pnpm install
pnpm dev              # http://localhost:3001

# 前端
cd code/frontend
pnpm install
pnpm dev              # http://localhost:3000
```

---

## 8. 已知限制与后续迭代

| 限制 | 说明 | 后续计划 |
|------|------|---------|
| 无用户系统 | MVP 不需要登录 | P2 迭代可加 |
| 无历史记录持久化 | 仅 localStorage | P2 需求 |
| 单实例部署 | 速率限制用内存计数 | 生产环境换 Redis |
| 八字精度 | lunar-javascript 基础精度 | 可对接专业八字 API |
| 签文内容固定 | 前端 3 套预设 + AI 生成 | 可扩展更多模板 |
