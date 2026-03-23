# KnowBase 技术架构设计文档

> 版本：v1.0
> 作者：Tech Architect Agent
> 日期：2026-03-23
> 依据：PRD v1.0 + page-specs v1.2
> 状态：初版

---

## 目录

1. [技术选型调研与决策](#1-技术选型调研与决策)
2. [系统架构总览](#2-系统架构总览)
3. [项目目录结构](#3-项目目录结构)
4. [完整 API 接口设计](#4-完整-api-接口设计)
5. [完整数据库设计](#5-完整数据库设计)
6. [前端组件架构](#6-前端组件架构)
7. [开发任务拆解](#7-开发任务拆解)

---

## 1. 技术选型调研与决策

### 1.1 前端框架

#### 调研结果

搜索 2025-2026 年前端框架生态，聚焦 AI 应用场景（流式输出、对话 UI、SSR）。

#### 候选方案对比矩阵

| 维度 | Next.js 16 (React 19) | SvelteKit 2 (Svelte 5) | Nuxt 4 (Vue 3.5) |
|------|----------------------|------------------------|-------------------|
| AI 工具链生态 | **最强**：Vercel AI SDK 6（20M+月下载）、assistant-ui、CopilotKit | 中等：有社区 adapter，无官方 AI SDK | 中等：有社区方案，生态弱于 React |
| 流式 UI 支持 | **原生**：React Server Components + Suspense streaming + useChat hook | 良好：原生 streaming，但需手写 | 良好：Nitro 引擎支持 streaming |
| SSR/PPR | PPR（Partial Prerendering）GA，静态壳+流式动态内容 | SSR 成熟，无 PPR 等价方案 | Nitro 引擎 SSR，Hybrid Rendering |
| 生态成熟度 | **最高**：shadcn/ui、Radix、Tailwind 生态完整 | 增长快但组件库少，Skeleton UI 为主 | 较好：Nuxt UI、PrimeVue |
| 包体积 | React Compiler 自动优化，较 v15 提升明显 | **最小**：50-70% less JS than React | 中等 |
| 学习曲线 | 中等（RSC 概念需适应） | 低（Runes 系统简洁） | 低（Vue 上手快） |
| 生产案例 | Netflix、Notion、TikTok | 增长中，大型案例偏少 | 成熟，企业级案例多 |
| 社区招聘 | **最容易** | 较难 | 中等 |

#### 最终推荐

**Next.js 16 + React 19 + TypeScript 5.7**

**理由**：
1. Vercel AI SDK 6 提供了开箱即用的 `useChat` hook，原生支持流式输出、RAG 中间件、多 provider 切换，与产品核心场景（AI 问答 + 流式回答）完美契合
2. React Server Components 让引用来源预览、知识条目渲染等可在服务端完成，首屏性能更优
3. shadcn/ui + Radix UI 提供无障碍组件基础，满足 PRD 的 WCAG 2.1 AA 要求
4. PPR（Partial Prerendering）让知识库列表页静态壳秒出，动态数据流式加载

**版本**：Next.js 16.x / React 19.x / TypeScript 5.7.x

#### 风险与应对

| 风险 | 应对 |
|------|------|
| RSC 学习曲线 | 团队需 1 周 RSC 专项培训；组件默认 Server，仅交互组件加 "use client" |
| Vercel 平台锁定 | 架构上保持 self-host 能力，避免深度依赖 Vercel 特有 API |
| 包体积增长 | React Compiler 自动 memoization + 动态导入拆分 |

---

### 1.2 后端框架

#### 调研结果

RAG 应用的后端需要：(1) 文件解析（CPU 密集）(2) 向量化与检索 (3) LLM 调用（IO 密集）(4) 流式 SSE 输出。Python 在 AI/ML 生态（LangChain、LlamaIndex、Hugging Face）方面无可替代。

#### 候选方案对比矩阵

| 维度 | FastAPI (Python) | Hono (Node/Bun) | Next.js API Routes | Django |
|------|-----------------|------------------|---------------------|--------|
| AI/ML 生态 | **最强**：LangChain、LlamaIndex、Transformers 原生支持 | 弱：需通过 HTTP 调用 Python 服务 | 中等：Vercel AI SDK 原生 | 弱 |
| 文件解析库 | **最全**：Docling、Unstructured、pdfplumber、python-docx | 有限 | 有限 | 同 FastAPI |
| 异步性能 | async/await 原生支持，Uvicorn ASGI | **最快**：72K QPS（无验证） | 中等 | 同步为主 |
| 流式 SSE | StreamingResponse 原生支持 | 原生支持 | 原生支持 | 需额外配置 |
| 类型安全 | Pydantic v2（自动 Schema 生成） | Zod 验证 | TypeScript 原生 | DRF Serializer |
| 学习曲线 | 低 | 低 | 最低（与前端同栈） | 中等 |
| 生产部署 | Uvicorn + Gunicorn，成熟 | Bun/Node，新但稳定 | Vercel/自托管 | 成熟 |

#### 最终推荐

**双层架构：Next.js API Routes（BFF 层）+ FastAPI（AI/RAG 核心服务）**

**理由**：
1. Next.js API Routes 作为 BFF（Backend for Frontend），处理认证、会话、前端数据聚合
2. FastAPI 作为 AI Core Service，专注文件解析、向量化、RAG 检索、LLM 调用
3. 前端 -> BFF 使用 Vercel AI SDK 的 `useChat` 直连，体验最优
4. BFF -> FastAPI 内部通信走 HTTP/gRPC，职责清晰

**版本**：FastAPI 0.115.x / Python 3.12 / Pydantic v2

#### 风险与应对

| 风险 | 应对 |
|------|------|
| 双语言栈增加复杂度 | Docker Compose 统一编排；CI/CD 管道分离但统一触发 |
| Python 并发瓶颈 | 文件解析用 Celery + Redis 异步任务队列 |
| 内部通信延迟 | 同一 VPC 内通信延迟 <1ms；关键路径用 SSE 透传 |

---

### 1.3 向量数据库

#### 调研结果

对比 2026 年主流向量数据库的性能基准测试、RAG 场景适配度和运维成本。

#### 候选方案对比矩阵

| 维度 | Qdrant | pgvector (PostgreSQL) | Milvus | Weaviate |
|------|--------|----------------------|--------|----------|
| 性能（50M 向量） | 41 QPS@99% recall | 471 QPS（pgvectorscale） | **最快**：亚毫秒级 | 良好 |
| 性能（<1M 向量） | 优秀 | **足够** | 优秀 | 优秀 |
| 混合搜索 | 支持（密集+稀疏） | 全文检索 + 向量（原生 PostgreSQL） | 支持 | **最佳**：BM25 + 向量单 API |
| Payload 过滤 | **最强**：复合过滤无性能损耗 | SQL WHERE + 向量搜索 | 支持 | 支持 |
| 运维复杂度 | 中等（独立服务） | **最低**：复用已有 PostgreSQL | 高（分布式架构） | 中等 |
| 成本 | 开源免费 | **最低**：PostgreSQL 扩展 | 开源免费 | 开源免费 |
| 多租户隔离 | Collection 级别 | Schema/RLS 原生支持 | Collection 级别 | **最佳**：原生多租户 |
| 自托管难度 | Docker 单容器 | 已有 PostgreSQL 直接加扩展 | 需 etcd/MinIO/Pulsar 三依赖 | Docker 单容器 |

#### 最终推荐

**PostgreSQL 16 + pgvector 0.8 + pg_bm25（混合检索）**

**理由**：
1. KnowBase MVP 阶段数据规模在 10 万向量以内（单用户 100 文档 x 平均 50 chunk = 5000 向量，1000 用户 = 50 万），pgvector 性能完全足够
2. 关系数据（用户、知识空间、文档元数据）和向量数据共用一个 PostgreSQL 实例，运维成本最低
3. 利用 PostgreSQL 原生 RLS（Row Level Security）实现用户数据隔离，完美满足 PRD 安全需求
4. 混合检索：pgvector HNSW 索引做向量相似度 + pg_bm25 做关键词检索，结合 RRF 融合排序
5. 后期规模增长可平滑迁移到 Qdrant（架构预留接口抽象层）

**版本**：PostgreSQL 16.x / pgvector 0.8.x

#### 风险与应对

| 风险 | 应对 |
|------|------|
| 大规模性能瓶颈 | 架构设计 VectorStore 抽象接口，后期可切换到 Qdrant |
| HNSW 索引构建慢 | 异步建索引，不阻塞写入 |
| 无 GPU 加速 | MVP 阶段无需 GPU；后期可引入 pgvectorscale |

---

### 1.4 LLM 集成

#### 调研结果

2026 年 LLM API 价格同比下降约 80%，主流模型能力趋同，关键差异在中文能力、长上下文和 RAG 适配。

#### 候选方案对比矩阵

| 维度 | Claude Sonnet 4 (Anthropic) | GPT-5 (OpenAI) | Gemini 2.5 Pro (Google) | DeepSeek-V3 |
|------|---------------------------|----------------|----------------------|-------------|
| 定价（$/M tokens） | 入 $3 / 出 $15 | 入 $1.25 / 出 $10 | 入 $1.25 / 出 $10 | 入 $0.27 / 出 $1.10 |
| 中文能力 | 优秀 | 优秀 | 良好 | **最佳** |
| 长上下文 | 200K tokens | 128K tokens | **1M tokens** | 128K tokens |
| RAG 适配 | 优秀：引用生成准确 | 优秀 | 优秀：内置 grounding | 良好 |
| 流式输出 | SSE 原生 | SSE 原生 | SSE 原生 | SSE 原生 |
| Prompt Caching | 支持（省 90%） | 支持 | 支持 | 支持 |
| 稳定性 | 高 | **最高** | 高 | 中等 |
| 合规性 | SOC2/HIPAA | SOC2/HIPAA | SOC2 | 中国数据合规 |

#### 最终推荐

**多 Provider 策略（Vercel AI SDK 统一抽象）**

- **主力模型**：Claude Sonnet 4 -- RAG 问答质量最优，引用生成准确
- **降级模型**：Gemini 2.5 Flash -- 成本仅 $0.30/$2.50，用于标签生成、摘要等轻量任务
- **统一接入**：Vercel AI SDK 6 的 Provider Registry，一行代码切换模型

**Embedding 模型**：**BGE-M3**（自部署）
- 支持 100+ 语言，中文检索精度最优
- 同时输出 dense + sparse + multi-vector 三种表示，支持混合检索
- 1024 维度，8192 tokens 上下文
- 开源免费，可自部署控制成本

**版本**：AI SDK 6.x / BGE-M3 latest

#### 风险与应对

| 风险 | 应对 |
|------|------|
| API 服务中断 | Provider fallback 链：Claude -> GPT-5 -> Gemini |
| 成本失控 | 按用户计量配额（免费版 200 次/月）；轻量任务用 Gemini Flash |
| 模型幻觉 | RAG 检索相关度阈值过滤；无相关资料时明确告知用户 |

---

### 1.5 文件解析

#### 调研结果

评估 2026 年主流文档解析方案在 PDF、Word、表格、OCR 等场景的准确率和性能。

#### 候选方案对比矩阵

| 维度 | Docling (IBM) | Unstructured | LlamaParse | 自研 (pymupdf+python-docx) |
|------|-------------|--------------|------------|---------------------------|
| PDF 表格精度 | **97.9%** | 75%（复杂表格） | 90% | 60-70% |
| 格式支持 | PDF/Word/PPT/HTML/MD | **最全**：20+ 格式 | PDF/Word/PPT/HTML | 需逐格式集成 |
| OCR 能力 | 内置（Tesseract） | 内置（hi-res 模式） | 云端 OCR | 需集成 Tesseract |
| 部署方式 | **本地部署**，开源免费 | 本地/云端均可 | **云端 API**（10K 免费/月） | 本地 |
| 处理速度 | 中等 | 中等 | **最快**（~6s/文档） | 快（无 ML） |
| 成本 | 免费 | 免费/付费版 | 免费额度后收费 | 免费 |
| 中文支持 | 良好 | 良好 | 良好 | 依赖配置 |

#### 最终推荐

**Docling（主力）+ 轻量级自研补充**

**理由**：
1. Docling 表格提取精度 97.9%，满足 PRD 中 Excel 表格语义保留需求
2. 开源免费，本地部署，用户数据不出服务器，满足隐私要求
3. 支持 PDF、Word、PPT、HTML、Markdown 全覆盖
4. 对纯文本 (.txt/.md) 和简单格式用自研解析（无需 ML 模型），减少资源消耗

**网页抓取**：**Firecrawl**（自部署版）
- 输出高质量 Markdown，保留标题层级，适合 RAG 分块
- 自动去除导航栏、广告等噪音
- 开源可自部署

**版本**：Docling 2.x / Firecrawl latest (self-hosted)

#### 风险与应对

| 风险 | 应对 |
|------|------|
| Docling 解析慢 | Celery 异步任务队列，PRD 允许 60s 解析时间 |
| 内存占用高 | Docker 容器限制内存 + 文件大小 50MB 上限 |
| 特殊 PDF 解析失败 | fallback 到 pymupdf 基础文本提取 + 用户通知 |

---

### 1.6 认证方案

#### 调研结果

评估 2026 年认证服务的 Next.js 集成度、OAuth 支持、多租户能力和成本。注意：Lucia Auth 已于 2025 年 3 月废弃，不纳入评估。

#### 候选方案对比矩阵

| 维度 | Auth.js v5 (NextAuth) | Clerk | Supabase Auth |
|------|----------------------|-------|---------------|
| Next.js 集成 | 原生（同团队维护） | **最优**：App Router + Middleware + Server Components | 良好（SSR 包） |
| OAuth 支持 | **最全**：80+ Provider | 主流 Provider | 主流 Provider |
| 微信登录 | 需自写 Provider | 需自写 | 需自写 |
| 自托管 | **完全自托管** | 不可自托管 | 可自托管 |
| 免费额度 | **完全免费** | 10K MAU 免费 | 50K MAU 免费 |
| 预制 UI 组件 | 无（需自建） | **最优**：SignIn/SignUp 组件 | 有（Auth UI） |
| MFA/2FA | 社区插件 | 原生支持 | 原生支持 |
| 数据库耦合 | 需自配 adapter | 托管 | PostgreSQL |

#### 最终推荐

**Auth.js v5（NextAuth v5）**

**理由**：
1. 完全自托管，用户认证数据不依赖第三方，满足 PRD 隐私政策
2. 与 Next.js 同团队维护，App Router/RSC/Middleware 深度集成
3. 完全免费，无 MAU 限制
4. 支持 80+ OAuth Provider；微信登录可通过自定义 Provider 实现
5. Drizzle ORM adapter 直连 PostgreSQL，认证数据与业务数据统一

**版本**：Auth.js 5.x

#### 风险与应对

| 风险 | 应对 |
|------|------|
| 无预制 UI | 基于 shadcn/ui 自建登录/注册表单（page-specs 已有详细设计） |
| MFA 需额外开发 | MVP 不含 MFA（PRD 标注 Pro 版），后续迭代实现 |
| Session 管理 | JWT + Database session 混合策略 |

---

### 1.7 部署与基础设施

#### 调研结果

评估 2026 年 AI 应用部署平台的成本、灵活性和 AI 工作负载支持。

#### 候选方案对比矩阵

| 维度 | Vercel + Railway | Railway 全栈 | Fly.io + Vercel | 自建 VPS |
|------|-----------------|-------------|-----------------|---------|
| 前端部署 | Vercel（Next.js 原生） | 支持但非最优 | Vercel | 需配置 Nginx |
| 后端部署 | Railway（Docker） | Railway（Docker） | Fly.io（Docker） | Docker Compose |
| 冷启动 | Vercel 边缘快；Railway 无冷启动 | 无冷启动 | 无冷启动 | 无 |
| 成本（MVP） | ~$25/月 | ~$15/月 | ~$20/月 | ~$40/月 |
| 扩展性 | 按需自动扩展 | 按需扩展 | 全球边缘 | 手动 |
| Docker 支持 | Railway 原生 | 原生 | 原生 | 原生 |
| 数据库托管 | Railway PostgreSQL | Railway PostgreSQL | Fly.io PostgreSQL | 自管 |
| 运维复杂度 | **最低** | 低 | 中等 | 高 |

#### 最终推荐

**Vercel（前端）+ Railway（后端 + 数据库 + 队列）**

**理由**：
1. Vercel 是 Next.js 的原生部署平台，PPR/RSC/Edge 等特性开箱即用
2. Railway 提供 Docker 容器部署，适合 FastAPI 服务 + Celery Worker + Redis
3. Railway 托管 PostgreSQL（含 pgvector），免去数据库运维
4. 两者均按用量计费，MVP 阶段月成本 $20-30

**对象存储**：**Cloudflare R2**
- 零出口费用，存储成本 $0.015/GB/月
- S3 API 兼容，代码无需修改
- 全球 CDN 加速文件下载/预览

**版本**：Vercel Pro / Railway Starter / Cloudflare R2

#### 风险与应对

| 风险 | 应对 |
|------|------|
| Vercel 供应商锁定 | Next.js 保持 self-host 兼容；关键逻辑不用 Vercel 独有 API |
| Railway 稳定性 | 生产环境后可迁移到 AWS ECS/Fly.io |
| 跨平台网络延迟 | Vercel 和 Railway 同区域部署（US East） |

---

## 2. 系统架构总览

### 2.1 系统架构图

```
                              ┌─────────────────────────────────────┐
                              │           用户终端层                  │
                              │                                     │
                              │  ┌─────────┐  ┌──────────────────┐  │
                              │  │ Web App  │  │ Chrome Extension │  │
                              │  │(Browser) │  │  (剪藏插件 P1)   │  │
                              │  └────┬─────┘  └───────┬──────────┘  │
                              └───────┼────────────────┼─────────────┘
                                      │    HTTPS       │
                              ┌───────▼────────────────▼─────────────┐
                              │        Vercel Edge Network            │
                              │      (CDN + Edge Functions)           │
                              └───────────────┬──────────────────────┘
                                              │
                    ┌─────────────────────────▼──────────────────────────┐
                    │              Next.js 16 (BFF 层)                    │
                    │                                                    │
                    │  ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
                    │  │ Auth.js  │ │ API      │ │ Vercel AI SDK 6   │  │
                    │  │ (认证)   │ │ Routes   │ │ (SSE 流式代理)    │  │
                    │  └──────────┘ └──────────┘ └───────────────────┘  │
                    │                                                    │
                    │  RSC Rendering │ Session Mgmt │ Rate Limiting     │
                    └────────┬──────────────┬──────────────┬─────────────┘
                             │              │              │
                    ─────────┼──────────────┼──────────────┼───── Railway VPC
                             │              │              │
                    ┌────────▼──────────────▼──────────────▼─────────────┐
                    │              FastAPI (AI Core Service)              │
                    │                                                    │
                    │  ┌────────────┐ ┌─────────────┐ ┌──────────────┐  │
                    │  │ RAG Engine │ │ File Parser  │ │ Search       │  │
                    │  │ (检索+生成)│ │ (Docling)    │ │ (混合检索)   │  │
                    │  └─────┬──────┘ └──────┬───────┘ └──────┬───────┘  │
                    │        │               │                │          │
                    │  ┌─────▼──────┐ ┌──────▼───────┐ ┌─────▼───────┐  │
                    │  │ LLM Router │ │ Embedding    │ │ Tag/Summary │  │
                    │  │ (多Provider)│ │ (BGE-M3)    │ │ Generator   │  │
                    │  └────────────┘ └──────────────┘ └─────────────┘  │
                    └────────┬──────────────┬──────────────┬─────────────┘
                             │              │              │
             ┌───────────────┼──────────────┼──────────────┼────────────┐
             │               │              │              │            │
     ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌────▼─────┐     │
     │ PostgreSQL 16│ │ Redis 7    │ │Cloudflare  │ │ LLM APIs │     │
     │ + pgvector   │ │ (缓存+队列)│ │ R2         │ │ Claude/  │     │
     │ + pg_bm25    │ │ + Celery   │ │(文件存储)  │ │ Gemini   │     │
     │              │ │            │ │            │ │          │     │
     │ 用户数据      │ │ 会话缓存   │ │ 原始文件   │ │ RAG 生成  │     │
     │ 文档元数据    │ │ 任务队列   │ │ 文件预览   │ │ 标签生成  │     │
     │ 向量索引      │ │ 限流计数   │ │ 用户头像   │ │ 摘要生成  │     │
     └──────────────┘ └────────────┘ └────────────┘ └──────────┘     │
             │                                                        │
             └────────────────────────────────────────────────────────┘
                                Railway VPC
```

### 2.2 核心数据流

#### 数据流 1：文件上传与解析

```
用户上传文件
    │
    ▼
Next.js BFF (Auth 校验 + 文件大小/格式校验)
    │
    ├──► Cloudflare R2 (存储原始文件)
    │
    ▼
FastAPI (POST /api/documents) ──► 返回 document_id
    │
    ▼
Celery Worker 异步任务：
    ├── 1. Docling 解析文件 → 提取文本段落
    ├── 2. BGE-M3 生成向量 → 写入 pgvector
    ├── 3. LLM 生成标签/摘要 → 更新 PostgreSQL
    └── 4. 更新文档状态为 "ready"
```

#### 数据流 2：AI 问答（RAG）

```
用户提问
    │
    ▼
Next.js useChat hook ──► API Route (SSE stream)
    │
    ▼
FastAPI RAG Engine：
    ├── 1. BGE-M3 将问题向量化
    ├── 2. pgvector 混合检索 (向量相似度 + BM25 关键词)
    ├── 3. 重排序 (Reranker) → Top-K 相关段落
    ├── 4. 构建 Prompt (系统提示 + 相关段落 + 对话历史)
    ├── 5. LLM 流式生成回答 (含引用标注 [1][2])
    └── 6. SSE 逐 token 返回前端
    │
    ▼
前端 useChat 自动更新 UI (打字机效果)
```

#### 数据流 3：语义搜索

```
用户输入搜索词
    │
    ▼
Next.js API Route → FastAPI：
    ├── 1. BGE-M3 将搜索词向量化
    ├── 2. pgvector 混合检索 + RLS 过滤（仅搜当前用户数据）
    ├── 3. 返回 Top-20 结果（含匹配段落 + 相关度评分）
    └── 4. 高亮关键词
    │
    ▼
搜索结果列表渲染
```

---

## 3. 项目目录结构

```
knowbase/
├── apps/
│   ├── web/                          # Next.js 16 前端 + BFF
│   │   ├── app/                      # App Router
│   │   │   ├── (auth)/               # 认证路由组
│   │   │   │   ├── login/page.tsx    # P-01 登录页
│   │   │   │   └── register/page.tsx # P-01 注册页
│   │   │   ├── (main)/              # 主应用路由组（需登录）
│   │   │   │   ├── layout.tsx       # AppShell (TopBar + SideNav)
│   │   │   │   ├── chat/            # P-02 AI 问答页
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [conversationId]/page.tsx
│   │   │   │   ├── knowledge/       # P-03 知识库列表页
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [itemId]/    # P-04 知识条目详情页
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── search/          # P-05 搜索结果页
│   │   │   │   │   └── page.tsx
│   │   │   │   └── settings/        # P-08 设置页
│   │   │   │       ├── page.tsx
│   │   │   │       ├── spaces/      # P-07 知识空间管理
│   │   │   │       │   └── page.tsx
│   │   │   │       └── export/page.tsx
│   │   │   ├── api/                 # API Routes (BFF)
│   │   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js
│   │   │   │   ├── chat/route.ts                # AI 问答 SSE 代理
│   │   │   │   ├── documents/
│   │   │   │   │   ├── route.ts                 # 文档 CRUD
│   │   │   │   │   ├── upload/route.ts          # 文件上传
│   │   │   │   │   └── [id]/route.ts            # 单文档操作
│   │   │   │   ├── search/route.ts              # 语义搜索
│   │   │   │   ├── spaces/route.ts              # 知识空间
│   │   │   │   ├── feedback/route.ts            # 反馈收集
│   │   │   │   └── export/route.ts              # 数据导出
│   │   │   ├── layout.tsx           # 根 layout
│   │   │   └── globals.css
│   │   ├── components/              # 前端组件
│   │   │   ├── layout/              # 布局组件
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   ├── SideNav.tsx
│   │   │   │   └── UserAvatarMenu.tsx
│   │   │   ├── chat/               # 聊天组件
│   │   │   │   ├── ChatMessages.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── AIResponseCard.tsx
│   │   │   │   ├── CitationPill.tsx
│   │   │   │   ├── CitationSourceItem.tsx
│   │   │   │   ├── FeedbackButtons.tsx
│   │   │   │   └── SpaceSelector.tsx
│   │   │   ├── knowledge/          # 知识库组件
│   │   │   │   ├── KnowledgeItemCard.tsx
│   │   │   │   ├── KnowledgeListView.tsx
│   │   │   │   ├── ItemDetail.tsx
│   │   │   │   ├── TagChip.tsx
│   │   │   │   └── FileFormatIcon.tsx
│   │   │   ├── search/             # 搜索组件
│   │   │   │   ├── GlobalSearchBox.tsx
│   │   │   │   ├── SearchSuggestionDropdown.tsx
│   │   │   │   └── SearchResultItem.tsx
│   │   │   ├── upload/             # 上传组件
│   │   │   │   ├── UploadModal.tsx
│   │   │   │   ├── UploadDropzone.tsx
│   │   │   │   ├── UploadStatusBar.tsx
│   │   │   │   └── FileList.tsx
│   │   │   └── shared/             # 通用组件
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── SkeletonLoader.tsx
│   │   │       ├── Toast.tsx
│   │   │       └── Pagination.tsx
│   │   ├── lib/                    # 工具库
│   │   │   ├── auth.ts             # Auth.js 配置
│   │   │   ├── api-client.ts       # FastAPI 客户端
│   │   │   ├── upload.ts           # 上传逻辑（R2 presigned URL）
│   │   │   └── utils.ts
│   │   ├── hooks/                  # 自定义 Hooks
│   │   │   ├── useUpload.ts
│   │   │   ├── useSearch.ts
│   │   │   └── useKeyboardShortcut.ts
│   │   ├── styles/                 # 样式
│   │   │   └── tokens.css          # 设计 token (色彩/间距)
│   │   ├── public/                 # 静态资源
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                        # FastAPI AI Core Service
│       ├── app/
│       │   ├── main.py             # FastAPI 入口
│       │   ├── config.py           # 配置管理
│       │   ├── dependencies.py     # 依赖注入
│       │   ├── routers/
│       │   │   ├── documents.py    # 文档管理接口
│       │   │   ├── chat.py         # AI 问答接口
│       │   │   ├── search.py       # 语义搜索接口
│       │   │   ├── spaces.py       # 知识空间接口
│       │   │   └── webhooks.py     # 网页抓取回调
│       │   ├── services/
│       │   │   ├── rag_engine.py          # RAG 检索+生成
│       │   │   ├── document_parser.py     # 文件解析调度
│       │   │   ├── embedding_service.py   # BGE-M3 向量化
│       │   │   ├── vector_store.py        # 向量存储抽象层
│       │   │   ├── llm_service.py         # LLM 多 Provider 路由
│       │   │   ├── web_scraper.py         # 网页抓取 (Firecrawl)
│       │   │   ├── tag_generator.py       # 自动标签生成
│       │   │   └── file_storage.py        # R2 文件管理
│       │   ├── models/
│       │   │   ├── database.py    # SQLAlchemy 模型
│       │   │   └── schemas.py     # Pydantic Schema
│       │   ├── tasks/
│       │   │   ├── celery_app.py  # Celery 配置
│       │   │   ├── parse_task.py  # 异步解析任务
│       │   │   └── embed_task.py  # 异步向量化任务
│       │   └── utils/
│       │       ├── chunking.py    # 文本分块策略
│       │       ├── reranker.py    # 重排序
│       │       └── prompts.py     # Prompt 模板
│       ├── tests/
│       ├── Dockerfile
│       ├── requirements.txt
│       └── pyproject.toml
│
├── packages/                       # 共享包
│   └── shared-types/               # 前后端共享类型定义
│       ├── src/
│       │   ├── api.ts              # API 请求/响应类型
│       │   └── models.ts           # 数据模型类型
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml              # 本地开发编排
├── docker-compose.prod.yml         # 生产部署编排
├── turbo.json                      # Turborepo 配置
├── package.json                    # workspace root
├── pnpm-workspace.yaml
└── .env.example
```

---

## 4. 完整 API 接口设计

### 4.1 BFF 层 API (Next.js API Routes)

> 所有接口需通过 Auth.js session 认证，未登录返回 401。

#### 4.1.1 认证相关

```
POST   /api/auth/signin          # 邮箱登录
POST   /api/auth/signup           # 邮箱注册
POST   /api/auth/signout          # 退出登录
GET    /api/auth/session          # 获取当前会话
GET    /api/auth/providers        # 获取 OAuth Provider 列表
POST   /api/auth/callback/:provider  # OAuth 回调
POST   /api/auth/forgot-password  # 忘记密码
POST   /api/auth/reset-password   # 重置密码
```

> 认证由 Auth.js v5 处理，以上路由由 `[...nextauth]/route.ts` 自动生成。

#### 4.1.2 文档管理

**上传文件**

```
POST /api/documents/upload
Content-Type: multipart/form-data

Request:
  file: File                    # 文件（最大 50MB）
  spaceId?: string              # 目标知识空间 ID（默认 "default"）

Response 200:
{
  "id": "doc_abc123",
  "fileName": "report.pdf",
  "fileType": "pdf",
  "fileSize": 3200000,
  "status": "processing",       # processing | ready | failed
  "spaceId": "sp_001",
  "uploadedAt": "2026-03-23T10:30:00Z"
}

Error 400: { "error": "FILE_TOO_LARGE", "message": "文件过大(超过50MB)，请拆分后上传" }
Error 400: { "error": "UNSUPPORTED_FORMAT", "message": "暂不支持该格式，当前支持：PDF、Word、Markdown、纯文本、网页链接" }
Error 413: { "error": "PAYLOAD_TOO_LARGE" }
```

**保存网页 URL**

```
POST /api/documents/url
Content-Type: application/json

Request:
{
  "url": "https://example.com/article",
  "spaceId?": "sp_001"
}

Response 200:
{
  "id": "doc_def456",
  "title": "文章标题（自动提取）",
  "fileType": "web",
  "originalUrl": "https://example.com/article",
  "status": "processing",
  "spaceId": "sp_001",
  "uploadedAt": "2026-03-23T10:30:00Z"
}

Error 400: { "error": "INVALID_URL", "message": "请输入有效的网页链接" }
Error 400: { "error": "URL_NOT_ACCESSIBLE", "message": "该网页无法访问，请检查链接是否有效" }
```

**获取文档列表**

```
GET /api/documents?spaceId=sp_001&type=pdf&tag=市场分析&sort=uploadedAt&order=desc&page=1&limit=20

Response 200:
{
  "items": [
    {
      "id": "doc_abc123",
      "title": "2025年Q4财务分析报告",
      "fileType": "pdf",
      "fileSize": 3200000,
      "summary": "本报告详细分析了...(前200字)",
      "tags": [
        { "id": "tag_1", "label": "财务分析", "isAI": true },
        { "id": "tag_2", "label": "Q4", "isAI": true }
      ],
      "spaceName": "Q1 竞品分析项目",
      "status": "ready",
      "uploadedAt": "2026-03-18T10:30:00Z"
    }
  ],
  "total": 79,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

**获取文档详情**

```
GET /api/documents/:id

Response 200:
{
  "id": "doc_abc123",
  "title": "2025年Q4财务分析报告",
  "fileName": "2025-Q4-Financial-Report.pdf",
  "fileType": "pdf",
  "fileSize": 3200000,
  "pageCount": 28,
  "originalUrl": null,
  "space": { "id": "sp_001", "name": "Q1 竞品分析项目" },
  "tags": [
    { "id": "tag_1", "label": "财务分析", "isAI": true },
    { "id": "tag_2", "label": "重点关注", "isAI": false }
  ],
  "extractedContent": [
    {
      "paragraphId": "p1",
      "heading": "一、Q4 整体业绩概览",
      "content": "2025 年第四季度..."
    }
  ],
  "previewUrl": "https://r2.knowbase.app/previews/doc_abc123.pdf",
  "downloadUrl": "https://r2.knowbase.app/files/doc_abc123/original.pdf",
  "status": "ready",
  "uploadedAt": "2026-03-18T10:30:00Z",
  "citedInConversations": [
    { "conversationId": "conv_001", "title": "Q4 销售数据分析" }
  ]
}

Error 404: { "error": "NOT_FOUND" }
```

**删除文档**

```
DELETE /api/documents/:id

Response 200: { "success": true }

Error 404: { "error": "NOT_FOUND" }
```

**批量删除文档**

```
POST /api/documents/batch-delete
Content-Type: application/json

Request:
{
  "ids": ["doc_abc123", "doc_def456"]
}

Response 200: { "deleted": 2 }
```

**更新文档标签**

```
PATCH /api/documents/:id/tags
Content-Type: application/json

Request:
{
  "addTags": ["自定义标签"],
  "removeTags": ["tag_1"]
}

Response 200:
{
  "tags": [
    { "id": "tag_2", "label": "Q4", "isAI": true },
    { "id": "tag_3", "label": "自定义标签", "isAI": false }
  ]
}
```

**移动文档到其他空间**

```
PATCH /api/documents/:id/space
Content-Type: application/json

Request:
{
  "spaceId": "sp_002"
}

Response 200: { "success": true, "spaceId": "sp_002", "spaceName": "产品方法论" }
```

**获取文件上传预签名 URL**

```
POST /api/documents/presign
Content-Type: application/json

Request:
{
  "fileName": "report.pdf",
  "fileType": "application/pdf",
  "fileSize": 3200000
}

Response 200:
{
  "uploadUrl": "https://r2.knowbase.app/uploads/...",
  "fileKey": "files/user_001/doc_abc123/original.pdf",
  "expiresAt": "2026-03-23T11:00:00Z"
}
```

#### 4.1.3 AI 问答

**发送问题（流式响应）**

```
POST /api/chat
Content-Type: application/json

Request:
{
  "message": "帮我总结一下 2025 年 Q4 各产品线的销售数据表现",
  "conversationId?": "conv_001",     # 为空则新建对话
  "spaceId?": "sp_001"              # 为空则全局检索
}

Response: text/event-stream (SSE)

event: message_start
data: {"conversationId":"conv_001","messageId":"msg_001"}

event: text_delta
data: {"delta":"根据"}

event: text_delta
data: {"delta":"知识库中的资料，"}

event: citation
data: {"index":1,"sourceId":"doc_abc123","sourceTitle":"2025年Q4财务分析报告.pdf","sourceType":"pdf","excerpt":"Q4 总营收达 3.13 亿元...","confidence":0.95,"pageNum":12}

event: text_delta
data: {"delta":"2025 年 Q4 总营收达 3.13 亿元[1]..."}

event: message_end
data: {"citations":[...],"usage":{"promptTokens":1200,"completionTokens":350}}

event: error
data: {"error":"NO_RELEVANT_CONTENT","message":"知识库中未找到与该问题相关的资料"}
```

**获取对话列表**

```
GET /api/chat/conversations?page=1&limit=20

Response 200:
{
  "items": [
    {
      "id": "conv_001",
      "title": "Q4 销售数据分析",
      "lastMessageAt": "2026-03-18T14:25:18Z",
      "messageCount": 4,
      "spaceId": "sp_001"
    }
  ],
  "total": 5,
  "hasMore": false
}
```

**获取对话详情（历史消息）**

```
GET /api/chat/conversations/:id

Response 200:
{
  "id": "conv_001",
  "title": "Q4 销售数据分析",
  "spaceId": "sp_001",
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "帮我总结一下 Q4 销售数据",
      "timestamp": "2026-03-18T14:23:00Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "根据知识库中的资料...[1]...[2]",
      "timestamp": "2026-03-18T14:23:15Z",
      "citations": [
        {
          "index": 1,
          "sourceId": "doc_abc123",
          "sourceTitle": "2025年Q4财务分析报告.pdf",
          "sourceType": "pdf",
          "excerpt": "Q4 总营收达 3.13 亿元...",
          "confidence": 0.95,
          "pageNum": 12
        }
      ],
      "feedback": null
    }
  ]
}
```

**删除对话**

```
DELETE /api/chat/conversations/:id

Response 200: { "success": true }
```

**停止生成**

```
POST /api/chat/stop
Content-Type: application/json

Request:
{
  "conversationId": "conv_001",
  "messageId": "msg_002"
}

Response 200: { "success": true }
```

#### 4.1.4 反馈

```
POST /api/feedback
Content-Type: application/json

Request:
{
  "messageId": "msg_002",
  "conversationId": "conv_001",
  "type": "helpful" | "not_helpful"
}

Response 200: { "success": true }
```

#### 4.1.5 语义搜索

```
GET /api/search?q=用户留存率分析&spaceId=sp_001&type=pdf&timeRange=30d&page=1&limit=20

Response 200:
{
  "query": "用户留存率分析",
  "total": 6,
  "timeCost": "0.8s",
  "results": [
    {
      "id": "doc_005",
      "title": "用户访谈记录 - 知识管理工具使用习惯调研",
      "fileType": "pdf",
      "matchedParagraph": "...85% 的受访者表示...<mark>用户留存</mark>...",
      "matchedParagraphId": "p3",
      "relevanceScore": 0.94,
      "relevanceLabel": "high",
      "spaceName": "产品方法论",
      "uploadedAt": "2026-03-14T14:50:00Z"
    }
  ],
  "hasMore": false
}
```

**搜索建议（自动完成）**

```
GET /api/search/suggest?q=用户留存

Response 200:
{
  "suggestions": [
    { "text": "用户留存率分析", "type": "query" },
    { "text": "用户访谈记录", "type": "document" },
    { "text": "SaaS 产品留存策略", "type": "document" }
  ]
}
```

#### 4.1.6 知识空间

**获取空间列表**

```
GET /api/spaces

Response 200:
{
  "items": [
    {
      "id": "sp_001",
      "name": "Q1 竞品分析项目",
      "description": "2026年第一季度竞品调研相关资料",
      "docCount": 23,
      "totalSizeMB": 45.2,
      "createdAt": "2026-02-15T10:00:00Z",
      "lastUpdatedAt": "2026-03-18T10:30:00Z"
    }
  ],
  "quota": { "used": 3, "limit": 3, "plan": "free" }
}
```

**创建空间**

```
POST /api/spaces
Content-Type: application/json

Request:
{
  "name": "新项目",
  "description?": "项目描述"
}

Response 201:
{
  "id": "sp_004",
  "name": "新项目",
  "description": "项目描述",
  "docCount": 0,
  "createdAt": "2026-03-23T10:30:00Z"
}

Error 403: { "error": "QUOTA_EXCEEDED", "message": "免费版最多创建 3 个知识空间，升级解锁更多" }
```

**更新空间**

```
PATCH /api/spaces/:id
Content-Type: application/json

Request:
{
  "name?": "新名称",
  "description?": "新描述"
}

Response 200: { "success": true }
```

**删除空间**

```
DELETE /api/spaces/:id

Response 200: { "success": true, "deletedDocCount": 23 }
```

#### 4.1.7 用户设置

**获取用户信息**

```
GET /api/user/profile

Response 200:
{
  "id": "user_001",
  "name": "李伟",
  "email": "liwei@example.com",
  "avatar": null,
  "plan": "free",
  "createdAt": "2026-01-10T08:00:00Z",
  "oauthBindings": {
    "wechat": { "bound": true, "name": "李伟" },
    "google": { "bound": false },
    "github": { "bound": true, "name": "liwei-dev" }
  }
}
```

**更新用户信息**

```
PATCH /api/user/profile
Content-Type: application/json

Request:
{
  "name?": "新名称",
  "avatar?": "https://r2.knowbase.app/avatars/user_001.jpg"
}

Response 200: { "success": true }
```

**获取用量统计**

```
GET /api/user/usage

Response 200:
{
  "documents": { "used": 79, "limit": 100 },
  "storage": { "usedMB": 136, "limitMB": 500 },
  "aiQueries": { "usedThisMonth": 87, "limitPerMonth": 200 },
  "spaces": { "used": 3, "limit": 3 }
}
```

**修改密码**

```
POST /api/user/change-password
Content-Type: application/json

Request:
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}

Response 200: { "success": true }
Error 400: { "error": "WRONG_PASSWORD" }
```

**数据导出**

```
POST /api/user/export

Response 202:
{
  "exportId": "exp_001",
  "status": "processing",
  "estimatedTime": "120s"
}
```

```
GET /api/user/export/:exportId

Response 200:
{
  "exportId": "exp_001",
  "status": "completed",        # processing | completed | failed
  "downloadUrl": "https://r2.knowbase.app/exports/exp_001.zip",
  "expiresAt": "2026-03-24T10:30:00Z",
  "sizeBytes": 156000000
}
```

#### 4.1.8 标签

```
GET /api/tags?limit=20

Response 200:
{
  "tags": [
    { "label": "市场分析", "count": 12 },
    { "label": "竞品分析", "count": 8 },
    { "label": "RAG", "count": 7 }
  ]
}
```

### 4.2 AI Core Service API (FastAPI 内部接口)

> 这些接口仅由 BFF 层内部调用，不直接暴露给前端。通过内部 API Key 认证。

```
# 文档解析与向量化
POST   /internal/documents/parse       # 触发文件解析任务
GET    /internal/documents/:id/status   # 查询解析状态

# RAG 问答
POST   /internal/chat/stream           # 流式问答 (SSE)
POST   /internal/chat/rerank           # 重排序（可选独立调用）

# 语义搜索
POST   /internal/search                # 向量+关键词混合搜索
POST   /internal/search/suggest        # 搜索建议

# 向量操作
POST   /internal/embeddings/generate   # 生成向量
DELETE /internal/embeddings/document/:id  # 删除文档向量

# 标签与摘要
POST   /internal/ai/generate-tags      # 为文档生成标签
POST   /internal/ai/generate-summary   # 为文档生成摘要
```

---

## 5. 完整数据库设计

### 5.1 PostgreSQL 数据表

#### ER 关系图

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  users   │────<│ spaces       │────<│ documents    │
└──────────┘     └──────────────┘     └──────┬───────┘
     │                                       │
     │           ┌──────────────┐             │
     └──────────<│conversations │             │
                 └──────┬───────┘      ┌──────▼───────┐
                        │              │ doc_chunks   │
                 ┌──────▼───────┐      │ (向量索引)    │
                 │  messages    │      └──────────────┘
                 └──────┬───────┘
                        │
                 ┌──────▼───────┐     ┌──────────────┐
                 │  citations   │────>│ doc_chunks   │
                 └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐
│ document_tags│────>│ documents    │
└──────────────┘     └──────────────┘

┌──────────────┐
│ oauth_accounts│───> users
└──────────────┘

┌──────────────┐
│  feedbacks   │───> messages
└──────────────┘
```

#### 表定义

```sql
-- ============================================================
-- 用户相关表（Auth.js Drizzle Adapter 管理）
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100),
    email           VARCHAR(255) UNIQUE NOT NULL,
    email_verified  TIMESTAMPTZ,
    password_hash   VARCHAR(255),                    -- 邮箱注册用户
    image           TEXT,                             -- 头像 URL
    plan            VARCHAR(20) DEFAULT 'free',       -- free | pro | enterprise
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE oauth_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL,          -- wechat | google | github
    provider_account_id VARCHAR(255) NOT NULL,
    access_token        TEXT,
    refresh_token       TEXT,
    expires_at          INTEGER,
    token_type          VARCHAR(50),
    scope               TEXT,
    UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_tokens (
    identifier  VARCHAR(255) NOT NULL,
    token       VARCHAR(255) UNIQUE NOT NULL,
    expires     TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- ============================================================
-- 知识空间
-- ============================================================

CREATE TABLE spaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 每个用户有一个默认空间
CREATE UNIQUE INDEX idx_spaces_user_default ON spaces(user_id) WHERE name = '通用';

-- ============================================================
-- 文档（知识条目）
-- ============================================================

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id        UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    file_name       VARCHAR(500),
    file_type       VARCHAR(20) NOT NULL,             -- pdf | word | web | markdown | txt | excel | image | ppt | epub
    file_size       BIGINT,                           -- 字节数
    file_key        VARCHAR(500),                     -- R2 存储路径
    original_url    TEXT,                              -- 网页来源 URL
    summary         TEXT,                              -- AI 生成摘要
    page_count      INTEGER,
    status          VARCHAR(20) DEFAULT 'processing',  -- processing | ready | failed
    error_message   TEXT,                              -- 解析失败原因
    parsed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user_space ON documents(user_id, space_id);
CREATE INDEX idx_documents_user_status ON documents(user_id, status);
CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);

-- ============================================================
-- 文档分块 + 向量索引
-- ============================================================

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE doc_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,                 -- 块序号
    heading         TEXT,                              -- 所属标题
    content         TEXT NOT NULL,                     -- 文本内容
    page_num        INTEGER,                           -- PDF 页码（可选）
    embedding       vector(1024) NOT NULL,             -- BGE-M3 向量（1024维）
    metadata        JSONB DEFAULT '{}',                -- 额外元数据
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW 向量索引（余弦相似度）
CREATE INDEX idx_chunks_embedding ON doc_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- 分块与文档关联索引
CREATE INDEX idx_chunks_document ON doc_chunks(document_id);
CREATE INDEX idx_chunks_user ON doc_chunks(user_id);

-- BM25 全文搜索索引（使用 tsvector）
ALTER TABLE doc_chunks ADD COLUMN content_tsv tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple', coalesce(heading, '') || ' ' || content)
    ) STORED;

CREATE INDEX idx_chunks_fts ON doc_chunks USING gin(content_tsv);

-- ============================================================
-- 标签
-- ============================================================

CREATE TABLE document_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    label       VARCHAR(50) NOT NULL,
    is_ai       BOOLEAN DEFAULT true,                 -- AI 生成 vs 用户自定义
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_document ON document_tags(document_id);
CREATE INDEX idx_tags_label ON document_tags(label);

-- 同一文档不重复打同一标签
CREATE UNIQUE INDEX idx_tags_unique ON document_tags(document_id, label);

-- ============================================================
-- 对话
-- ============================================================

CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id    UUID REFERENCES spaces(id) ON DELETE SET NULL,  -- 可能跨空间
    title       VARCHAR(200),                         -- 自动从首条消息生成
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);

-- ============================================================
-- 消息
-- ============================================================

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,              -- user | assistant
    content         TEXT NOT NULL,
    token_usage     JSONB,                             -- {"promptTokens": 1200, "completionTokens": 350}
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- ============================================================
-- 引用来源
-- ============================================================

CREATE TABLE citations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    citation_index  INTEGER NOT NULL,                  -- 引用编号 [1] [2]
    chunk_id        UUID NOT NULL REFERENCES doc_chunks(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    excerpt         TEXT NOT NULL,                     -- 引用段落摘要
    confidence      REAL NOT NULL,                     -- 相关度评分 0-1
    page_num        INTEGER,                           -- PDF 页码
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_citations_message ON citations(message_id);

-- ============================================================
-- 反馈
-- ============================================================

CREATE TABLE feedbacks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL,                 -- helpful | not_helpful
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- ============================================================
-- 异步任务追踪
-- ============================================================

CREATE TABLE task_status (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    task_type   VARCHAR(50) NOT NULL,                 -- parse | embed | tag | summarize
    status      VARCHAR(20) DEFAULT 'pending',        -- pending | running | completed | failed
    progress    INTEGER DEFAULT 0,                    -- 0-100
    error       TEXT,
    started_at  TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_document ON task_status(document_id);

-- ============================================================
-- Row Level Security（用户数据隔离）
-- ============================================================

ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 示例：spaces 表 RLS 策略
CREATE POLICY spaces_user_isolation ON spaces
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- 其他表的 RLS 策略类似，确保用户只能访问自己的数据
```

### 5.2 Redis 数据结构

```
# 会话缓存
session:{sessionToken}          → JSON (用户会话数据)，TTL 24h

# 限流计数
ratelimit:ai:{userId}:{month}   → Integer (当月 AI 问答次数)，TTL 40d
ratelimit:upload:{userId}       → Integer (并发上传计数)

# 搜索建议缓存
search:suggest:{userId}:{queryHash} → JSON (建议结果)，TTL 5min

# 文档解析状态（实时查询用）
parse:status:{documentId}       → JSON {"status":"processing","progress":65}，TTL 1h

# Celery 任务队列
celery:queue:default            → List (默认任务队列)
celery:queue:parse              → List (解析专用队列)
celery:queue:embed              → List (向量化专用队列)
```

---

## 6. 前端组件架构

### 6.1 组件层次结构

```
App (Root Layout)
│
├── (auth) Group - 未登录路由
│   └── AuthPage
│       ├── BrandHeader (Logo + Slogan)
│       ├── AuthForm
│       │   ├── TabSwitcher (登录/注册)
│       │   ├── EmailInput
│       │   ├── PasswordInput
│       │   ├── SubmitButton
│       │   └── OAuthButtons
│       │       ├── WechatLoginButton
│       │       ├── GoogleLoginButton
│       │       └── GithubLoginButton
│       └── PrivacyFooter
│
├── (main) Group - 已登录路由
│   ├── AppShell (layout.tsx)
│   │   ├── TopBar ──────────────────────────────── 全局
│   │   │   ├── Logo
│   │   │   ├── GlobalSearchBox
│   │   │   │   └── SearchSuggestionDropdown
│   │   │   ├── UploadButton
│   │   │   └── UserAvatarMenu
│   │   │
│   │   ├── SideNav ─────────────────────────────── 全局
│   │   │   ├── NavItem (AI 问答)
│   │   │   ├── NavItem (知识库)
│   │   │   ├── NavItem (知识图谱 - P2 灰显)
│   │   │   ├── NavItem (设置)
│   │   │   └── ConversationHistory (仅问答页展示)
│   │   │
│   │   └── MainContent ─────────────────────────── 路由切换区
│   │
│   ├── ChatPage (P-02)
│   │   ├── SpaceSelector
│   │   ├── ChatMessages (可滚动)
│   │   │   ├── UserMessageBubble
│   │   │   ├── AIResponseCard
│   │   │   │   ├── StreamingText (打字机效果)
│   │   │   │   ├── CitationPill [1] [2]
│   │   │   │   ├── CitationSourceList
│   │   │   │   │   └── CitationSourceItem
│   │   │   │   │       └── FileFormatIcon
│   │   │   │   └── FeedbackButtons
│   │   │   └── EmptyState (首次进入引导)
│   │   │       └── SuggestionCards
│   │   └── ChatInput
│   │       ├── TextArea
│   │       └── SendButton / StopButton
│   │
│   ├── KnowledgeListPage (P-03)
│   │   ├── ListToolbar
│   │   │   ├── SpaceTabs
│   │   │   ├── FormatFilter
│   │   │   ├── SortSelector
│   │   │   └── ViewToggle (卡片/列表)
│   │   ├── TagFilterBar
│   │   │   └── TagChip (多个)
│   │   ├── KnowledgeGrid / KnowledgeTable
│   │   │   └── KnowledgeItemCard / KnowledgeItemRow
│   │   │       ├── FileFormatIcon
│   │   │       ├── TagChip
│   │   │       └── ItemActionMenu
│   │   ├── BatchActionBar (选中时浮现)
│   │   ├── InfiniteScroll / Pagination
│   │   └── EmptyState
│   │
│   ├── ItemDetailPage (P-04)
│   │   ├── DetailHeader
│   │   │   ├── BackButton
│   │   │   ├── FileFormatIcon + Title
│   │   │   ├── DownloadButton
│   │   │   └── DeleteButton
│   │   ├── MetaInfo (文件名/大小/时间/空间)
│   │   ├── EditableTags
│   │   │   └── TagChip (可删除) + AddTagInput
│   │   ├── ContentTabs
│   │   │   ├── ExtractedContent (段落列表，支持高亮)
│   │   │   └── OriginalPreview
│   │   │       ├── PDFViewer
│   │   │       ├── WebSnapshot
│   │   │       └── PlainTextViewer
│   │   └── RelatedRecommendations (P2)
│   │
│   ├── SearchResultPage (P-05)
│   │   ├── SearchHeader (查询词 + 结果数 + 耗时)
│   │   ├── SearchFilters
│   │   │   ├── FormatChips
│   │   │   ├── TimeRangeSelector
│   │   │   └── SpaceSelector
│   │   ├── SearchResultList
│   │   │   └── SearchResultItem
│   │   │       ├── FileFormatIcon
│   │   │       ├── HighlightedExcerpt
│   │   │       └── RelevanceBadge
│   │   └── LoadMoreButton
│   │
│   └── SettingsPage (P-08)
│       ├── SettingsNav (左侧导航)
│       ├── AccountSettings
│       │   ├── AvatarEditor
│       │   ├── EditableName
│       │   ├── PasswordChangeDialog
│       │   ├── OAuthBindingList
│       │   └── PlanCard
│       ├── SpaceManagement (P-07)
│       │   ├── CreateSpaceDialog
│       │   ├── SpaceCard (多个)
│       │   └── QuotaBanner
│       └── ImportExport
│           ├── ExportButton
│           └── ExportProgress
│
├── UploadModal (P-06) ──────────────────────── 全局 Modal
│   ├── SpaceSelector
│   ├── UploadDropzone
│   ├── URLInput
│   ├── SelectedFileList
│   │   └── FileListItem
│   └── ActionButtons (取消/上传)
│
├── UploadDropzone ──────────────────────────── 全局拖拽蒙层
│   └── DropOverlay ("释放文件以上传到知识库")
│
├── UploadStatusBar ─────────────────────────── 全局底部悬浮
│   └── UploadProgressItem (多个)
│
├── ConfirmDialog ───────────────────────────── 全局复用
├── Toast ───────────────────────────────────── 全局复用
└── SkeletonLoader ──────────────────────────── 全局复用
```

### 6.2 状态管理策略

| 状态类型 | 管理方式 | 说明 |
|---------|---------|------|
| 服务端数据（文档列表、搜索结果） | React Server Components + Server Actions | 无需客户端缓存，RSC 直出 |
| AI 对话流 | Vercel AI SDK `useChat` hook | 内置流式状态管理 |
| 上传队列 | Zustand store (轻量级) | 跨组件共享上传状态 |
| UI 状态（Modal、Sidebar） | React Context + useState | 局部状态 |
| URL 状态（筛选、排序、分页） | nuqs (URL search params) | 浏览器前进后退保持状态 |
| 认证状态 | Auth.js session（Server） + useSession（Client） | 服务端渲染安全 |

### 6.3 UI 库与样式方案

| 层次 | 选型 | 说明 |
|------|------|------|
| CSS 框架 | Tailwind CSS 4.x | 原子化 CSS，按 PRD 设计 token 配置 |
| 组件基础 | shadcn/ui + Radix UI | 无头组件 + 可定制样式，满足 WCAG 2.1 AA |
| 图标 | Lucide Icons | 开源一致风格，覆盖文件格式图标 |
| 动画 | Framer Motion | 页面切换、列表动画、Toast 进出 |
| PDF 预览 | react-pdf (@react-pdf/renderer) | PDF 在线阅读 + 页码定位 |
| Markdown 渲染 | react-markdown + remark-gfm | AI 回答内容渲染 |
| 代码高亮 | Shiki | AI 回答中代码块高亮 |
| 字体 | Inter (英文) + Noto Sans SC (中文) | Web Fonts，匹配 PRD 设计指引 |

### 6.4 设计 Token 映射

```css
/* styles/tokens.css - 对照 PRD 6.2 色彩方案 */
:root {
  /* 主色 */
  --color-primary: #2563EB;
  --color-primary-dark: #1E3A5F;

  /* 辅助色（引用标注） */
  --color-accent: #F59E0B;
  --color-accent-light: #FEF3C7;

  /* 背景 */
  --color-bg: #F8FAFC;
  --color-bg-card: #FFFFFF;

  /* 文字 */
  --color-text-primary: #1A202C;
  --color-text-secondary: #64748B;

  /* 文件格式色彩 */
  --color-file-pdf: #EF4444;
  --color-file-word: #3B82F6;
  --color-file-web: #22C55E;
  --color-file-markdown: #8B5CF6;
  --color-file-txt: #6B7280;

  /* 间距 (4px 栅格) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* 圆角 */
  --radius-card: 12px;
  --radius-button: 8px;
  --radius-pill: 9999px;

  /* 阴影 */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-modal: 0 4px 24px rgba(0, 0, 0, 0.12);

  /* 排版 */
  --font-sans: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --text-base: 15px;
  --leading-relaxed: 1.75;
}
```

---

## 7. 开发任务拆解

### 7.1 里程碑与阶段划分

```
Phase 0: 项目初始化              ─── 第 1 周
Phase 1: 核心基础设施             ─── 第 2-3 周
Phase 2: 文档上传与解析 (P0)      ─── 第 4-5 周
Phase 3: AI 问答与搜索 (P0)       ─── 第 6-7 周
Phase 4: 知识库管理 (P0)          ─── 第 8 周
Phase 5: 知识空间 + 设置 (P1)     ─── 第 9 周
Phase 6: 集成测试 + 优化          ─── 第 10 周
Phase 7: 上线准备                 ─── 第 11 周
```

### 7.2 详细任务列表

#### Phase 0：项目初始化（第 1 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-0.1 | Monorepo 初始化（Turborepo + pnpm workspace） | 4h | - | turbo.json, pnpm-workspace.yaml |
| T-0.2 | Next.js 16 项目脚手架 + TypeScript + Tailwind 4 + shadcn/ui | 4h | T-0.1 | apps/web 基础结构 |
| T-0.3 | FastAPI 项目脚手架 + Pydantic v2 + 项目结构 | 4h | T-0.1 | apps/api 基础结构 |
| T-0.4 | Docker Compose 本地开发环境（PostgreSQL + Redis） | 4h | T-0.2, T-0.3 | docker-compose.yml |
| T-0.5 | PostgreSQL 数据库 Schema 初始化 + pgvector 扩展 | 4h | T-0.4 | 全部建表脚本 |
| T-0.6 | 共享类型包（shared-types）搭建 | 2h | T-0.1 | packages/shared-types |
| T-0.7 | CI/CD 基础配置（GitHub Actions） | 4h | T-0.1 | .github/workflows |
| T-0.8 | 设计 Token 配置（tailwind.config.ts + tokens.css） | 2h | T-0.2 | 色彩/间距/字体配置 |

#### Phase 1：核心基础设施（第 2-3 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-1.1 | Auth.js v5 集成（邮箱登录 + Drizzle adapter） | 8h | T-0.2, T-0.5 | 认证完整流程 |
| T-1.2 | OAuth Provider 配置（Google + GitHub） | 4h | T-1.1 | OAuth 登录 |
| T-1.3 | 微信 OAuth 自定义 Provider | 6h | T-1.1 | 微信扫码登录 |
| T-1.4 | P-01 登录/注册页 UI | 8h | T-0.8, T-1.1 | 完整登录注册页面 |
| T-1.5 | AppShell 布局（TopBar + SideNav） | 6h | T-0.8 | 全局布局框架 |
| T-1.6 | Cloudflare R2 文件存储集成 + Presigned URL | 4h | T-0.3 | 文件上传/下载能力 |
| T-1.7 | Celery + Redis 异步任务队列搭建 | 4h | T-0.4 | 异步任务基础 |
| T-1.8 | FastAPI 内部认证中间件（API Key） | 2h | T-0.3 | 内部通信安全 |
| T-1.9 | BFF -> FastAPI 通信层封装 | 4h | T-0.3, T-1.8 | api-client.ts |
| T-1.10 | RLS 策略配置 + 多租户数据隔离验证 | 4h | T-0.5 | 数据安全 |
| T-1.11 | 全局组件：Toast、ConfirmDialog、EmptyState、SkeletonLoader | 6h | T-0.8 | 通用 UI 组件 |

#### Phase 2：文档上传与解析（第 4-5 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-2.1 | 文件上传 API (BFF: POST /api/documents/upload) | 4h | T-1.6, T-1.9 | 上传接口 |
| T-2.2 | URL 保存 API (BFF: POST /api/documents/url) | 4h | T-1.9 | URL 保存接口 |
| T-2.3 | Docling 集成 — PDF 解析 | 8h | T-1.7 | PDF 文本提取 |
| T-2.4 | Docling 集成 — Word/PPT 解析 | 6h | T-2.3 | Word 文本提取 |
| T-2.5 | Markdown/TXT 解析器 | 2h | T-1.7 | 轻量解析 |
| T-2.6 | Firecrawl 自部署 + 网页抓取集成 | 8h | T-1.7 | 网页正文提取 |
| T-2.7 | 文本分块策略实现（RecursiveCharacterTextSplitter） | 6h | T-2.3 | chunking.py |
| T-2.8 | BGE-M3 Embedding 服务搭建 | 8h | T-0.4 | 向量化能力 |
| T-2.9 | 向量写入 pgvector + HNSW 索引 | 4h | T-0.5, T-2.8 | 向量存储 |
| T-2.10 | 解析异步任务编排（parse -> chunk -> embed -> tag） | 6h | T-2.3~T-2.9 | 完整解析管道 |
| T-2.11 | P-06 上传弹窗 UI（UploadModal + UploadDropzone） | 8h | T-1.5, T-1.11 | 上传交互 |
| T-2.12 | P-06 上传状态面板（UploadStatusBar） | 4h | T-2.11 | 进度展示 |
| T-2.13 | 全局拖拽上传蒙层 | 4h | T-2.11 | 任意页面拖拽上传 |
| T-2.14 | 自动标签生成（LLM） | 4h | T-2.10 | tag_generator.py |
| T-2.15 | 自动摘要生成（LLM） | 4h | T-2.10 | 摘要写入 documents.summary |

#### Phase 3：AI 问答与搜索（第 6-7 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-3.1 | RAG Engine 核心实现（检索 + Prompt 构建） | 12h | T-2.9 | rag_engine.py |
| T-3.2 | 混合检索（pgvector + BM25 + RRF 融合） | 8h | T-2.9 | 高质量检索 |
| T-3.3 | Reranker 重排序实现 | 4h | T-3.2 | reranker.py |
| T-3.4 | LLM 多 Provider 路由（Claude + Gemini fallback） | 6h | T-1.9 | llm_service.py |
| T-3.5 | SSE 流式问答接口（FastAPI -> BFF -> 前端） | 8h | T-3.1, T-3.4 | 流式回答链路 |
| T-3.6 | Vercel AI SDK useChat 集成 | 4h | T-3.5 | 前端流式接入 |
| T-3.7 | P-02 AI 问答页 — 对话消息区 UI | 8h | T-1.5, T-3.6 | 聊天界面 |
| T-3.8 | P-02 AI 问答页 — ChatInput（发送/停止/快捷键） | 4h | T-3.7 | 输入交互 |
| T-3.9 | P-02 引用标注系统（CitationPill + 悬浮预览 + 跳转） | 8h | T-3.7 | 引用溯源 |
| T-3.10 | P-02 引用来源列表（CitationSourceList） | 4h | T-3.9 | 来源展示 |
| T-3.11 | P-02 反馈按钮 + 反馈 API | 2h | T-3.7 | 反馈收集 |
| T-3.12 | P-02 对话历史列表 + 加载历史对话 | 6h | T-3.7 | 历史管理 |
| T-3.13 | P-02 空状态 + 建议问题卡片 | 2h | T-3.7 | 引导体验 |
| T-3.14 | P-02 SpaceSelector（问答范围选择） | 3h | T-3.7 | 空间筛选 |
| T-3.15 | 语义搜索 API（混合检索 + 高亮） | 6h | T-3.2 | 搜索接口 |
| T-3.16 | 搜索建议 API（自动完成） | 4h | T-3.15 | 搜索建议 |
| T-3.17 | P-05 搜索结果页 UI | 6h | T-3.15 | 搜索结果展示 |
| T-3.18 | GlobalSearchBox + SearchSuggestionDropdown + Cmd+K 快捷键 | 6h | T-3.16 | 全局搜索交互 |

#### Phase 4：知识库管理（第 8 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-4.1 | 文档列表 API（筛选/排序/分页） | 4h | T-2.1 | 列表接口 |
| T-4.2 | P-03 知识库列表页 — 卡片视图 | 8h | T-4.1 | KnowledgeItemCard |
| T-4.3 | P-03 知识库列表页 — 列表视图 | 4h | T-4.2 | KnowledgeListView |
| T-4.4 | P-03 工具栏（空间Tab + 筛选 + 排序 + 视图切换） | 6h | T-4.2 | 列表工具栏 |
| T-4.5 | P-03 标签筛选栏 | 3h | T-4.2 | 标签过滤 |
| T-4.6 | P-03 批量操作（选择 + 批量删除 + 批量移动） | 6h | T-4.2 | 批量管理 |
| T-4.7 | P-03 无限滚动加载 | 3h | T-4.2 | 分页加载 |
| T-4.8 | P-04 知识条目详情页 — 元信息 + 内容展示 | 6h | T-4.1 | 详情页核心 |
| T-4.9 | P-04 原文预览（PDF Viewer + 网页快照） | 8h | T-4.8 | 原文预览 |
| T-4.10 | P-04 可编辑标签组 | 3h | T-4.8 | 标签编辑 |
| T-4.11 | P-04 引用高亮跳转（从 AI 问答来） | 4h | T-4.8, T-3.9 | 引用溯源打通 |
| T-4.12 | P-04 下载原文 + 删除操作 | 3h | T-4.8, T-1.6 | 文件操作 |

#### Phase 5：知识空间 + 设置（第 9 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-5.1 | 知识空间 CRUD API | 4h | T-0.5 | 空间管理接口 |
| T-5.2 | P-07 知识空间管理页 UI | 6h | T-5.1, T-1.5 | 空间管理界面 |
| T-5.3 | 空间配额限制逻辑（免费版 3 个） | 2h | T-5.1 | 配额控制 |
| T-5.4 | P-08 设置页 — 账户设置 | 6h | T-1.1 | 账户管理 |
| T-5.5 | P-08 设置页 — OAuth 绑定管理 | 4h | T-1.2, T-1.3 | 第三方账号 |
| T-5.6 | P-08 设置页 — 用量统计 | 3h | T-5.4 | 用量展示 |
| T-5.7 | 数据导出功能（打包 ZIP + R2 临时链接） | 8h | T-1.6 | 数据导出 |
| T-5.8 | P-08 设置页 — 导入/导出面板 | 3h | T-5.7 | 导出 UI |
| T-5.9 | UserAvatarMenu 下拉菜单 | 2h | T-1.5 | 用户菜单 |

#### Phase 6：集成测试 + 优化（第 10 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-6.1 | 端到端测试（上传 -> 解析 -> 问答 -> 引用跳转） | 8h | Phase 2-4 | E2E 验证 |
| T-6.2 | RAG 回答质量调优（Prompt + 检索参数） | 8h | T-3.1 | 质量提升 |
| T-6.3 | 性能优化 — 首屏加载 <2s | 4h | Phase 2-4 | 性能达标 |
| T-6.4 | 性能优化 — AI 首 token <3s | 4h | T-3.5 | 延迟优化 |
| T-6.5 | 性能优化 — 搜索响应 <3s | 4h | T-3.15 | 搜索性能 |
| T-6.6 | 响应式适配（移动端 375px ~ 桌面端） | 6h | Phase 2-5 | 移动端体验 |
| T-6.7 | 无障碍审查（键盘导航 + alt 文本 + 对比度） | 4h | Phase 2-5 | WCAG 达标 |
| T-6.8 | 错误边界 + 异常降级处理 | 4h | Phase 2-5 | 容错能力 |
| T-6.9 | 安全审查（XSS/CSRF/注入防护） | 4h | Phase 1-5 | 安全加固 |

#### Phase 7：上线准备（第 11 周）

| 任务 ID | 任务名称 | 预估工时 | 依赖 | 产出 |
|---------|---------|---------|------|------|
| T-7.1 | Vercel 生产部署配置 | 4h | Phase 6 | 前端部署 |
| T-7.2 | Railway 生产部署（FastAPI + Celery + PostgreSQL + Redis） | 6h | Phase 6 | 后端部署 |
| T-7.3 | Cloudflare R2 生产配置 + CDN | 2h | T-7.1 | 文件服务 |
| T-7.4 | 域名配置 + HTTPS 证书 | 2h | T-7.1 | 域名上线 |
| T-7.5 | 监控与告警配置（Vercel Analytics + Sentry） | 4h | T-7.1, T-7.2 | 可观测性 |
| T-7.6 | 数据库备份策略 | 2h | T-7.2 | 数据安全 |
| T-7.7 | 限流策略上线（API Rate Limiting） | 3h | T-7.2 | 防滥用 |
| T-7.8 | 生产环境冒烟测试 | 4h | T-7.1~T-7.7 | 上线验证 |

### 7.3 依赖关系图

```
Phase 0 (项目初始化)
    │
    ▼
Phase 1 (核心基础设施)──────────────────────┐
    │                                       │
    ├──────────────┐                        │
    ▼              ▼                        │
Phase 2         Phase 4 的 T-4.1~4.7       │
(文档上传与解析)  可与 Phase 2 并行开始       │
    │              (仅依赖 API，不依赖解析)   │
    ▼                                       │
Phase 3 ◄───────────────────────────────────┘
(AI 问答与搜索)   Phase 3 依赖 Phase 2 的向量化
    │
    ├──────────────┐
    ▼              ▼
Phase 4         Phase 5
(知识库管理)    (知识空间+设置)
    │              │     可并行
    └──────┬───────┘
           ▼
        Phase 6 (集成测试+优化)
           │
           ▼
        Phase 7 (上线准备)
```

### 7.4 关键路径

**关键路径**（决定项目最短完成时间）：

```
T-0.4 → T-0.5 → T-1.1 → T-1.7 → T-2.3 → T-2.7 → T-2.8 → T-2.9 → T-3.1 → T-3.2 → T-3.5 → T-3.6 → T-3.7 → T-6.1 → T-7.2
```

即：数据库搭建 -> 认证 -> 任务队列 -> 文件解析 -> 分块 -> 向量化 -> 向量存储 -> RAG 检索 -> 混合检索 -> 流式接口 -> 前端集成 -> 聊天 UI -> 集成测试 -> 部署。

**预估总工期**：11 周（单人全栈），可通过前后端并行开发压缩到 8 周。

---

## 附录 A：技术栈汇总

| 层次 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js + React + TypeScript | 16.x / 19.x / 5.7.x |
| UI 组件 | shadcn/ui + Radix UI + Tailwind CSS | latest / latest / 4.x |
| AI 前端 | Vercel AI SDK | 6.x |
| 状态管理 | Zustand (上传) + nuqs (URL) | 5.x / 2.x |
| 后端框架 | FastAPI + Pydantic | 0.115.x / 2.x |
| 任务队列 | Celery + Redis | 5.x / 7.x |
| 数据库 | PostgreSQL + pgvector | 16.x / 0.8.x |
| 向量模型 | BGE-M3 | latest |
| LLM | Claude Sonnet 4 / Gemini 2.5 Flash | API |
| 文件解析 | Docling | 2.x |
| 网页抓取 | Firecrawl (self-hosted) | latest |
| 认证 | Auth.js (NextAuth) | 5.x |
| 文件存储 | Cloudflare R2 | - |
| 前端部署 | Vercel | Pro |
| 后端部署 | Railway | Starter |
| 监控 | Vercel Analytics + Sentry | - |
| 包管理 | pnpm + Turborepo | 9.x / 2.x |
| 容器化 | Docker + Docker Compose | latest |

---

> **文档自检**
>
> - [x] 7 个决策点均完成搜索调研（前端/后端/向量库/LLM/文件解析/认证/部署）
> - [x] 每个决策点包含：调研结果、3+ 候选方案对比矩阵、推荐+理由+版本号、风险和应对
> - [x] 系统架构图（ASCII）覆盖全部技术组件和数据流
> - [x] 项目目录结构完整（前端/后端/共享包）
> - [x] API 接口设计覆盖 PRD 全部 P0 功能（上传/问答/搜索/管理/空间/设置），含请求/响应 Schema
> - [x] 数据库设计包含 12 张表 + 向量索引 + 全文搜索索引 + RLS 策略
> - [x] 前端组件架构对照 page-specs 全部页面（P-01~P-08）和 18 个全局组件
> - [x] 开发任务拆解为 7 个 Phase、70+ 任务，标注依赖关系和关键路径
