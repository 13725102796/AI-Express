# 紫微灵犀 — 技术架构文档（tech-architecture.md）

> 版本：v1.0
> 日期：2026-04-17
> 输出方：tech-architect-agent（由 phase2-orchestrator 代行）
> 输入：PRD v2.1 / page-specs.md / phase1-to-phase2.md / 现有 紫薇/app.py
> 受众：fullstack-dev-agent（前后端） / test-agent / phase2-orchestrator

---

## 0. 总体架构图

```
┌────────────────────────────────────────────────────────────────────┐
│                         用户终端（多端）                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ 微信小程序（主力） │  │  H5（引流）       │  │ 管理后台 H5      │    │
│  │ uni-app 编译     │  │ uni-app 编译     │  │ /admin 路由     │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
└───────────┼────────────────────┼────────────────────┼──────────────┘
            │                    │                    │
            └──────── HTTPS / SSE 流式 ────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│              FastAPI 后端（紫薇/  现有项目扩展，单服务）              │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  app.py（精简入口，include_router）                            │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ /paipan* │  │  auth    │  │  user    │  │  chart   │          │
│  │ 已有3+1  │  │  router  │  │  router  │  │  router  │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  points  │  │ template │  │  reading │  │  share   │          │
│  │  router  │  │  router  │  │  router  │  │  router  │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  admin router（独立 prefix /api/v1/admin）                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │  services/   │  │  models/     │  │  db/(SQLAlchemy 2.0) │    │
│  │  业务逻辑     │  │  ORM 实体    │  │  AsyncSession        │    │
│  └──────────────┘  └──────────────┘  └──────────────────────┘    │
└──────────┬─────────────────────────────────────────────────────────┘
           │
   ┌───────┼────────────┬────────────────────┐
   ▼       ▼            ▼                    ▼
┌──────┐ ┌────────┐ ┌─────────────┐  ┌──────────────────┐
│ PG   │ │iztro-py│ │ Gemini 2.5  │  │ AES/bcrypt/JWT   │
│ DB   │ │（已集成）│ │ Pro Stream  │  │ 安全工具         │
└──────┘ └────────┘ └─────────────┘  └──────────────────┘
```

**核心约束（来自 PRD Q8 + phase1-to-phase2.md 硬约束 1）**：
- 后端**单服务、单项目**，扩展现有 `/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/`
- 现有 3 个 `/paipan*` 端点保留可访问性，新增 `/paipan/solar/json`
- 业务 API 全部以 `/api/v1/` 为前缀，与排盘 API 同一服务但 URL 隔离

---

## 1. 技术选型

### 1.1 选型矩阵

#### 后端框架

| 维度 | FastAPI（保留） | Flask | Django |
|------|---------------|-------|--------|
| 现有项目 | ✅ 已用 | 重写 | 重写 |
| 异步支持 | ✅ 原生 | 弱 | 部分 |
| OpenAPI 文档 | ✅ 自动 | 手动 | 手动 |
| 性能 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

**决策：保留 FastAPI 0.128+**（PRD Q8 硬约束，无可选项）

#### ORM + 数据库驱动

| 维度 | SQLAlchemy 2.0 async + asyncpg | Tortoise ORM | SQLModel |
|------|-------------------------------|--------------|----------|
| 与 FastAPI 兼容 | ✅ 官方推荐 | ✅ | ✅（基于 SA） |
| 成熟度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 迁移工具 | ✅ Alembic | ❌ Aerich 弱 | ✅ Alembic |
| 类型支持 | ✅ 2.0 Mapped[] | ✅ | ✅ Pydantic 一体 |
| 生产案例 | 海量 | 中等 | 中等 |

**决策：SQLAlchemy 2.0 async + asyncpg + Alembic**
- 理由：成熟、文档全、Alembic 迁移可靠
- 权衡：放弃 SQLModel 的 Pydantic 一体化，因为业务复杂时分离更灵活
- 新技术红利：使用 SA 2.0 的 `Mapped[]` 类型注解 + `async_sessionmaker`

#### JWT 实现库

| 维度 | PyJWT 2.10+ | python-jose | authlib |
|------|-------------|-------------|---------|
| 维护状态 | ✅ 活跃 | ❌ 2021 后停更 | ✅ 活跃 |
| FastAPI 官方推荐 | ✅ 已切换 | ❌ 已废弃 | 中等 |
| Python 3.10+ 兼容 | ✅ | ❌ 部分破损 | ✅ |
| 体积 | 小 | 中 | 大 |

**决策：PyJWT 2.10+**（FastAPI 官方文档已切换，python-jose 已弃用）

#### 密码哈希

| 维度 | passlib[bcrypt] | bcrypt 直接调用 | argon2-cffi |
|------|----------------|----------------|-------------|
| 接口稳定性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 可换算法 | ✅ | ❌ | ❌ |
| 安全等级 | bcrypt | bcrypt | argon2（更高） |

**决策：passlib[bcrypt]**
- 理由：抽象层稳定，未来可平滑切换到 argon2
- bcrypt cost factor = 12（生产级）

#### 手机号加密

**决策：cryptography 库的 AES-256-GCM**
- Key 来自环境变量 `PHONE_ENC_KEY`（32 bytes，base64 编码）
- 存储格式：`base64(nonce || ciphertext || tag)`，单字段存
- 唯一索引基于 SHA-256 哈希列 `phone_hash`（用于查询和去重）

#### LLM API

| 维度 | google-genai（新版 SDK） | google-generativeai（旧版） | LiteLLM |
|------|------------------------|---------------------------|---------|
| 版本 | 1.x（2025+ 新版） | 0.x（已 deprecated 计划） | 1.x |
| 流式支持 | ✅ async stream | ✅ | ✅ |
| 官方推荐 | ✅ | ❌ | 第三方 |

**决策：google-genai 1.x**（Google 2025 新统一 SDK，原生 async + stream）

#### 前端框架

**决策：uni-app（Vue 3 + Vite + TypeScript）**（PRD Q9 硬约束）
- 状态管理：Pinia 2.x
- UI 库：uv-ui（uni-app + Vue3 优化）+ uni-ui 兜底
- HTTP：uni.request 二次封装（小程序兼容性最好，禁用 axios 因小程序不兼容）
- SSE 适配层：H5 用原生 EventSource；小程序用 `wx.request` 的 `onChunkReceived`（基础库 ≥ 2.20.1）

#### 部署 & 容器

**决策：Docker Compose（开发 & 简单生产）**
- 服务：`postgres:16-alpine` + 后端 `python:3.12-slim`
- 配置：`.env.example` 提供所有变量
- 反向代理：可选 nginx（生产）

### 1.2 完整技术栈一览

| 层 | 技术 | 版本 |
|----|------|------|
| 前端 | uni-app + Vue 3 + Vite + TypeScript | uni-app 3.x / Vue 3.4+ / Vite 5.x / TS 5.x |
| 前端状态 | Pinia | 2.x |
| 前端 UI | uv-ui + uni-ui | 最新 |
| 后端 | FastAPI + Uvicorn | 0.128+ / 0.39+ |
| ORM | SQLAlchemy 2.0 async + asyncpg | SA 2.0+ / asyncpg 0.30+ |
| 迁移 | Alembic | 1.13+ |
| 数据库 | PostgreSQL | 16+ |
| 排盘引擎 | iztro-py（已集成） | 0.3.4 |
| LLM | google-genai | 1.x |
| 认证 | PyJWT + passlib[bcrypt] | 2.10+ / 1.7+ |
| 加密 | cryptography | 43+ |
| 容器 | Docker + Docker Compose | — |

---

## 2. 后端项目结构（扩展现有 紫薇/）

> **硬约束**：所有后端代码必须在 `/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/` 目录内，不可另建。

```
紫薇/
├── app.py                          # 精简入口（保留排盘端点 + include_router 业务模块）
├── requirements.txt                # 扩展依赖
├── alembic.ini                     # Alembic 配置
├── .env.example                    # 环境变量模板
├── .gitignore                      # 排除 .env / .venv / __pycache__
├── docker-compose.yml              # PG + 后端服务编排
├── Dockerfile                      # 后端镜像
│
├── alembic/                        # 数据库迁移
│   ├── env.py
│   ├── script.py.mako
│   └── versions/                   # 迁移文件（首个为 9 张表初始化）
│
├── ziwei_app/                      # 业务代码包（新增，与 paipan 接口隔离）
│   ├── __init__.py
│   ├── core/                       # 核心配置/工具
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic Settings（读 .env）
│   │   ├── security.py             # JWT 编解码 + bcrypt + AES
│   │   ├── deps.py                 # FastAPI Depends（DB session, 当前用户, admin）
│   │   └── exceptions.py           # 业务异常 + 错误码定义
│   │
│   ├── db/                         # 数据库
│   │   ├── __init__.py
│   │   ├── base.py                 # AsyncEngine + async_sessionmaker
│   │   └── session.py              # get_db() 依赖
│   │
│   ├── models/                     # SQLAlchemy 2.0 ORM 模型（10 张表）
│   │   ├── __init__.py
│   │   ├── base.py                 # DeclarativeBase + UUID/时间字段 mixin
│   │   ├── user.py                 # User + UserProfile
│   │   ├── chart.py                # ChartData
│   │   ├── points.py               # PointsTransaction + CheckinRecord + PointsConfig
│   │   ├── template.py             # PromptTemplate + UserTemplate
│   │   ├── reading.py              # ReadingReport
│   │   └── admin.py                # Admin
│   │
│   ├── schemas/                    # Pydantic 输入/输出模型
│   │   ├── __init__.py
│   │   ├── common.py               # 通用 ResponseModel{code,data,message}
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── chart.py
│   │   ├── points.py
│   │   ├── template.py
│   │   ├── reading.py
│   │   └── admin.py
│   │
│   ├── api/v1/                     # 路由层（按业务模块拆分 router）
│   │   ├── __init__.py             # api_router = APIRouter(prefix="/api/v1")
│   │   ├── auth.py                 # /auth/register | /auth/login | /auth/token/refresh
│   │   ├── user.py                 # /user/me | /user/profile (GET/PUT)
│   │   ├── chart.py                # /chart/generate | /chart/me
│   │   ├── points.py               # /points/balance | /transactions | /checkin | ...
│   │   ├── templates.py            # /templates | /templates/{id} | /templates/{id}/unlock | /user/templates
│   │   ├── reading.py              # /reading/start (SSE) | /reading/reports | /reading/reports/{id}
│   │   ├── share.py                # /reading/reports/{id}/share | /share/{token}
│   │   └── admin/                  # 管理后台子路由
│   │       ├── __init__.py
│   │       ├── auth.py             # /admin/auth/login
│   │       ├── templates.py
│   │       ├── users.py
│   │       ├── points_config.py
│   │       └── stats.py
│   │
│   ├── services/                   # 业务逻辑层（无 HTTP 依赖，纯函数式）
│   │   ├── __init__.py
│   │   ├── auth_service.py         # 注册 / 登录 / Token 签发
│   │   ├── user_service.py
│   │   ├── chart_service.py        # 内部转调 iztro 排盘 + 持久化
│   │   ├── points_service.py       # 积分事务（行锁 + 流水原子化）
│   │   ├── checkin_service.py      # 签到 + 连续天数推算
│   │   ├── template_service.py     # 模板列表 / 解锁
│   │   ├── reading_service.py      # AI 解读 + Gemini 调用 + SSE 包装 + 退积分
│   │   ├── share_service.py        # share token 生成与校验
│   │   ├── admin_service.py        # 管理员业务
│   │   └── gemini_client.py        # Gemini API 封装（重试 + 超时）
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── ids.py                  # UUID 生成
│   │   ├── time.py                 # 时区/日期工具（统一 Asia/Shanghai）
│   │   ├── invite.py               # 邀请码生成（8 位字母数字）
│   │   ├── crypto.py               # AES 加解密 + 手机号哈希
│   │   └── prompt_renderer.py      # {{排盘数据}} 占位符替换
│   │
│   ├── paipan/                     # 现有 paipan 逻辑迁入（重构 app.py 时拆分）
│   │   ├── __init__.py
│   │   ├── router.py               # /paipan, /paipan/solar, /paipan/json, /paipan/solar/json
│   │   └── formatter.py            # _build_tree 等工具函数
│   │
│   └── seeds/
│       ├── __init__.py
│       ├── points_config.py        # 14 个默认积分配置
│       └── templates.py            # 7 个 PRD 预设模板
│
└── tests/                          # 测试
    ├── conftest.py                 # 共享 fixture（DB / TestClient / 用户）
    ├── test_paipan.py              # 现有 3+1 端点回归
    ├── test_auth.py
    ├── test_user.py
    ├── test_chart.py
    ├── test_points.py
    ├── test_templates.py
    ├── test_reading.py             # 含 SSE 流式 + 退积分
    ├── test_share.py
    ├── test_admin.py
    └── test_e2e.py                 # 完整链路
```

**app.py 改造方案**（保留向后兼容）：

```python
# app.py（重构后约 30 行）
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ziwei_app.paipan.router import router as paipan_router
from ziwei_app.api.v1 import api_router

app = FastAPI(title="紫微灵犀 API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

# 现有 3 个端点（向后兼容，URL 不变）
app.include_router(paipan_router, tags=["paipan-legacy"])
# 新业务 API
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
```

**paipan_router 同时挂载新增 `/paipan/solar/json`**，保持已有的 `/paipan` `/paipan/solar` `/paipan/json` URL 完全不变。

---

## 3. 前端项目结构（uni-app）

```
项目角色agent/输出物料/紫微灵犀/code/frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── manifest.json                   # uni-app 全局配置（小程序 appid / 分包 / 权限等）
├── pages.json                      # 页面注册 + tabBar + 分包 + window 样式
├── uni.scss                        # 全局 SCSS 变量（黑金令牌）
├── App.vue                         # 全局根组件
├── main.ts                         # 入口（Pinia / 全局组件注册）
├── env.d.ts
├── .env.development
├── .env.production
│
├── src/                            # 当 vite 项目结构（uni-app 兼容）
│   ├── pages/                      # 主包（必须 < 2MB）
│   │   ├── index/index.vue                # P01 首页
│   │   ├── login/login.vue                # P05 登录注册
│   │   ├── profile-setup/profile-setup.vue # P06 生辰完善
│   │   └── profile/profile.vue            # P04 个人中心（tab）
│   │
│   ├── sub-chart/                  # 分包：命盘
│   │   └── pages/
│   │       └── chart/chart.vue            # P02 命盘
│   │
│   ├── sub-reading/                # 分包：AI 解读
│   │   └── pages/
│   │       ├── reading/reading.vue        # P03 AI 解读
│   │       └── report/report.vue          # P09 报告详情
│   │
│   ├── sub-user/                   # 分包：积分中心 / 模板 / 报告
│   │   └── pages/
│   │       ├── points/points.vue          # P10 积分中心
│   │       ├── templates/templates.vue    # P07 模板商城
│   │       ├── template-detail/template-detail.vue  # P08 模板详情
│   │       ├── my-templates/my-templates.vue        # P11 我的模板
│   │       ├── my-reports/my-reports.vue            # P12 我的报告
│   │       └── invite/invite.vue                    # P13 邀请好友
│   │
│   ├── pages-admin/                # H5 only（小程序条件编译排除）
│   │   ├── login/login.vue                # A01
│   │   ├── templates/templates.vue        # A02
│   │   ├── users/users.vue                # A03
│   │   ├── points-config/points-config.vue # A04
│   │   └── stats/stats.vue                 # A05
│   │
│   ├── components/                 # 共享组件（黑金主题，对应 page-specs.md 第 0.4 节）
│   │   ├── BaseStarfield.vue       # SVG 星空底
│   │   ├── BaseAmbient.vue         # 顶部光晕
│   │   ├── BaseNav.vue             # 顶部导航
│   │   ├── BaseTabBar.vue          # 自定义 tab-bar（如启用，否则用 pages.json）
│   │   ├── BaseCornerDec.vue       # 四角金色装饰
│   │   ├── BaseActionBtn.vue       # 主 CTA
│   │   ├── BaseFormInput.vue       # 透明输入框
│   │   ├── BaseNativeSelect.vue    # 原生下拉
│   │   ├── BasePointsCard.vue      # 积分卡
│   │   ├── BaseAigcBadge.vue       # AIGC 标识徽章（页面级）
│   │   ├── BaseAigcDeclaration.vue # AIGC 卡片底部声明
│   │   ├── PalaceCell.vue          # 12 宫单元格
│   │   ├── ChartGrid.vue           # 4x4 + 中宫 2x2 命盘容器（核心）
│   │   ├── PalaceDetailModal.vue   # 宫位详情弹层
│   │   ├── TemplateCard.vue        # 模板卡片
│   │   ├── ReportCard.vue          # 报告卡片
│   │   └── EmptyState.vue          # 空态
│   │
│   ├── stores/                     # Pinia
│   │   ├── user.ts                 # 用户信息 + token + 积分余额
│   │   ├── chart.ts                # 当前命盘数据
│   │   ├── templates.ts            # 模板列表/已解锁
│   │   ├── reports.ts              # 历史报告
│   │   └── admin.ts                # 管理员（仅 H5 admin 页加载）
│   │
│   ├── services/                   # API 服务层（与后端 API 1:1）
│   │   ├── http.ts                 # uni.request 封装 + 拦截器 + Token 注入
│   │   ├── sse.ts                  # SSE 适配层（H5 EventSource / 小程序 chunk）
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── chart.ts
│   │   ├── points.ts
│   │   ├── templates.ts
│   │   ├── reading.ts
│   │   ├── share.ts
│   │   └── admin.ts
│   │
│   ├── types/                      # TypeScript 类型（来自 shared-types.md）
│   │   ├── api.ts                  # 所有 API Request/Response interface
│   │   ├── domain.ts               # 业务实体类型
│   │   └── enums.ts                # 共享枚举
│   │
│   ├── utils/
│   │   ├── format.ts               # 千分位 / 时辰名称 / 日期格式化
│   │   ├── validate.ts             # 手机号 / 密码校验
│   │   ├── storage.ts              # uni.setStorage 封装
│   │   ├── share.ts                # 分享适配（小程序原生 / H5 复制链接）
│   │   └── platform.ts             # 平台判断
│   │
│   └── styles/
│       ├── tokens.scss             # 设计令牌（CSS 变量定义）
│       ├── reset.scss              # uni-app 兼容样式重置
│       ├── starfield.scss          # 星空背景样式
│       └── animations.scss         # 共享动效
│
└── static/
    ├── icons/                      # SVG / PNG 图标（金色系）
    ├── fonts/                      # 字体子集化文件（NotoSerifSC + Cinzel 子集）
    └── images/                     # 装饰图（star-bg.svg）
```

**pages.json 关键配置**：

```json
{
  "pages": [
    { "path": "pages/index/index", "style": { "navigationStyle": "custom" } },
    { "path": "pages/login/login", "style": { "navigationStyle": "custom" } },
    { "path": "pages/profile-setup/profile-setup", "style": { "navigationStyle": "custom" } },
    { "path": "pages/profile/profile", "style": { "navigationStyle": "custom" } }
  ],
  "subPackages": [
    { "root": "sub-chart", "pages": [ { "path": "pages/chart/chart" } ] },
    { "root": "sub-reading", "pages": [
      { "path": "pages/reading/reading" },
      { "path": "pages/report/report" }
    ]},
    { "root": "sub-user", "pages": [
      { "path": "pages/points/points" },
      { "path": "pages/templates/templates" },
      { "path": "pages/template-detail/template-detail" },
      { "path": "pages/my-templates/my-templates" },
      { "path": "pages/my-reports/my-reports" },
      { "path": "pages/invite/invite" }
    ]}
  ],
  "tabBar": {
    "custom": true,
    "color": "rgba(255,255,255,0.3)",
    "selectedColor": "#D4AF37",
    "backgroundColor": "#000000",
    "list": [
      { "pagePath": "pages/index/index", "text": "首页" },
      { "pagePath": "sub-chart/pages/chart/chart", "text": "命盘" },
      { "pagePath": "sub-reading/pages/reading/reading", "text": "解盘" },
      { "pagePath": "pages/profile/profile", "text": "本我" }
    ]
  },
  "globalStyle": {
    "backgroundColor": "#000000",
    "navigationBarTextStyle": "white"
  },
  "preloadRule": {
    "pages/index/index": { "network": "all", "packages": ["sub-chart", "sub-user"] }
  }
}
```

---

## 4. 数据模型（Alembic 初始迁移）

### 4.1 表清单（10 张）

| 表名 | 说明 |
|------|------|
| users | 用户主表（手机号加密 + bcrypt） |
| user_profiles | 用户生辰档案（1:1） |
| chart_data | 排盘数据（1:1，可重排覆盖） |
| points_transactions | 积分流水 |
| checkin_records | 签到记录 |
| prompt_templates | 提示词模板 |
| user_templates | 用户已解锁模板（多对多） |
| reading_reports | AI 解读报告 |
| points_configs | 积分配置（管理后台可调整） |
| admins | 管理员账户 |

### 4.2 字段定义

#### users

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| phone_encrypted | VARCHAR(256) | NOT NULL | 手机号 AES 密文（base64） |
| phone_hash | VARCHAR(64) | NOT NULL, UNIQUE | SHA-256(phone)，用于查询 |
| password_hash | VARCHAR(128) | NOT NULL | bcrypt 哈希 |
| nickname | VARCHAR(32) | | 昵称（默认 "缘主****" + 手机后四位） |
| avatar_url | VARCHAR(256) | | 头像 |
| points_balance | INTEGER | NOT NULL DEFAULT 0 | 积分余额（兼并发，所有变更走 service 行锁） |
| invite_code | VARCHAR(8) | NOT NULL, UNIQUE | 邀请码 |
| invited_by | UUID | FK→users.id | 邀请人 |
| free_reading_used | BOOLEAN | NOT NULL DEFAULT FALSE | 首免标记（PRD v2.1 新增） |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

索引：
- `uniq_users_phone_hash` (phone_hash)
- `uniq_users_invite_code` (invite_code)
- `idx_users_invited_by` (invited_by)

#### user_profiles

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, UNIQUE, FK→users.id ON DELETE CASCADE | |
| birth_type | VARCHAR(8) | NOT NULL | 'solar' / 'lunar' |
| birth_year | INTEGER | NOT NULL | |
| birth_month | INTEGER | NOT NULL | |
| birth_day | INTEGER | NOT NULL | |
| birth_time_index | INTEGER | NOT NULL | 0-12 |
| gender | VARCHAR(8) | NOT NULL | 'male' / 'female' |
| is_leap_month | BOOLEAN | NOT NULL DEFAULT FALSE | |
| birth_place_province | VARCHAR(32) | | |
| birth_place_city | VARCHAR(32) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

#### chart_data

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, UNIQUE, FK→users.id ON DELETE CASCADE | 1:1 |
| profile_id | UUID | NOT NULL, FK→user_profiles.id | |
| chart_json | JSONB | NOT NULL | 完整 JSON |
| chart_text | TEXT | NOT NULL | 树形文本（用于 AI prompt） |
| api_params | JSONB | NOT NULL | 排盘 API 请求参数 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

#### points_transactions

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK→users.id | |
| type | VARCHAR(32) | NOT NULL | 8 种类型见下 |
| amount | INTEGER | NOT NULL | 正收入/负支出 |
| balance_after | INTEGER | NOT NULL | 变动后余额 |
| reference_id | UUID | | 模板/报告 id |
| description | VARCHAR(200) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

枚举（应用层）：`register_bonus / daily_checkin / share_reward / ad_reward / invite_reward / unlock_template / ai_reading / refund`

索引：`idx_points_tx_user_created` (user_id, created_at DESC)

#### checkin_records

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK→users.id | |
| checkin_date | DATE | NOT NULL | |
| consecutive_days | INTEGER | NOT NULL | 连续天数 |
| points_earned | INTEGER | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

唯一索引：`uniq_checkin_user_date` (user_id, checkin_date)

#### prompt_templates

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| name | VARCHAR(64) | NOT NULL, UNIQUE | |
| description | VARCHAR(200) | NOT NULL | |
| detail | TEXT | NOT NULL | |
| prompt_content | TEXT | NOT NULL | 含 `{{排盘数据}}` 等占位符 |
| tags | JSONB | NOT NULL DEFAULT '[]' | 字符串数组 |
| points_cost | INTEGER | NOT NULL DEFAULT 0 | 0=免费 |
| preview_image_url | VARCHAR(256) | | |
| status | VARCHAR(16) | NOT NULL DEFAULT 'active' | active/inactive/deleted |
| unlock_count | INTEGER | NOT NULL DEFAULT 0 | |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

#### user_templates

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK→users.id | |
| template_id | UUID | NOT NULL, FK→prompt_templates.id | |
| points_spent | INTEGER | NOT NULL | |
| unlocked_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

唯一索引：`uniq_user_template` (user_id, template_id)

#### reading_reports

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| user_id | UUID | NOT NULL, FK→users.id | |
| template_id | UUID | NOT NULL, FK→prompt_templates.id | |
| chart_id | UUID | NOT NULL, FK→chart_data.id | |
| prompt_snapshot | TEXT | NOT NULL | 实际发送给 AI 的 prompt |
| ai_response | TEXT | NOT NULL | AI 完整回复 |
| model_name | VARCHAR(64) | NOT NULL | gemini-2.5-pro |
| token_usage | JSONB | | { input_tokens, output_tokens } |
| points_spent | INTEGER | NOT NULL | |
| share_token | VARCHAR(32) | UNIQUE | nullable，生成时填 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

索引：`idx_reports_user_created` (user_id, created_at DESC) + `uniq_share_token` (share_token) where share_token IS NOT NULL

#### points_configs

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| key | VARCHAR(64) | NOT NULL, UNIQUE | 14 项 |
| value | INTEGER | NOT NULL | |
| description | VARCHAR(200) | | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

种子数据：14 个配置项（PRD 6 完整列表）

#### admins

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| username | VARCHAR(32) | NOT NULL, UNIQUE | |
| password_hash | VARCHAR(128) | NOT NULL | bcrypt |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

种子：默认 admin 账户由首次启动脚本创建（用户名 admin，初始密码读 `INITIAL_ADMIN_PASSWORD` 环境变量）

---

## 5. API 完整设计（30 个新端点 + 1 新增 paipan）

### 5.1 通用规范

- **统一前缀**：`/api/v1/`（管理后台 `/api/v1/admin/`）
- **认证方式**：`Authorization: Bearer <access_token>` Header
- **响应格式**：
  ```typescript
  { code: number, data: T | null, message: string }
  ```
  `code = 0` 表示成功；非 0 为业务错误（HTTP 状态码用 200/400/401/403/404/500 区分类别）
- **错误码段位**：
  - 0：成功
  - 10xxx：认证/用户
  - 20xxx：排盘/用户档案
  - 30xxx：积分
  - 40xxx：模板
  - 50xxx：AI 解读
  - 60xxx：分享
  - 90xxx：管理后台
- **分页参数**：`?page=1&page_size=20`，响应 `{ items, total, page, page_size }`
- **时区**：所有 datetime 用 ISO 8601 + 时区（默认 `+08:00`）

### 5.2 端点全表

#### 5.2.0 排盘新增端点

##### GET /paipan/solar/json
- 公开
- Query: `date`(YYYY-M-D) / `time_index`(0-12) / `gender`('男'/'女')
- Response: 同 `/paipan/json` 的 JSON 结构
- **实现**：复用 `_build_tree` 之外的 enrich 逻辑，将 `chart = astro.by_solar(...)` 替换 `astro.by_lunar(...)`

#### 5.2.1 认证

##### POST /api/v1/auth/register
- 公开
- Body: `{ phone: string(11), password: string(min=8), invite_code?: string }`
- 行为：
  1. 校验手机号格式 + 唯一性（基于 `phone_hash`）
  2. 创建 user，发放注册积分（默认 100，读 `points_configs.register_bonus`）
  3. 若 `invite_code` 有效，邀请人加积分（默认 50）
  4. 返回 `access_token` + `refresh_token` + `user_brief`
- 错误：10001 手机号已注册 / 10002 密码格式 / 10003 邀请码无效

##### POST /api/v1/auth/login
- 公开
- Body: `{ phone, password }`
- Response: 同 register
- 错误：10004 账号或密码错误

##### POST /api/v1/auth/token/refresh
- 公开
- Body: `{ refresh_token }`
- Response: `{ access_token, refresh_token }`
- 错误：10005 refresh token 无效或过期

#### 5.2.2 用户

##### GET /api/v1/user/me
- 用户认证
- Response: `{ id, nickname, avatar_url, phone_masked, points_balance, invite_code, free_reading_used, has_profile, created_at }`

##### GET /api/v1/user/profile
- 用户认证
- Response: 完整 UserProfile，未创建返回 null

##### PUT /api/v1/user/profile
- 用户认证
- Body: `{ birth_type, birth_year, birth_month, birth_day, birth_time_index, gender, is_leap_month, birth_place_province?, birth_place_city? }`
- 行为：upsert UserProfile，**自动触发排盘**（异步或同步实现见 6.2）
- 错误：20001 日期范围越界 / 20002 闰月校验失败

#### 5.2.3 排盘

##### POST /api/v1/chart/generate
- 用户认证
- Body: 空（基于当前用户的 profile）
- 行为：
  1. 读取 user_profile
  2. 内部调用 paipan 函数（agromono：lunar→`paipan_json`，solar→`paipan_solar_json`）
  3. upsert chart_data
- Response: ChartData 完整数据

##### GET /api/v1/chart/me
- 用户认证
- Response: ChartData，无则返回 null + 提示先调 generate

#### 5.2.4 积分

##### GET /api/v1/points/balance
- 用户认证
- Response: `{ balance: number }`

##### GET /api/v1/points/transactions
- 用户认证
- Query: `page`, `page_size`, `type?`
- Response: 分页流水列表

##### POST /api/v1/points/checkin
- 用户认证
- 行为：
  1. 检查今日是否已签到（uniq 索引）
  2. 计算连续天数（昨天有签到则 +1，否则重置为 1）
  3. 按表查 day_X 配置取积分
  4. 事务内：插入 checkin + 加积分 + 写流水
- Response: `{ consecutive_days, points_earned, balance }`
- 错误：30001 今日已签到

##### GET /api/v1/points/checkin/status
- 用户认证
- Response: `{ checked_in_today: bool, consecutive_days: int, next_reward: int, today_reward: int }`

##### POST /api/v1/points/share-reward
- 用户认证
- Body: `{ report_id?: UUID }`（可选，记录分享上下文）
- 行为：检查每日次数上限（默认 3），加积分（默认 10）
- 错误：30002 已达每日上限

##### POST /api/v1/points/ad-reward
- 用户认证
- Body: `{ ad_token: string }`（小程序广告回调 token，MVP 阶段可空，需后端校验签名）
- 行为：检查每日次数（默认 5），加积分（默认 20）
- 错误：30003 已达每日上限 / 30004 ad_token 无效

##### POST /api/v1/points/invite-reward
- 内部调用（注册流程触发，不暴露给前端）

#### 5.2.5 模板

##### GET /api/v1/templates
- 公开（未登录可浏览）
- Query: `page`, `page_size`, `tag?`
- Response: 分页列表，每项含 `is_unlocked`（如已登录）

##### GET /api/v1/templates/{id}
- 公开
- Response: 模板完整详情 + `is_unlocked`

##### POST /api/v1/templates/{id}/unlock
- 用户认证
- 行为：
  1. 检查未解锁
  2. 检查积分 >= points_cost
  3. 事务：扣积分 + 写流水(unlock_template) + 创建 user_template + template.unlock_count++
- Response: `{ unlocked_at, balance }`
- 错误：40001 已解锁 / 40002 积分不足 / 40003 模板已下架

##### GET /api/v1/user/templates
- 用户认证
- Query: `page`, `page_size`
- Response: 用户已解锁模板列表（含模板信息 + unlocked_at）

#### 5.2.6 AI 解读（核心 SSE）

##### POST /api/v1/reading/start
- 用户认证
- Body: `{ template_id }`
- **响应类型**：`text/event-stream`（SSE）
- 行为：
  1. 校验模板已解锁
  2. 校验排盘数据存在
  3. **首次免费判断**：若 `user.free_reading_used == false` 则跳过扣费，事务内扣费 + 标记 `free_reading_used=true`；否则正常扣 reading_cost（默认 10）
  4. 渲染 prompt（替换占位符）
  5. 调用 Gemini stream API
  6. 边接收边 yield SSE 事件 → 客户端
  7. 完整接收后写入 reading_reports
  8. **异常处理**：超时 60s / 空响应 / Gemini 异常 → 退积分（事务）+ 返回 `event: error` SSE 事件
- SSE 事件格式：
  ```
  event: meta
  data: {"report_id": "uuid", "model": "gemini-2.5-pro"}

  event: chunk
  data: {"text": "命宫主星..."}

  event: chunk
  data: {"text": "..."}

  event: done
  data: {"total_tokens": 1234, "report_id": "uuid"}

  // 或异常：
  event: error
  data: {"code": 50002, "message": "AI 服务异常，积分已退回", "refunded": 10}
  ```
- 错误码：
  - 50001 模板未解锁
  - 50002 AI 调用失败（含退积分）
  - 50003 积分不足（且非首免）
  - 50004 排盘数据缺失

##### GET /api/v1/reading/reports
- 用户认证
- Query: `page`, `page_size`
- Response: 分页报告列表（不含全文，含摘要前 100 字）

##### GET /api/v1/reading/reports/{id}
- 用户认证
- Response: 完整报告

#### 5.2.7 分享

##### POST /api/v1/reading/reports/{id}/share
- 用户认证
- 行为：生成 32 位 share_token，保存
- Response: `{ share_token, share_url }`

##### GET /api/v1/share/{token}
- 公开
- Response: 报告摘要（含 AIGC 水印元信息，便于前端渲染）+ 首段内容（≤ 500 字）+ 引导注册

#### 5.2.8 管理后台

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/v1/admin/auth/login | POST | 管理员登录（独立 admin token） |
| /api/v1/admin/templates | GET | 模板列表（含下架/已删） |
| /api/v1/admin/templates | POST | 新建模板 |
| /api/v1/admin/templates/{id} | PUT | 编辑 |
| /api/v1/admin/templates/{id}/status | PATCH | `{ status: 'active'\|'inactive' }` 上下架 |
| /api/v1/admin/templates/{id} | DELETE | 软删（status=deleted） |
| /api/v1/admin/users | GET | 用户列表（分页 + 模糊搜索 nickname/phone_hash） |
| /api/v1/admin/points-config | GET | 14 个配置 |
| /api/v1/admin/points-config/{key} | PUT | 修改单项 `{ value }` |
| /api/v1/admin/stats | GET | 数据概览 `{ total_users, total_chart, total_reports, total_unlocks, dau, top5_templates }` |

---

## 6. 关键技术方案

### 6.1 JWT 与认证

**access_token**：
- 算法：HS256
- 过期：7 天（PRD 硬约束）
- payload：`{ sub: user_id, type: "access", exp, iat }`

**refresh_token**：
- 算法：HS256
- 过期：30 天
- payload：`{ sub: user_id, type: "refresh", jti, exp, iat }`
- jti 用于未来支持服务端吊销（MVP 不实现，预留）

**admin_token**：
- 独立 secret（不同于用户）
- payload：`{ sub: admin_id, type: "admin", exp, iat }`
- 过期：8 小时

**依赖注入**：
- `get_current_user(token: str = Depends(oauth2_scheme))` → User 实体
- `get_current_admin(token: str = Depends(admin_oauth2_scheme))` → Admin 实体

### 6.2 排盘流程

由于现有 paipan 函数是同步的（iztro 调用），用 `asyncio.to_thread` 包装避免阻塞 event loop：

```python
# services/chart_service.py
async def generate_chart_for_user(db, user, profile):
    if profile.birth_type == 'lunar':
        # 转调现有 paipan_json 内部逻辑
        chart_dict = await asyncio.to_thread(_run_lunar_paipan, profile)
        chart_text = await asyncio.to_thread(_run_lunar_text, profile)
    else:
        chart_dict = await asyncio.to_thread(_run_solar_paipan_json, profile)
        chart_text = await asyncio.to_thread(_run_solar_text, profile)

    # upsert chart_data（行锁）
    ...
```

### 6.3 SSE 流式（AI 解读核心）

**后端实现**：

```python
# api/v1/reading.py
from fastapi.responses import StreamingResponse

@router.post("/reading/start")
async def start_reading(body: StartReadingReq, user=Depends(get_current_user), db=Depends(get_db)):
    # 1. 前置校验（模板已解锁 / 排盘数据 / 积分够 or 首免）
    ctx = await reading_service.prepare_reading(db, user, body.template_id)

    async def event_stream():
        try:
            # 发 meta
            yield f"event: meta\ndata: {json.dumps({'report_id': ctx.report_id, 'model': 'gemini-2.5-pro'})}\n\n"
            # 流式调用 Gemini
            full_text = []
            async for chunk in gemini_client.stream_generate(ctx.prompt):
                full_text.append(chunk.text)
                yield f"event: chunk\ndata: {json.dumps({'text': chunk.text})}\n\n"
            # 持久化报告
            await reading_service.save_report(db, ctx, "".join(full_text))
            yield f"event: done\ndata: {json.dumps({'report_id': ctx.report_id})}\n\n"
        except Exception as e:
            # 退积分
            await reading_service.refund(db, ctx)
            yield f"event: error\ndata: {json.dumps({'code': 50002, 'message': str(e), 'refunded': ctx.points_spent})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

**前端适配**（`services/sse.ts`）：

```typescript
// H5 用 EventSource；小程序用 wx.request + onChunkReceived（基础库 ≥ 2.20.1）
export function startSSE(url: string, body: any, token: string, handlers: SSEHandlers) {
  // #ifdef H5
  const ev = new EventSource(`${url}?token=${token}&body=${encodeURIComponent(JSON.stringify(body))}`);
  ev.addEventListener('meta', e => handlers.onMeta(JSON.parse(e.data)));
  ev.addEventListener('chunk', e => handlers.onChunk(JSON.parse(e.data)));
  ev.addEventListener('done', e => { handlers.onDone(JSON.parse(e.data)); ev.close(); });
  ev.addEventListener('error', e => { handlers.onError(...); ev.close(); });
  return () => ev.close();
  // #endif

  // #ifdef MP-WEIXIN
  const task = uni.request({
    url, method: 'POST', data: body,
    header: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    enableChunked: true,
    success: () => {}, fail: handlers.onError,
  });
  task.onChunkReceived((res: any) => {
    const text = decodeChunk(res.data);
    parseSSE(text, handlers); // 拆 event:/data: 行
  });
  return () => task.abort();
  // #endif
}
```

### 6.4 积分事务并发安全

所有积分变动 → 使用 PostgreSQL 行级锁：

```python
# services/points_service.py
async def change_points(db: AsyncSession, user_id: UUID, amount: int, type_: str, ref_id=None, desc=None):
    # 行锁
    user = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = user.scalar_one()
    new_balance = user.points_balance + amount
    if new_balance < 0:
        raise InsufficientPointsError()
    user.points_balance = new_balance
    db.add(PointsTransaction(
        user_id=user_id, type=type_, amount=amount,
        balance_after=new_balance, reference_id=ref_id, description=desc
    ))
    await db.flush()
    return new_balance
```

调用方负责事务边界（`async with db.begin():` ... `change_points(...)` ... 业务操作）。

### 6.5 Gemini 客户端封装

```python
# services/gemini_client.py
from google import genai
from google.genai import types as genai_types

class GeminiClient:
    def __init__(self, api_key, model="gemini-2.5-pro", timeout=60):
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._timeout = timeout

    async def stream_generate(self, prompt: str):
        async for chunk in await self._client.aio.models.generate_content_stream(
            model=self._model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.7, max_output_tokens=2048,
            ),
        ):
            if chunk.text:
                yield chunk
```

包含：
- 超时（默认 60s，从 settings 读）
- 重试（指数退避 1 次重试，避免占用太久）
- 异常透传供 service 层捕获并退积分

### 6.6 占位符渲染

```python
# utils/prompt_renderer.py
def render_prompt(template: str, ctx: dict) -> str:
    # ctx 包含 排盘数据 / 用户性别 / 用户出生信息
    out = template
    for k, v in ctx.items():
        out = out.replace(f"{{{{{k}}}}}", str(v))
    return out
```

调用前由 service 准备 ctx：
- `排盘数据` = chart_data.chart_text（树形文本，更适合 LLM）
- `用户性别` = profile.gender（"乾造"/"坤造"映射）
- `用户出生信息` = profile 的可读化字符串

### 6.7 命盘 4x4 + 中宫 2x2 排布

12 宫地支 → 固定网格位置（紫微斗数标准）：

```
+------+------+------+------+
| 巳   | 午   | 未   | 申   |
+------+------+------+------+
| 辰   |    中宫     | 酉   |
+------+    (基本    +------+
| 卯   |    信息)    | 戌   |
+------+------+------+------+
| 寅   | 丑   | 子   | 亥   |
+------+------+------+------+
```

CSS Grid 实现：

```css
.chart-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 4px;
  aspect-ratio: 1 / 1;
}
.palace-cell { /* 单宫格 */ }
.center {
  grid-column: 2 / 4;
  grid-row: 2 / 4;
}
```

地支 → grid 坐标映射常量（前端 utils）：

```typescript
const BRANCH_TO_GRID = {
  '巳': [1,1], '午': [1,2], '未': [1,3], '申': [1,4],
  '辰': [2,1], '酉': [2,4],
  '卯': [3,1], '戌': [3,4],
  '寅': [4,1], '丑': [4,2], '子': [4,3], '亥': [4,4],
};
```

### 6.8 触摸缩放手势（P02）

uni-app 用 `<movable-area>` + `<movable-view>` + 双指 scale，或自实现 `touchstart`/`touchmove` 监听。

---

## 7. 模块划分（开发阶段）

| 模块 | 后端范围 | 前端范围 | 依赖 |
|------|---------|---------|------|
| **M0 项目骨架** | Alembic 初始迁移（10 表）+ 配置 + DB 工具 + .env + Docker | uni-app 脚手架 + 设计令牌 + 共享组件（Starfield/Nav/TabBar/ActionBtn/AigcBadge） + http/sse 服务层 | 无 |
| **M1 认证** | auth router + service + 安全工具（JWT/bcrypt/AES）| P05 登录注册 + P06 生辰完善 | M0 |
| **M2 用户 + 排盘** | user router + chart router + paipan/solar/json + chart_service + paipan 重构入子目录 | P01 首页 + P02 命盘（4x4 + 中宫 2x2 + 触摸缩放） | M1 |
| **M3 积分** | points router + service（含 checkin/share/ad/invite） | P10 积分中心 + P01 首页签到入口 + P04 个人中心积分卡 | M1 |
| **M4 模板** | templates router + unlock 事务 + 7 个种子 | P07 模板商城 + P08 模板详情 + P11 我的模板 | M3 |
| **M5 AI 解读** | reading router + SSE + Gemini 客户端 + refund | P03 AI 解读（流式渲染） | M2 + M3 + M4 |
| **M6 报告 + 分享** | reading reports CRUD + share router | P09 报告详情 + P12 我的报告 + P13 邀请好友 | M5 |
| **M7 管理后台** | admin/* 全部端点 | A01-A05 五张管理页（H5 only） | M0 + M3 + M4 |
| **M8 集成 + E2E** | 联调验证 + 一键启动脚本 | E2E（Playwright H5） | 全部 |

**并行策略**：
- M0 完成后，M1 和 M7 后端骨架可并行（M7 admin auth 与 M1 user auth 共用 security 工具但路由不冲突）
- M2 和 M3 在 M1 完成后并行（chart 与 points 无依赖）
- M4 在 M3 完成后启动
- M5 必须等 M2 + M3 + M4 都好（强依赖）
- M6 = M5 后
- M7 前端可全程并行（数据 mock 后真接入）

---

## 8. 安全 & 配置

### 8.1 环境变量（.env.example）

```bash
# 数据库
DATABASE_URL=postgresql+asyncpg://ziwei:ziwei@localhost:5432/ziwei

# JWT
JWT_SECRET_USER=change-me-32-bytes-min
JWT_SECRET_ADMIN=change-me-different-32-bytes
JWT_ACCESS_EXPIRE_DAYS=7
JWT_REFRESH_EXPIRE_DAYS=30
JWT_ADMIN_EXPIRE_HOURS=8

# 加密
PHONE_ENC_KEY=base64-encoded-32-bytes-key

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-pro
GEMINI_TIMEOUT_SEC=60

# 管理员初始密码
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=admin123change

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:8080

# 服务
APP_DEBUG=true
LOG_LEVEL=INFO
```

### 8.2 安全清单

- ✅ 密码 bcrypt（cost=12）
- ✅ 手机号 AES-256-GCM（密文 + hash 列）
- ✅ JWT 7d/30d 双 token
- ✅ SQL 注入：SQLAlchemy 参数化
- ✅ 积分事务：行锁（`SELECT ... FOR UPDATE`）
- ✅ 速率限制：依赖 `slowapi`（注册/登录/解读 路径限流）
- ✅ Gemini API key 仅服务端
- ✅ admin token 独立 secret + 独立过期
- ✅ CORS 严格 allowlist（生产）
- ✅ pydantic 严格校验所有入参

---

## 9. 测试策略

| 层 | 工具 | 覆盖 |
|----|------|------|
| 后端单元 | pytest + pytest-asyncio | services 函数 |
| 后端集成 | httpx.AsyncClient | API 端点（含 SSE） |
| 后端契约 | 对照 shared-types.md | Request/Response 字段一致性 |
| 数据库 | pytest fixture + Alembic upgrade | 迁移可重复 |
| 前端组件 | Vitest + @vue/test-utils | 共享组件 |
| 前端集成 | uni-app 编译 H5 + Vitest | 页面渲染 |
| 端到端 | Playwright（H5） | 完整链路 |

每模块 PASS 标准：
- 单元测试覆盖 ≥ 60%
- 所有 API 至少有 1 个正常 + 1 个异常用例
- 关键事务（积分/解读退款）必须有竞态测试

---

## 10. 部署

**docker-compose.yml**（核心）：

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ziwei
      POSTGRES_PASSWORD: ziwei
      POSTGRES_DB: ziwei
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    env_file: .env
    depends_on: [postgres]
    ports:
      - "8000:8000"
    command: >
      sh -c "alembic upgrade head &&
             python -m ziwei_app.seeds.init_seeds &&
             uvicorn app:app --host 0.0.0.0 --port 8000"

volumes:
  pg_data:
```

**前端启动**：
- H5 dev：`pnpm dev:h5`
- 小程序：`pnpm dev:mp-weixin` 后用微信开发者工具导入 `dist/dev/mp-weixin/`

---

## 11. ADR（架构决策记录）

### ADR-001: 后端单服务扩展现有 紫薇/
- 状态：已采纳
- 上下文：PRD Q8 锁定，且现有 paipan 已稳定运行
- 决策：在 紫薇/ 内新增 ziwei_app/ 业务包，app.py 改为 include_router
- 权衡：放弃 monorepo 多服务隔离的灵活性，换取部署简单 + 排盘 API 复用
- 替代：考虑过 paipan 独立服务 + 业务服务通过 HTTP 调用，否决（增加部署复杂度）

### ADR-002: PyJWT 替代 python-jose
- 状态：已采纳
- 上下文：python-jose 自 2021 年停更，FastAPI 官方文档已切换
- 决策：使用 PyJWT 2.10+
- 权衡：API 略不同需重写示例代码，但维护性显著提升

### ADR-003: SQLAlchemy 2.0 async + Alembic
- 状态：已采纳
- 上下文：FastAPI 是 async 框架，必须配 async ORM
- 决策：SA 2.0 async 风格 + asyncpg + Alembic
- 权衡：放弃 SQLModel 的 Pydantic 一体化，分层更清晰

### ADR-004: 积分变动行锁
- 状态：已采纳
- 上下文：高并发场景（同时签到 / 解锁 / 解读）必须避免覆盖更新
- 决策：所有写积分用 `SELECT ... FOR UPDATE`
- 权衡：性能略低（相对乐观锁），但实现简单 + 数据库原生保证

### ADR-005: SSE 而非 WebSocket
- 状态：已采纳
- 上下文：AI 解读单向推送即可
- 决策：FastAPI StreamingResponse + text/event-stream
- 权衡：放弃双向通信能力，换取协议简单 + 浏览器原生 EventSource

### ADR-006: 小程序 SSE 适配方案
- 状态：已采纳
- 上下文：微信小程序不支持 EventSource
- 决策：用 `wx.request` + `enableChunked: true` + `onChunkReceived`，前端拆 SSE 帧
- 权衡：需自实现 SSE 解析；备选轮询方案更简单但延迟差
- 风险：基础库 < 2.20.1 不支持，需提示用户升级

### ADR-007: Gemini 新 SDK（google-genai）
- 状态：已采纳
- 上下文：旧 SDK `google-generativeai` 计划弃用
- 决策：使用 `google-genai` 1.x 新统一 SDK，支持 `client.aio` async
- 替代：LiteLLM 抽象层，否决（多一层抽象增加调试成本）

### ADR-008: 文件结构 — ziwei_app/ 子包隔离业务
- 状态：已采纳
- 上下文：避免污染 紫薇/ 根目录，且与 paipan 现有逻辑物理隔离
- 决策：业务代码统一放 `ziwei_app/`，paipan 函数移入 `ziwei_app/paipan/`
- 权衡：app.py 入口需 include 两个 router，但模块边界清晰

---

## 12. 任务派发说明

**给 fullstack-dev-agent 后端**：
- 工作目录：`/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/`
- 不建议覆盖 app.py 第一时间，先建 `ziwei_app/` 子包
- 完成 M0 后再重构 app.py 引入 router
- 所有 API 严格按 5.2 节 + shared-types.md 实现

**给 fullstack-dev-agent 前端**：
- 工作目录：`/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/code/frontend/`
- 用 `npx degit dcloudio/uni-preset-vue#vite-ts ziwei-frontend`（参考 `lincenying/vite-vue3-uniapp` 模板）
- 18 张 HTML 1:1 还原
- API 先 mock（types/mock.ts），后端就绪后切 真请求

**给 test-agent**：
- 后端：`cd 紫薇 && pytest tests/test_<模块>.py -v`
- 前端：`pnpm test:unit`
- E2E：`pnpm test:e2e`（H5 端）

---

## 完整性自检

- [x] PRD 第 3 章每个功能模块都有对应 API（30 + 1 = 31 个）
- [x] page-specs.md 每个交互都有数据支撑
- [x] 数据模型覆盖 10 张表（PRD + Admin）
- [x] 设计令牌（黑金主色 + Noto Serif SC + 字段全部）落地到 frontend/styles/tokens.scss
- [x] AIGC 三层防护：BaseAigcBadge + BaseAigcDeclaration + 分享水印（share 接口预留 watermark 字段）
- [x] 命盘 4x4 + 中宫 2x2 通过 ChartGrid 组件 + BRANCH_TO_GRID 常量保证
- [x] AI 解读异常退积分通过 try/except + service.refund() 保证
- [x] 首次免费解读：read service 检查 `user.free_reading_used`
- [x] 手机号 AES-256-GCM + bcrypt 密码 + JWT 7d
- [x] 积分事务行锁（FOR UPDATE）
- [x] 小程序分包：sub-chart / sub-reading / sub-user，主包 4 页
- [x] 17 项硬约束逐项落地

---

> **架构定稿信号**：本文档作为 fullstack-dev-agent 与 test-agent 的唯一输入源。后续开发若发现矛盾，必须回头修订本文档而非自行决定。
