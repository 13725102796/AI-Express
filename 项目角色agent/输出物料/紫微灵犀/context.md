# 紫微灵犀 — 项目上下文索引

> 作用：项目级别的常驻上下文，所有 Phase 的 agent 起手必读
> 最后更新：2026-04-17（Phase 0 完成）

## 项目元信息

| 项 | 值 |
|---|---|
| 项目名称 | 紫微灵犀 |
| 一句话定位 | 基于紫微斗数排盘引擎与 Gemini 2.5 Pro 的 AI 国学文化解读平台 |
| 目标平台 | 微信小程序（主力）+ H5（引流）/ uni-app 多端 |
| 目标用户 | 22-35 岁泛年轻用户为主，对紫微斗数感兴趣的 C 端用户 |
| 商业模式 | 积分制三阶段演进（免费体验 → 广告 → 订阅） |
| 主体资质 | 阶段一个人主体，阶段三注册个体工商户 |
| 当前阶段 | Phase 0 完成，待启动 Phase 1 |

## 文件清单

| 文件 | 作用 | 当前版本 |
|------|------|---------|
| `PRD.md` | 产品需求文档（终稿） | v2.1 复核版（v2.0 + 6 项待决回答 + 设计指引细化） |
| `PRD.v2.0.backup.md` | v2.0 原始备份 | 用于回溯对比 |
| `research-market.md` | 产研报告 | Phase 0 输出 |
| `research-design.md` | 设计色彩报告 | Phase 0 输出 |
| `demo.html` | 设计风格参考页 | Phase 0 输出（1149 行单文件） |
| `phase0-status.md` | Phase 0 状态追踪 | 全部 ✅ |
| `phase0-review.md` | Phase 0 审查报告 | Round 1 通过 39/40 |
| `phase0-to-phase1.md` | Phase 0 → Phase 1 过渡文档 | 含 10 项 Phase 1 硬约束 |

## 技术资产位置

| 资产 | 绝对路径 | 说明 |
|------|---------|------|
| 后端 FastAPI 排盘服务 | `/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/app.py` | 270 行，3 个端点 |
| 计算引擎 | `iztro-py v0.3.4`（pip 包） | 排盘核心 |
| 后端依赖 | `/Users/maidong/Desktop/zyc/github/AI-Express/紫薇/requirements.txt` | |

## 已实现的 API 端点（Phase 1 不可重新另建，必须扩展同一服务）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/paipan` | 农历排盘，返回树形文本 |
| GET | `/paipan/solar` | 阳历排盘，返回树形文本 |
| GET | `/paipan/json` | 农历排盘，返回 JSON |

## Phase 1 待新增的端点（PRD Q5 + 7.2）

- `/paipan/solar/json` — 阳历 JSON 排盘（参考现有 `/paipan/json` 实现）
- 30 个业务 API（认证 / 用户 / 排盘 / 积分 / 模板 / AI 解读 / 分享 / 管理后台），见 PRD 7.2

## 关键决策摘要（Phase 1 必读）

| 决策项 | 决策 | 决策来源 |
|-------|------|---------|
| 平台选择 | uni-app 多端 | PRD Q9 |
| 商业模式 | 积分制三阶段 | PRD Q10 |
| AI 模型 | gemini-2.5-pro | PRD Q1 |
| 登录方式 | 手机号+密码（不发短信验证码） | PRD Q2 |
| 后端架构 | 同一 FastAPI 服务、同一项目内扩展 | PRD Q8（硬约束） |
| 收款方式 | 阶段一无收款 / 阶段二广告 / 阶段三支付 | PRD Q11+Q12 |
| 初始模板 | 7 个（2 免费 + 5 付费 30-50 积分） | PRD Q3（v2.1 决策） |
| 首次解读 | 不消耗积分，限免费模板 | v2.1 复核新增 |
| AIGC 合规 | 三层防护（声明 + 标识 + 内容兜底） | PRD Q7（v2.1 决策） |
| 小程序类目 | 教育 → 文化教育（首选） | PRD Q13（v2.1 决策） |
| H5 备案 | 已备案域名子路径，阶段三独立备案 | PRD Q14（v2.1 决策） |
| 主色 | #2D1B69 深紫 | PRD 9.1 / 9.4 |
| 强调色 | #D4A84B 古金 | PRD 9.1 / 9.4 |
| 字体 | 思源宋体（标题）+ 思源黑体（正文） | PRD 9.1 / 9.5 |

## Phase 1 → Phase 2 用户确认门提醒

phase1-orchestrator 必须在 Part C（Phase 1 完成生成 phase1-to-phase2.md 之前）显式暂停，
等待用户确认（用户可能选择用其他设计模型重做）。本提示已写入 phase0-to-phase1.md
的 `<context-for-agents>` 末尾。

## 后续 Phase 1 起手建议

1. phase1-orchestrator 读取本文件 + `phase0-to-phase1.md` + `PRD.md` v2.1
2. page-design-agent 拆分 12-16 页清单（参考 PRD 5.1 信息架构）
3. design-agent 基于 demo.html 的视觉系统扩展为完整 design-tokens.json
4. 全部页面遵循 10 项硬约束（见 phase0-to-phase1.md）
