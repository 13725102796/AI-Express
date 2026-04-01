---
name: _dev-standards
description: 企业级开发规范 — 所有开发类 agent（tech-architect、fullstack-dev、test）共同遵循的编码、API、数据库、安全、Git、测试标准。
---

# 企业级开发规范 v1

> 本规范是 tech-architect-agent 设计架构时的**约束输入**，也是 fullstack-dev-agent 编码时的**执行标准**。
> test-agent 依据本规范中的标准进行验收判定。

---

## 1. 项目结构规范

### 1.1 Monorepo 标准目录

```
code/
├── frontend/
│   ├── src/
│   │   ├── app/                    # 路由/页面（Next.js App Router 或等价）
│   │   ├── components/
│   │   │   ├── ui/                 # 原子组件（Button, Input, Badge...）
│   │   │   ├── composed/           # 分子/有机体组件（Modal, Card, Navbar...）
│   │   │   └── pages/              # 页面级组件（仅在此处组装布局）
│   │   ├── hooks/                  # 自定义 hooks
│   │   ├── services/               # API 调用层（每个模块一个文件）
│   │   ├── stores/                 # 状态管理（Zustand/Jotai/等）
│   │   ├── types/                  # 类型定义（引用 shared-types）
│   │   ├── styles/                 # 全局样式 + 设计令牌
│   │   ├── lib/                    # 工具函数
│   │   └── config/                 # 环境配置
│   ├── public/                     # 静态资源
│   ├── __tests__/                  # 测试文件
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
├── backend/
│   ├── src/ 或 app/
│   │   ├── api/ 或 routes/         # API 路由定义
│   │   ├── services/               # 业务逻辑层
│   │   ├── models/                 # 数据模型/ORM
│   │   ├── middleware/             # 中间件（auth, logging, error...）
│   │   ├── schemas/                # 请求/响应校验 Schema
│   │   ├── utils/                  # 工具函数
│   │   └── config/                 # 配置管理
│   ├── migrations/                 # 数据库迁移文件
│   ├── tests/                      # 测试文件
│   ├── .env.example
│   └── README.md
└── shared/
    └── types/ 或 shared-types.md   # 前后端共享类型
```

### 1.2 文件命名规范

| 类型 | 前端规范 | 后端规范 |
|------|---------|---------|
| 组件 | `PascalCase.tsx` (如 `UserCard.tsx`) | — |
| 页面/路由 | 框架约定（Next.js: `page.tsx`） | `snake_case.py` 或 `camelCase.ts` |
| hooks | `use` 前缀 `camelCase.ts` (如 `useAuth.ts`) | — |
| 服务/API 层 | `camelCase.ts` (如 `userService.ts`) | `snake_case.py` 或 `camelCase.ts` |
| 类型文件 | `camelCase.ts` 或 `PascalCase.ts` | 同前端 |
| 测试文件 | `*.test.ts` 或 `*.spec.ts` | `test_*.py` 或 `*.test.ts` |
| 配置文件 | `kebab-case` (如 `.env.example`) | 同前端 |
| 数据库迁移 | — | `YYYYMMDDHHMMSS_description.sql/py` |

### 1.3 命名约定

| 范围 | 风格 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `getUserById`, `isLoading` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 类/组件/接口 | PascalCase | `UserService`, `AuthMiddleware` |
| CSS 变量 | kebab-case + 语义前缀 | `--color-primary`, `--space-4` |
| 数据库表 | snake_case 复数 | `users`, `knowledge_bases` |
| 数据库字段 | snake_case | `created_at`, `user_id` |
| API 路径 | kebab-case 复数 | `/api/knowledge-bases/:id` |
| 环境变量 | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |
| 枚举值 | UPPER_SNAKE_CASE | `UserRole.ADMIN` |

---

## 2. API 设计规范（RESTful）

### 2.1 URL 设计

```
# 标准 CRUD
GET    /api/v1/{resources}          # 列表（分页）
GET    /api/v1/{resources}/:id      # 详情
POST   /api/v1/{resources}          # 创建
PUT    /api/v1/{resources}/:id      # 全量更新
PATCH  /api/v1/{resources}/:id      # 部分更新
DELETE /api/v1/{resources}/:id      # 删除

# 非 CRUD 操作
POST   /api/v1/{resources}/:id/{action}   # 如 /api/v1/users/:id/activate

# 嵌套资源（最多 2 层）
GET    /api/v1/{parent}/:parentId/{children}
```

**规则**：
- URL 使用 kebab-case，复数名词，不用动词
- 版本号放在 URL 路径中（`/api/v1/`），初始版本即带 v1
- 路径参数用 `:id`，查询参数用 `?key=value`
- 嵌套不超过 2 层，超过时用查询参数 `?parentId=xxx`

### 2.2 统一响应格式

```typescript
// 成功响应
{
  "code": 0,
  "data": { ... },
  "message": "success"
}

// 分页响应
{
  "code": 0,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  },
  "message": "success"
}

// 错误响应
{
  "code": 40001,           // 业务错误码（非 HTTP 状态码）
  "data": null,
  "message": "用户名已存在",
  "details": {             // 可选，开发环境返回
    "field": "username",
    "constraint": "unique"
  }
}
```

### 2.3 业务错误码规范

| 范围 | 含义 | 示例 |
|------|------|------|
| 0 | 成功 | — |
| 40000-40099 | 参数校验错误 | 40001 必填字段缺失, 40002 格式不合法 |
| 40100-40199 | 认证错误 | 40101 未登录, 40102 Token 过期, 40103 权限不足 |
| 40400-40499 | 资源不存在 | 40401 用户不存在, 40402 文件不存在 |
| 40900-40999 | 业务冲突 | 40901 用户名已存在, 40902 并发冲突 |
| 50000-50099 | 服务内部错误 | 50001 数据库错误, 50002 第三方服务不可用 |

### 2.4 分页参数标准

```
GET /api/v1/resources?page=1&pageSize=20&sort=created_at&order=desc

参数：
- page: 从 1 开始（默认 1）
- pageSize: 每页条数（默认 20，最大 100）
- sort: 排序字段
- order: asc | desc（默认 desc）
- 搜索: q=关键词 或 filter[field]=value
```

### 2.5 API 安全标准

- 所有写操作（POST/PUT/PATCH/DELETE）需要认证
- 使用 Bearer Token（JWT）认证：`Authorization: Bearer <token>`
- Token 有效期：access_token 15min-2h，refresh_token 7-30d
- 敏感操作（删除、修改密码）需二次验证或 CSRF Token
- 所有输入必须校验（类型、长度、范围、格式）
- 文件上传限制大小、类型白名单
- 速率限制：默认 100 req/min/user，登录接口 10 req/min/ip

---

## 3. 数据库设计规范

### 3.1 表设计标准

```sql
-- 每张表必须包含的元字段
CREATE TABLE examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- 或自增 BIGINT
  -- ... 业务字段 ...
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 软删除（按需）
-- deleted_at TIMESTAMP WITH TIME ZONE  -- NULL 表示未删除
```

**规则**：
- 主键：优先 UUID（分布式安全），简单项目可用自增 BIGINT
- 时间字段：必须带时区（`TIMESTAMP WITH TIME ZONE`）
- 必有 `created_at` + `updated_at`
- 外键字段命名：`{关联表单数}_id`（如 `user_id`）
- 布尔字段前缀：`is_` 或 `has_`（如 `is_active`）
- 枚举用 VARCHAR + 应用层校验（不用数据库 ENUM，便于迁移）

### 3.2 索引规范

```sql
-- 命名规范：idx_{表名}_{字段名}
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);

-- 唯一约束
CREATE UNIQUE INDEX uniq_users_email ON users(email);
```

**规则**：
- 外键字段必须有索引
- 高频查询字段建索引
- 复合索引遵循最左前缀原则
- 避免过度索引（写多读少的表控制在 5 个以内）

### 3.3 Migration 规范

- 每次变更一个 migration 文件，不合并多个无关变更
- 命名格式：`YYYYMMDDHHMMSS_short_description`
- 必须可回滚（提供 down/rollback 逻辑）
- 不在 migration 中写业务数据（种子数据用单独的 seed 文件）
- 生产环境不允许 `DROP COLUMN` 直接执行——先标记废弃，下个版本再删

---

## 4. 前端编码规范

### 4.1 组件规范

```tsx
// 标准组件结构
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  // 1. hooks 在顶部
  // 2. 派生状态
  // 3. 事件处理函数
  // 4. return JSX
}
```

**规则**：
- Props 用 interface 定义（不用 type），export 以便下游引用
- 默认值在解构时设置，不用 `defaultProps`
- 每个组件一个文件，文件名 = 组件名
- 不超过 300 行——超过则拆分
- 避免 `any` 类型，用 `unknown` + 类型守卫

### 4.2 状态管理规范

| 状态范围 | 方案 | 示例 |
|---------|------|------|
| 组件内部 | `useState` / `useReducer` | 表单输入、展开/收起 |
| 跨组件（同页面） | Context 或 Zustand store | 页面级筛选条件、选中状态 |
| 全局状态 | Zustand / Jotai | 用户信息、主题、权限 |
| 服务端数据 | TanStack Query / SWR | API 数据缓存、分页、乐观更新 |

**规则**：
- 服务端数据不放在全局 store——用 TanStack Query 管理
- 避免 prop drilling 超过 3 层——用 Context 或 store
- 表单状态用 React Hook Form 或等价库，不手写 `useState` 链

### 4.3 API 调用层规范

```typescript
// services/userService.ts
import type { LoginRequest, LoginResponse } from '@/types/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

class UserService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  private async handleError(res: Response): Promise<ApiError> {
    const body = await res.json().catch(() => ({}));
    return { code: body.code ?? res.status, message: body.message ?? res.statusText };
  }
}

export const userService = new UserService();
```

**规则**：
- 每个业务模块一个 Service 文件
- 请求/响应类型从 shared-types 导入，不自定义
- 统一错误处理（不在每个调用处 try-catch）
- API 地址通过环境变量配置（`NEXT_PUBLIC_API_URL`）
- 不在组件中直接写 `fetch`——通过 Service 层封装

### 4.4 样式规范

- 使用设计令牌系统（CSS 变量），禁止硬编码色值/间距/字号
- 间距只用 4 的倍数：4/8/12/16/20/24/32/48/64px
- 响应式断点统一：`375px`（移动）、`768px`（平板）、`1024px`（桌面）、`1440px`（宽屏）
- z-index 层级统一：dropdown=100, sticky=200, modal=300, toast=400, tooltip=500

---

## 5. 后端编码规范

### 5.1 分层架构

```
请求 → Router（路由）→ Middleware（中间件）→ Controller（控制器）→ Service（业务）→ Repository/Model（数据）
```

**规则**：
- Router：只负责路由映射和参数提取
- Middleware：横切关注点（auth、logging、rate-limit、cors、error-handling）
- Controller/Handler：请求校验 + 调用 Service + 格式化响应，不含业务逻辑
- Service：纯业务逻辑，不依赖 HTTP 概念（不引用 req/res）
- Repository/Model：数据访问层，封装 SQL/ORM 查询

### 5.2 错误处理规范

```python
# Python 示例
class AppError(Exception):
    def __init__(self, code: int, message: str, status: int = 400):
        self.code = code
        self.message = message
        self.status = status

# 统一错误处理中间件
@app.exception_handler(AppError)
async def app_error_handler(request, exc):
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, "data": None, "message": exc.message}
    )
```

**规则**：
- 所有业务错误用自定义 AppError，不直接抛原生异常
- 错误中间件统一捕获并格式化
- 生产环境不暴露堆栈信息
- 未预期的异常返回 500 + 通用消息 + 日志记录完整堆栈

### 5.3 日志规范

| 级别 | 用途 | 示例 |
|------|------|------|
| ERROR | 需要立即关注的错误 | 数据库连接失败、未处理异常 |
| WARN | 潜在问题但不影响功能 | 接口响应慢、重试成功 |
| INFO | 关键业务事件 | 用户注册、订单创建、服务启动 |
| DEBUG | 开发调试信息 | SQL 查询、请求/响应详情 |

**规则**：
- 每条日志包含：时间戳、级别、请求 ID（traceId）、消息
- 不在日志中输出密码、Token、密钥等敏感信息
- 生产环境默认 INFO 级别
- 请求入口和出口各记一条 INFO 日志（含耗时）

### 5.4 安全规范（OWASP Top 10 防护）

| 风险 | 防护措施 |
|------|---------|
| SQL 注入 | 使用参数化查询 / ORM，禁止字符串拼接 SQL |
| XSS | 前端框架自动转义 + CSP Header |
| CSRF | SameSite Cookie + CSRF Token（表单提交场景） |
| 敏感数据泄露 | HTTPS、密码 bcrypt 哈希、日志脱敏 |
| 认证绕过 | 每个受保护路由都经过 auth 中间件，不依赖前端隐藏 |
| 文件上传 | 白名单文件类型、大小限制、存储隔离、不执行上传内容 |
| 依赖漏洞 | 定期 `npm audit` / `pip audit`，不用已知漏洞版本 |
| 越权访问 | 数据查询加 `WHERE user_id = :currentUser`，不信任前端传的 userId |

---

## 6. Git 与版本控制规范

### 6.1 分支命名

```
main                    # 生产分支（受保护）
develop                 # 开发主分支
feature/{ticket}-{desc} # 功能分支 (如 feature/KB-12-user-auth)
fix/{ticket}-{desc}     # 修复分支
hotfix/{desc}           # 紧急修复
```

### 6.2 Commit Message 规范（Conventional Commits）

```
{type}({scope}): {description}

type:
  feat     — 新功能
  fix      — Bug 修复
  refactor — 重构（不改功能）
  style    — 代码格式（不影响逻辑）
  docs     — 文档
  test     — 测试
  chore    — 构建/工具/依赖
  perf     — 性能优化

scope: 模块名（可选）
description: 祈使句，首字母小写，不加句号

示例:
  feat(auth): add JWT refresh token endpoint
  fix(upload): handle file size exceeding limit
  refactor(api): extract pagination logic to middleware
```

### 6.3 .gitignore 标准

```
# 必须忽略
node_modules/
.env
.env.local
*.pyc
__pycache__/
.DS_Store
dist/
build/
*.db
*.sqlite
*.log

# IDE
.vscode/settings.json
.idea/
```

---

## 7. 测试规范

### 7.1 测试分层

| 层级 | 覆盖范围 | 工具 | 执行频率 |
|------|---------|------|---------|
| 单元测试 | 纯函数、工具方法 | Vitest/Jest/Pytest | 每次提交 |
| 集成测试 | API 端点 + 数据库 | Supertest/httpx | 每次提交 |
| 组件测试 | UI 组件渲染 + 交互 | Testing Library | 每次提交 |
| E2E 测试 | 完整业务流程 | Playwright | 每次发布 |

### 7.2 测试命名规范

```
// 前端
describe('UserCard', () => {
  it('should render user name and avatar', () => { ... });
  it('should show loading skeleton when data is pending', () => { ... });
  it('should call onDelete when delete button is clicked', () => { ... });
});

// 后端
def test_create_user_returns_201_with_valid_data():
def test_create_user_returns_400_when_email_missing():
def test_create_user_returns_409_when_email_exists():
```

**命名格式**：`should {expected behavior} when {condition}`

### 7.3 测试覆盖率要求

| 代码类型 | 最低覆盖率 |
|---------|-----------|
| 业务逻辑层（Service） | 80% |
| API 路由/控制器 | 70% |
| 工具函数 | 90% |
| UI 组件 | 60%（关键交互路径） |
| 整体项目 | 70% |

---

## 8. 环境与配置规范

### 8.1 环境变量管理

```bash
# .env.example（提交到 Git，作为模板）
# ---- 必填 ----
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=2h

# ---- 可选 ----
API_PORT=8000
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379

# ---- 第三方服务 ----
# OPENAI_API_KEY=sk-...
# S3_BUCKET=my-bucket
```

**规则**：
- `.env` 绝不提交（在 .gitignore 中）
- `.env.example` 必须提交（含所有变量名 + 注释 + 示例值）
- 区分必填和可选（必填项启动时校验，缺失则报错退出）
- 不同环境用不同 `.env` 文件（`.env.development`, `.env.production`）

### 8.2 README 标准模板

```markdown
# {项目名}

## 快速启动

### 前置条件
- Node.js >= 18 / Python >= 3.11
- PostgreSQL >= 15
- pnpm >= 8 (前端)

### 安装
\`\`\`bash
# 后端
cd code/backend
cp .env.example .env  # 编辑 .env 填入实际值
pip install -r requirements.txt  # 或 pnpm install
python -m alembic upgrade head   # 数据库迁移

# 前端
cd code/frontend
cp .env.example .env.local
pnpm install
\`\`\`

### 启动
\`\`\`bash
# 后端
cd code/backend && python main.py  # 默认 http://localhost:8000

# 前端
cd code/frontend && pnpm dev       # 默认 http://localhost:3000
\`\`\`

### API 文档
启动后访问 http://localhost:8000/docs (Swagger UI)

## 目录结构
[简要说明]

## 环境变量
见 `.env.example`
```

---

## 9. 代码质量基线

### 9.1 不可出现的代码

```typescript
// ❌ 禁止
console.log('debug')           // 用 logger，不用 console
// @ts-ignore                  // 修复类型而非忽略
// eslint-disable              // 修复 lint 而非禁用
any                            // 用 unknown + 类型守卫
eval()                         // 安全风险
innerHTML = userInput           // XSS 风险
`SELECT * FROM users WHERE id = '${id}'`  // SQL 注入
process.env.JWT_SECRET || 'default-secret' // 不安全的默认值
```

### 9.2 必须遵循的模式

```typescript
// ✅ 强制
// 1. 输入校验在边界层（API 入口）
const schema = z.object({ email: z.string().email(), name: z.string().min(1).max(100) });

// 2. 错误用自定义类型，不用字符串
throw new AppError(40401, '用户不存在');  // 不是 throw new Error('user not found')

// 3. 异步操作有超时
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000);

// 4. 环境变量启动时校验
function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing env: ${missing.join(', ')}`);
}
```

---

## 10. 交付检查清单（Definition of Done）

一个模块的代码在声称"完成"前，必须满足：

### 后端
- [ ] API 可通过 curl/httpie 测试，返回格式符合第 2 节规范
- [ ] 错误响应使用业务错误码（第 2.3 节），不裸抛异常
- [ ] 数据库 migration 可执行且可回滚
- [ ] 敏感信息通过环境变量管理
- [ ] 输入校验覆盖所有 API 端点
- [ ] 健康检查端点 `/health` 可用
- [ ] README 包含启动步骤

### 前端
- [ ] TypeScript 编译零错误
- [ ] ESLint 零 error 级别警告
- [ ] 所有颜色/间距/字体引用设计令牌（Grep 零硬编码值）
- [ ] 移动端（375px）布局无溢出
- [ ] 所有交互元素有 hover/focus/disabled 状态
- [ ] API 调用通过 Service 层，类型与 shared-types 一致
- [ ] `pnpm dev` 或 `npm run dev` 可启动

### 全栈
- [ ] 前后端可同时启动且正常通信
- [ ] 完整 CRUD 流程可跑通
- [ ] 错误场景有正确提示（不是白屏或空白 toast）
- [ ] .env.example 包含所有需要的变量
