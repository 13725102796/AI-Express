# 端到端功能测试报告 - Round 1

> 测试日期：2026-03-23
> 环境：Docker PostgreSQL 16 + Redis 7 + FastAPI :8000

## 环境状态

| 服务 | 状态 |
|------|------|
| PostgreSQL + pgvector | ✅ 运行中，12 张表自动创建 |
| Redis | ✅ 运行中 |
| FastAPI 后端 | ✅ 运行中，健康检查通过 |
| Next.js 前端 | ✅ 运行中 :3001 |

## 测试结果

| 步骤 | 操作 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| D3 | 注册 | 200 + token | ✅ 返回 access_token + refresh_token | ✅ PASS |
| D3 | 登录 | 200 + token | ✅ 返回 token | ✅ PASS |
| D3 | /me | 用户信息 | ✅ 返回 id/name/email/plan | ✅ PASS |
| D3 | 重复注册 | 409 EMAIL_EXISTS | ✅ 正确拒绝 | ✅ PASS |
| D3 | 错误密码 | 401 | ✅ INVALID_CREDENTIALS | ✅ PASS |
| D4 | 上传 Markdown | 200 + doc_id | ✅ 返回 id + status=processing | ✅ PASS |
| D4 | 保存网页 URL | 200 + doc_id | ✅ 返回 id + status=processing | ✅ PASS |
| D4 | 不支持格式 | 400 | ✅ UNSUPPORTED_FORMAT | ✅ PASS |
| D5 | 文档列表 | 返回已上传文件 | ✅ 2 条记录 | ✅ PASS |
| D5 | 解析完成 | status=ready | ❌ 仍为 processing | ❌ FAIL |
| D6 | 语义搜索 | 返回结果 | ❌ 路由冲突 UUID 解析错误 | ❌ FAIL |
| D7 | AI 问答 | 未测试（依赖 D5/D6） | — | ⏳ |

## Bug 清单

### B-01 [P0] 异步解析管道未触发

**描述**：文件上传后 status 一直停在 "processing"，内容未被提取、向量化和标签生成。

**根因**：后端代码使用 Celery 异步任务（`app/tasks/parse_task.py`），但 Celery worker 未启动。在开发环境下，需要同步回退方案或在 API 请求中直接执行解析。

**修复建议**：
1. 方案 A：在 `documents.py` 上传接口中，如果 `APP_ENV=development`，直接同步调用解析管道（不走 Celery）
2. 方案 B：在 docker-compose up 时自动启动 Celery worker
3. 推荐方案 A（开发体验更好），同时保留 Celery 用于生产环境

### B-02 [P0] 搜索路由与文档详情路由冲突

**描述**：`GET /api/documents/search?q=RAG` 被 `GET /api/documents/{doc_id}` 匹配，FastAPI 将 "search" 作为 UUID 解析导致 422 错误。

**根因**：FastAPI 路由匹配顺序问题。`/api/documents/{doc_id}` 的路径参数会贪婪匹配所有字符串。

**修复建议**：
1. 将搜索路由放在文档详情路由之前（FastAPI 按声明顺序匹配）
2. 或改用独立前缀：`/api/search?q=...`（tech-architecture.md 已有此别名）
3. 或给 doc_id 参数添加 UUID 正则约束

## 判定：QA FAIL — 需修复 2 个 P0 Bug 后重测
