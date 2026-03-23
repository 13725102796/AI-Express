# KnowBase 端到端功能测试最终报告

> 测试日期：2026-03-23
> 环境：Docker PostgreSQL 16 + Redis 7 + FastAPI :8000 + Next.js :3001
> LLM：本地 Claude CLI (haiku)
> OCR：tesseract 5.5.2 + pytesseract

## QA 判定：✅ PASS

---

## 环境状态

| 服务 | 状态 | 版本 |
|------|------|------|
| PostgreSQL + pgvector | ✅ | 16 |
| Redis | ✅ | 7-alpine |
| FastAPI 后端 | ✅ | :8000 |
| Next.js 前端 | ✅ | :3001 |
| Claude CLI | ✅ | haiku 模型 |
| tesseract OCR | ✅ | 5.5.2 |

## 全格式上传→解析→入库→搜索→AI问答

| 格式 | 测试文件 | 上传 | 解析 | 入库 | 搜索验证 | AI 问答引用 |
|------|---------|:----:|:----:|:----:|:--------:|:----------:|
| PDF | financial-report.pdf | ✅ ready | ✅ 文本提取 | ✅ 1 chunk | ✅ revenue | ✅ [3] |
| Word | competitor-analysis.docx | ✅ ready | ✅ 段落提取 | ✅ 4 chunks | ✅ competitor | ✅ [4-7] |
| CSV | sales-data.csv | ✅ ready | ✅ 行→自然语言 | ✅ 6 chunks | ✅ Beijing→第1行 | ✅ |
| TXT | meeting-notes.txt | ✅ ready | ✅ 段落分割 | ✅ 3 chunks | ✅ MVP | ✅ [8-10] |
| Markdown | rag-notes.md | ✅ ready | ✅ 段落分割 | ✅ 3 chunks | ✅ 混合检索 | ✅ [1-2] |
| PNG (OCR) | architecture.png | ✅ ready | ✅ pytesseract | ✅ 5 chunks | ✅ FastAPI/pgvector | ✅ |
| 网页 URL | Wikipedia RAG | ✅ ready | ✅ 正文抓取 | ✅ chunks | ✅ retrieval augmented | ✅ |

## 边界条件测试

| 测试 | 预期 | 实际 | 状态 |
|------|------|------|------|
| 超大文件 (>50MB) | 400 拒绝 | FILE_TOO_LARGE | ✅ |
| 不支持格式 (.xyz) | 400 拒绝 | UNSUPPORTED_FORMAT | ✅ |
| 重复注册 | 409 | EMAIL_EXISTS | ✅ |
| 错误密码登录 | 401 | INVALID_CREDENTIALS | ✅ |
| 无关问题 AI 问答 | 未找到资料 | "知识库中未找到相关资料" | ✅ |

## AI 问答质量验证

**测试问题**："混合检索是什么"

**AI 回答**（基于知识库，Claude CLI haiku）：
- 正确引用了 rag-notes.md 的 3 个段落 [1][2][3]
- 回答内容完全基于知识库：向量检索+BM25+RRF融合
- 引用了具体数据："精度比纯向量检索高 15-20%"
- 给出了优化建议：查询改写→混合检索→重排序
- 没有编造任何知识库外的内容

## Dev-QA 循环记录

| 轮次 | 发现问题 | 修复 |
|------|---------|------|
| Round 1 | 解析管道未触发(Celery未启动) + 搜索路由冲突 | 开发环境同步解析 + 路由顺序修正 |
| Round 2 | 关键词搜索 literal() 不兼容 asyncpg | 改用 literal_column() |
| Round 3 | 中文拆词不生效（整句匹配） | n-gram 滑动窗口拆词 |
| Round 4 | CSV 格式未注册 | SUPPORTED_TYPES + ALLOWED_EXTENSIONS 补充 |
| Round 5 | PNG OCR pytesseract 环境不匹配 | 安装到 anaconda Python |
| **最终** | **零问题** | **7 种格式全部跑通** |

## 修复的代码文件

| 文件 | 修改内容 |
|------|---------|
| app/services/llm_service.py | 重写为 Claude CLI 模式（haiku） |
| app/services/rag_engine.py | retrieve 添加关键词 fallback + n-gram 拆词 |
| app/services/document_parser.py | 添加 CSV 解析器 + PNG OCR 解析器 |
| app/routers/documents.py | ALLOWED_EXTENSIONS 添加 csv/png/jpg |
| app/routers/search.py | 关键词 fallback + literal_column 修复 |
| app/main.py | 搜索路由注册顺序调整 |
| app/config.py | 添加 CLAUDE_CLI_PATH 配置 |
