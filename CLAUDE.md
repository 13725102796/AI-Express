# AI-Express 项目规范

## 项目定位

AI 驱动开发最佳实践知识库，收集优秀 Skills、经验总结和标准开发流程。

## 开发流程规范

**所有开发工作必须遵循 `经验总结/开发流程/AI驱动开发流程规范.md` 中定义的流程。**

### 流程快速指引

1. **识别场景**：根据决策树（文档第 13 章）选择对应流程
2. **需求确认**：任何开发前必须明确需求，不跳过 Phase 0
3. **质量门禁**：所有代码交付前必须通过对应级别的质量检查
4. **知识沉淀**：每次开发完成后执行 `/revise-claude-md`

### 场景 → Skill 映射

| 场景 | 首选 Skill |
|------|-----------|
| 从 0 开发 | `/spec-kit` → `/claude-mem:do` |
| 增量功能 | `/feature-dev`（7 阶段，3 个人工确认点） |
| Bug 修复 | `/claude-mem:smart-explore` → `/review-pr code errors` |
| 迭代优化 | `/ralph-loop` + `/review-pr` |
| 重构 | `/claude-mem:make-plan` → `/claude-mem:do` → `/review-pr all` |
| UI/UX | `impeccable`（/frontend-design + /audit + /critique）→ `/feature-dev` |
| 长周期任务 | `autonomous-skill` |

### 审查工具区分

- `/review-pr` — **提交前**本地审查（基于 git diff，6 个可选维度）
- `/code-review` — **PR 创建后**自动评论（5 agent + 置信度评分，≥80 才输出）

### 质量门禁级别

- **L1**（小改动）：`/review-pr code`
- **L2**（标准）：`/review-pr code errors simplify`
- **L3**（严格）：`/review-pr all`
- **L4**（最高）：`/review-pr all` → `/code-review` → `/ralph-loop` 修复

### 安全红线

- 禁止提交 .env、密钥、token
- 禁止 force push 到 main
- 禁止跳过 git hooks
- 所有外部输入必须验证
- `/ralph-loop` 必须设 `--max-iterations` 和 `--completion-promise`

## 目录结构

```
AI-Express/
├── CLAUDE.md              — 项目规范（本文件）
├── 优秀skills/             — 收集的优秀 Skill 资源
└── 经验总结/
    └── 开发流程/
        └── AI驱动开发流程规范.md  — 完整开发流程文档（v1.1）
```

## 文档维护

- 流程文档随实践经验持续更新
- 使用 `/revise-claude-md` 沉淀新的经验
- 使用 `/claude-mem:mem-search` 查询历史经验
