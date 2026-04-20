# Phase 2 执行状态追踪

> 项目：紫微灵犀
> 启动：2026-04-17
> 编排者：phase2-orchestrator
> 当前进度：Part A 完成 / Part B 后端 M0-M7 全部完成 / 前端 uni-app 待开新对话承接

## 总览

| 阶段 | 状态 | 说明 |
|------|------|------|
| Step 0 校验 | DONE | user-approval 通过，design-source=user-replaced |
| Part A 架构设计 | DONE | 综合 9.57/10，3 轮审查 PASS |
| Part B M0 项目骨架 | DONE | 后端骨架就位，5 paipan 测试 PASS |
| Part B M1 认证 | DONE（单元层） | 20 单元测试 PASS |
| Part B M2 用户+排盘 | DONE | 21 单元测试 PASS |
| Part B M3 积分 | DONE | 14 单元测试 PASS |
| Part B M4 模板 | DONE | 8 单元测试 PASS |
| Part B M5 AI 解读（SSE） | DONE | 13 单元测试 PASS |
| Part B M6 分享 | DONE | 10 单元测试 PASS |
| Part B M7 管理后台 | DONE | 18 单元测试 PASS |
| Part B M8 DB 集成 / E2E | PENDING | 需 PostgreSQL 启动后跑 |
| **前端 uni-app** | PENDING | 单独对话承接（见 ESCALATION-2） |
| Part C 前后端联调 | PENDING | 依赖前端完成 |

## 后端测试汇总

```
tests/test_paipan.py              5 PASS
tests/test_security.py           13 PASS
tests/test_auth_schema.py         7 PASS
tests/test_user_schema.py        12 PASS  ← M2
tests/test_user_service.py        4 PASS  ← M2
tests/test_chart_service.py       5 PASS  ← M2
tests/test_points_schema.py       4 PASS  ← M3
tests/test_points_service.py      6 PASS  ← M3
tests/test_checkin_logic.py       4 PASS  ← M3
tests/test_template_service.py    8 PASS  ← M4
tests/test_gemini_client.py       4 PASS  ← M5
tests/test_reading_service.py     9 PASS  ← M5
tests/test_share_service.py      10 PASS  ← M6
tests/test_admin_service.py      18 PASS  ← M7
───────────────────────────────────────
总计：109 passed, 0 failed
```

## Part A：技术架构（已完成）

- ✅ `tech-architecture.md` v1.0
- ✅ `shared-types.md` v1.0
- ✅ `phase2-review.md`

## Part B：模块开发实际进度

### M0 项目骨架 — DONE（详见历史版本）
### M1 认证 — DONE（详见历史版本）

### M2 用户 + 排盘 — DONE

**新增文件**：
- `ziwei_app/schemas/user.py` — UpsertProfileReq / UserProfileOut / UpsertProfileRespData
- `ziwei_app/schemas/chart.py` — ChartDataOut
- `ziwei_app/services/user_service.py` — upsert_user_profile（触发排盘，savepoint 隔离失败）+ 日期合法性
- `ziwei_app/services/chart_service.py` — generate_chart_for_user（asyncio.to_thread 包装 paipan）+ 测试可注入 callers
- `ziwei_app/api/v1/user.py` — GET /me、GET/PUT /profile
- `ziwei_app/api/v1/chart.py` — POST /generate、GET /me

**关键设计**：
- chart_service 提供 `set_paipan_callers` 钩子，测试可用 fake 跳过真实 iztro 调用
- user_service 触发排盘失败时用 `db.begin_nested()` savepoint 保护 → 档案保存成功，chart_generated=False

### M3 积分 — DONE

**新增文件**：
- `ziwei_app/schemas/points.py` — 完整 schema
- `ziwei_app/services/points_service.py` — change_points（行锁）/ get_balance / list_transactions / grant_share_reward / grant_ad_reward
- `ziwei_app/services/checkin_service.py` — do_checkin（连签推算）/ get_checkin_status
- `ziwei_app/api/v1/points.py` — 6 端点：balance / transactions / checkin / checkin/status / share-reward / ad-reward

**关键设计**：
- change_points 严格走 SELECT ... FOR UPDATE 行锁 + 合法 type 白名单
- allow_negative_balance 仅保留给内部退款场景
- 签到连签：`_reward_key_for_day` 兼容 day_1~day_7，超 7 天按 day_7 给

### M4 模板 — DONE

**新增文件**：
- `ziwei_app/schemas/template.py` — PromptTemplateOut / UserTemplateOut / UnlockTemplateRespData
- `ziwei_app/services/template_service.py` — list / detail / unlock（解锁事务）/ list_my_templates
- `ziwei_app/api/v1/templates.py` — 4 端点 + my-templates 子路由

**关键设计**：
- unlock_template 事务：模板存在+active → 未解锁 → 积分够 → 原子扣积分 + 创建 user_template + unlock_count++
- 免费模板（points_cost=0）跳过扣费，但仍走 user_template 写入

### M5 AI 解读（SSE）— DONE

**新增文件**：
- `ziwei_app/schemas/reading.py` — StartReadingReq / ReadingReportOut / ReadingReportBriefOut
- `ziwei_app/services/gemini_client.py` — GeminiClient（google-genai 1.x）+ FakeGeminiClient（测试注入）
- `ziwei_app/services/reading_service.py` — prepare_reading / save_report / refund / list_reports / get_report
- `ziwei_app/api/v1/reading.py` — POST /start（SSE）+ GET /reports + /reports/{id}

**关键设计**：
- SSE 事件按 shared-types.md：`event: meta|chunk|done|error`，完全对齐
- 首次免费判断基于 `user.free_reading_used`，失败时 refund 恢复 flag
- gemini_client 提供 set_client / reset_client 钩子，测试可完全脱离外部网络

### M6 分享 — DONE

**新增文件**：
- `ziwei_app/schemas/share.py` — CreateShareRespData / PublicShareData + AIGC_WATERMARK 常量
- `ziwei_app/services/share_service.py` — create_share / get_public_share / excerpt
- `ziwei_app/api/v1/share.py` — POST /reading/reports/{id}/share（登录）+ GET /share/{token}（公开）

**关键设计**：
- 已有 share_token 直接复用（不会重复生成）
- 生成时做 5 次冲突重试（token_urlsafe 24 bytes 实际几乎不会重）
- AIGC 水印常量集中定义，前端可直接用

### M7 管理后台 — DONE

**新增文件**：
- `ziwei_app/schemas/admin.py` — AdminLoginReq / AdminCreateTemplateReq / AdminUpdateTemplateReq / AdminToggleStatusReq / AdminUserView / PointsConfigItemOut / AdminStatsOut
- `ziwei_app/services/admin_service.py` — login / 模板 CRUD / 用户列表 / 积分配置 CRUD / 数据概览
- `ziwei_app/api/v1/admin/__init__.py` — 子路由聚合
- `ziwei_app/api/v1/admin/auth.py` — POST /auth/login
- `ziwei_app/api/v1/admin/templates.py` — GET/POST /templates + PUT/PATCH/DELETE /templates/{id}
- `ziwei_app/api/v1/admin/users.py` — GET /users（含手机解密脱敏）
- `ziwei_app/api/v1/admin/points_config.py` — GET /points-config + PUT /points-config/{key}
- `ziwei_app/api/v1/admin/stats.py` — GET /stats（total + DAU7d + Top5 模板）

**关键设计**：
- admin JWT 使用独立 secret + 8 小时短过期（`create_admin_token`）
- DAU 用签到记录作为活跃代理指标（MVP 够用）
- Top5 模板基于 unlock_count（status != deleted）

## 总路由清单

FastAPI 启动后 OpenAPI 生成 35 条路径：
- 4 paipan（含 solar/json 新增）
- /health
- /api/v1/auth × 3
- /api/v1/user × 2 + /user/templates × 1
- /api/v1/chart × 2
- /api/v1/points × 6
- /api/v1/templates × 3
- /api/v1/reading × 4（含 SSE start）
- /api/v1/share × 1（公开）
- /api/v1/admin × 10（登录 + 模板×5 + 用户 + 配置×2 + 统计）

合计与 tech-architecture.md §5 清单 100% 对齐。

## M8 / 前端 ESCALATION

### ESCALATION-1：M8 DB 集成 + E2E（需要 PostgreSQL 实例）

**现状**：109 单元测试全 PASS（纯逻辑 + schema + mock DB）。DB 集成测试未跑。

**补充步骤**（PG 启动后任选其一）：
```bash
# 方案 A：docker-compose 一键
cd 紫薇
docker-compose up -d postgres
alembic upgrade head
python -m ziwei_app.seeds.init_seeds
python app.py    # 启动完整 API

# 方案 B：本地 PG
createdb ziwei
DATABASE_URL=postgresql+asyncpg://localhost/ziwei alembic upgrade head
DATABASE_URL=postgresql+asyncpg://localhost/ziwei python -m ziwei_app.seeds.init_seeds

# 跑集成冒烟
curl http://localhost:8000/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"phone":"13800000001","password":"abcdef12"}'
```

**建议 E2E 覆盖**（Playwright H5 + 后端 httpx.AsyncClient 两选一）：
1. 注册 → 完善档案 → 自动排盘 → 查看命盘
2. 签到 × 7 天（mock 时钟）→ 看连签奖励曲线
3. 解锁付费模板（积分不足 → 够 → 成功）
4. AI 解读（首免 + 付费 + 模拟失败退积分）
5. 分享 + 公开访问
6. 管理后台登录 → 创建模板 → 修改积分配置 → 查看 DAU

### ESCALATION-2：前端 uni-app（由用户在新对话承接）

**现状**：后端 API 契约已 100% 就位，OpenAPI /openapi.json 可直接供前端生成类型。

**推荐启动命令**（新对话里 fullstack-dev-agent 执行）：
```bash
cd 项目角色agent/输出物料/紫微灵犀/code/frontend/
npx degit dcloudio/uni-preset-vue#vite-ts ziwei-frontend
cd ziwei-frontend
pnpm install
```

**必须输入**（已全部就位）：
- PRD.md / page-specs.md / demo.html（设计基准）
- pages/*.html（18 张页面设计稿）
- tech-architecture.md §3（前端项目结构）
- shared-types.md（直接 copy 成 src/types/api.ts）

## 关键决策与变更记录

- 后端 venv：旁建 `.venv-py312/`（Python 3.12.12）
- bcrypt 版本锁定：`>=4.0.1,<4.1.0`
- Alembic 迁移：手写（本地无 PG）
- M5 Gemini：使用 `google-genai` 1.x（新统一 SDK）；测试用 FakeGeminiClient 完全脱离网络
- M7 admin token：独立 secret + 8h 过期（复用 access_token 作为 refresh 占位，前端刷新时直接重新登录）
- M6 share url：通过 `SHARE_BASE_URL` 环境变量配置，默认 `http://localhost:5173`

## 启动验证命令

```bash
cd /Users/maidong/Desktop/zyc/github/AI-Express/紫薇
source .venv-py312/bin/activate

# 全量单元测试（无需 DB）
python -m pytest tests/ -v
# 109 passed 期望

# 启动 API + 生成 OpenAPI（无需 DB 即可）
python -c "from fastapi.testclient import TestClient; from app import app; c = TestClient(app); print(c.get('/openapi.json').json()['info'])"

# 完整启动（需 Docker）
docker-compose up -d
docker-compose exec api alembic upgrade head
docker-compose exec api python -m ziwei_app.seeds.init_seeds
```

## 当前问题

无阻塞性问题。后端 M0-M7 全部完成，109 单元测试全 PASS，33 业务端点 + 4 paipan 端点完整就位。等待：
1. PG 启动后跑 DB 集成 / E2E（M8）
2. 前端 uni-app 在新对话承接
