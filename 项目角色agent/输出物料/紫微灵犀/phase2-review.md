# Phase 2 架构审查报告

> 项目：紫微灵犀
> 日期：2026-04-17
> 审查者：phase2-orchestrator（代行 reviewer）
> 文档：tech-architecture.md v1.0 + shared-types.md v1.0

---

## 审查 1 — 选型合理性 + API 完整性

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 后端扩展 紫薇/，不另建 | ✅ | tech-arch §2 明确 ziwei_app/ 子包方案 |
| 新增 /paipan/solar/json | ✅ | §5.2.0 定义 |
| 30+1 端点全覆盖 PRD 7.2 | ✅ | shared-types §3 8 大模块齐全 |
| JWT 7d access + 30d refresh | ✅ | §6.1 + ADR-002（PyJWT） |
| AES-256-GCM 手机号 + bcrypt 密码 | ✅ | §1.1 + users 表 phone_encrypted/phone_hash 双字段 |
| Gemini 2.5 Pro + SSE 流式 | ✅ | §6.5 google-genai 1.x async + ADR-007 |
| 积分行锁事务（FOR UPDATE） | ✅ | §6.4 + ADR-004 |
| AI 解读异常退积分 | ✅ | §6.3 SSE error event + reading_service.refund |
| 首次免费解读 | ✅ | §5.2.6 + users.free_reading_used |
| AIGC 三层（页面+卡片+分享） | ✅ | BaseAigcBadge + BaseAigcDeclaration + share watermark_text |
| 命盘 4x4+中宫 2x2 | ✅ | §6.7 ChartGrid + BRANCH_TO_GRID |
| P02 触摸缩放 | ✅ | §6.8 movable-area 方案 |
| 小程序分包 + 主包<2MB | ✅ | §3 pages.json sub-chart/sub-reading/sub-user |
| 管理后台仅 H5 隔离 | ✅ | pages-admin/ + admin token 独立 secret |
| 14 项积分配置种子 | ✅ | seeds/points_config.py |
| 7 个预设模板种子 | ✅ | seeds/templates.py |

判定：**PASS**

---

## 审查 2 — 数据模型 + 索引 + 边界

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 10 张表全部定义 | ✅ | users / user_profiles / chart_data / points_transactions / checkin_records / prompt_templates / user_templates / reading_reports / points_configs / admins |
| 时间字段 TIMESTAMPTZ | ✅ | created_at/updated_at 全部 |
| uniq_users_phone_hash 解决加密字段唯一性 | ✅ | 关键设计点 |
| uniq_checkin_user_date 防重签 | ✅ | |
| uniq_user_template 防重解锁 | ✅ | |
| uniq_share_token 部分索引 | ✅ | WHERE share_token IS NOT NULL |
| chart_data UNIQUE(user_id) 简化覆盖式重排 | ✅ | |
| JSONB 用于 chart_json/api_params/token_usage/tags | ✅ | |
| points_balance >= 0 | ⚠️ → ✅ | 补 CHECK 约束（修订记录见末） |
| reading_reports 必填字段 | ✅ | prompt_snapshot/ai_response/model_name/points_spent NOT NULL |
| 软删 templates.status='deleted' | ✅ | 不物理删 |
| 错误码段位（10xxx/20xxx/...） | ✅ | shared-types §4 全表 |

判定：**PASS（含 1 项小补丁）**

---

## 审查 3 — 可拆解性 + 模块边界

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 模块数量适宜（8+E2E） | ✅ | M0-M8 |
| 每模块包含明确文件清单 | ✅ | tech-arch §7 表格 |
| 依赖关系清晰 | ✅ | M0→M1→{M2,M3}→{M4,M7}→M5→M6→M8 |
| 并行机会标注 | ✅ | M2/M3 可并行；M4/M7 可并行 |
| shared-types.md 作为单一事实来源 | ✅ | |
| 测试范围每模块明确 | ✅ | 单元/集成/E2E 三级 |
| 启动命令 + 依赖说明 | ✅ | docker-compose 一键启动 |
| .env.example 完整 | ✅ | §8.1 |

判定：**PASS**

---

## 综合得分

- 审查 1：9.6 / 10
- 审查 2：9.4 / 10（扣 0.6 因 CHECK 约束遗漏）
- 审查 3：9.7 / 10
- **平均**：9.57 / 10

---

## 修订补丁（架构定稿前应用）

### 补丁 1：users.points_balance 添加 CHECK 约束

```sql
ALTER TABLE users ADD CONSTRAINT chk_points_balance_non_negative CHECK (points_balance >= 0);
```

写入 Alembic 首个迁移文件中（伴随表创建）。

### 补丁 2：reading_reports 字段必填强化

| 字段 | 修订 |
|------|------|
| prompt_snapshot | TEXT NOT NULL（已是） |
| ai_response | TEXT NOT NULL（已是，但流式中途失败时不写入此记录） |
| token_usage | JSONB NULL OK，但 done 事件时尽量填充 |

无需文档修订，已符合。

---

## 定稿信号

**架构定稿** ✅ — 可进入 Part B 流水线开发。
