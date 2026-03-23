# KnowBase Backend API

个人知识库后端服务 — 基于 FastAPI + PostgreSQL(pgvector) + Redis 的 RAG 知识管理系统。

## 技术栈

- **框架**: FastAPI 0.115 + Python 3.12
- **数据库**: PostgreSQL 16 + pgvector (向量索引)
- **缓存/队列**: Redis 7 + Celery
- **认证**: JWT (python-jose + bcrypt)
- **AI**: OpenAI 兼容 API (Embedding + LLM)
- **文件解析**: pdfplumber + python-docx + BeautifulSoup
- **Schema**: Pydantic v2

## 快速启动

### 1. 环境准备

```bash
cp .env.example .env
# 编辑 .env 填入实际配置（特别是 OPENAI_API_KEY）
```

### 2. 启动基础设施 (PostgreSQL + Redis)

```bash
docker-compose up -d postgres redis
```

### 3. 安装依赖 & 启动 API

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

### 4. (可选) 启动 Celery Worker

```bash
celery -A app.tasks.celery_app worker --loglevel=info
```

### 5. 全部容器化启动

```bash
docker-compose up -d
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | PostgreSQL 连接串 | postgresql+asyncpg://knowbase:knowbase123@localhost:5432/knowbase |
| REDIS_URL | Redis 连接串 | redis://localhost:6379/0 |
| JWT_SECRET_KEY | JWT 签名密钥 | change-me-jwt-secret |
| OPENAI_API_KEY | OpenAI API Key | (必填) |
| OPENAI_BASE_URL | OpenAI API 地址 | https://api.openai.com/v1 |
| LLM_MODEL | 对话模型名称 | gpt-4o |
| EMBEDDING_MODEL | 向量化模型 | text-embedding-3-small |
| UPLOAD_DIR | 文件上传目录 | ./uploads |
| MAX_FILE_SIZE_MB | 最大文件大小 | 50 |

## API 接口一览

### 健康检查
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |

### 认证 (M1)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/signup | 注册 |
| POST | /api/auth/login | 登录 |
| POST | /api/auth/logout | 退出 |
| POST | /api/auth/refresh | 刷新令牌 |
| GET | /api/auth/me | 当前用户信息 |
| GET | /api/auth/callback/:provider | OAuth 回调 |

### 文档管理 (M2 + M4)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/documents/upload | 文件上传 |
| POST | /api/documents/url | URL 保存 |
| GET | /api/documents | 列表(分页+筛选) |
| GET | /api/documents/:id | 详情 |
| DELETE | /api/documents/:id | 删除 |
| PATCH | /api/documents/:id/tags | 更新标签 |
| POST | /api/documents/batch-delete | 批量删除 |
| PATCH | /api/documents/:id/space | 移动空间 |
| GET | /api/documents/:id/related | 相关推荐 |

### AI 问答 (M3)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat | SSE 流式问答 |
| GET | /api/chat/history | 对话列表 |
| GET | /api/chat/:id | 对话详情 |
| POST | /api/chat/:id/feedback | 反馈 |

### 搜索 (M3)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/documents/search | 语义搜索 |

### 知识空间 (M5)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/spaces | 列表 |
| POST | /api/spaces | 创建 |
| PATCH | /api/spaces/:id | 更新 |
| DELETE | /api/spaces/:id | 删除 |
| GET | /api/spaces/:id/stats | 统计 |

### 用户设置 (M5)
| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | /api/users/me | 更新用户信息 |
| PATCH | /api/users/me/password | 修改密码 |
| POST | /api/users/me/avatar | 上传头像 |
| GET | /api/users/me/usage | 用量统计 |
| POST | /api/export | 数据导出 |
| DELETE | /api/users/me | 删除账户 |

## curl 测试示例

```bash
# 健康检查
curl http://localhost:8000/api/health

# 注册
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 获取当前用户 (替换 TOKEN)
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# 上传文件
curl -X POST http://localhost:8000/api/documents/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@/path/to/document.pdf"

# 保存 URL
curl -X POST http://localhost:8000/api/documents/url \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/article"}'

# 文档列表
curl "http://localhost:8000/api/documents?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"

# AI 问答 (SSE)
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我总结一下上传的文档"}' \
  --no-buffer

# 语义搜索
curl "http://localhost:8000/api/documents/search?q=关键词" \
  -H "Authorization: Bearer TOKEN"

# 创建知识空间
curl -X POST http://localhost:8000/api/spaces \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"新项目","description":"项目描述"}'

# 用量统计
curl http://localhost:8000/api/users/me/usage \
  -H "Authorization: Bearer TOKEN"
```

## 项目结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 入口 + 中间件
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── dependencies.py      # 依赖注入(认证等)
│   ├── models/
│   │   ├── database.py      # SQLAlchemy ORM 模型
│   │   └── schemas.py       # Pydantic v2 Schema
│   ├── routers/
│   │   ├── health.py        # 健康检查
│   │   ├── auth.py          # 认证(注册/登录/JWT)
│   │   ├── documents.py     # 文档CRUD
│   │   ├── chat.py          # AI 问答
│   │   ├── search.py        # 语义搜索
│   │   ├── spaces.py        # 知识空间
│   │   └── users.py         # 用户设置
│   ├── services/
│   │   ├── rag_engine.py    # RAG 检索+生成
│   │   ├── document_parser.py # 文件解析
│   │   ├── embedding_service.py # 向量化
│   │   ├── vector_store.py  # pgvector 操作
│   │   ├── llm_service.py   # LLM 调用
│   │   ├── tag_generator.py # 标签/摘要生成
│   │   ├── web_scraper.py   # 网页抓取
│   │   └── file_storage.py  # 文件存储
│   ├── tasks/
│   │   ├── celery_app.py    # Celery 配置
│   │   ├── parse_task.py    # 异步解析任务
│   │   └── embed_task.py    # 向量化任务
│   └── utils/
│       ├── chunking.py      # 文本分块
│       └── prompts.py       # Prompt 模板
├── alembic/                 # 数据库迁移
├── tests/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```
