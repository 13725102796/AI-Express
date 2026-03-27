# AI 驱动开发流程规范 (AI-Driven Development Workflow)

> 本文档定义了一套严谨、高可用、可复用的 AI 辅助开发流程，覆盖从 0 到 1 开发、增量开发、迭代优化、Bug 修复、代码重构、UI/UX 开发等全场景。所有流程均深度集成 Claude Code Skills，确保开发过程安全、可控、高效。
>
> **数据来源**：所有 Skill 描述均基于实际安装的插件定义文件（SKILL.md / commands/*.md），非推测。

---

## 目录

1. [核心原则](#1-核心原则)
2. [流程总览](#2-流程总览)
3. [场景一：从 0 到 1 开发（Greenfield）](#3-场景一从-0-到-1-开发greenfield)
4. [场景二：增量功能开发（Feature Development）](#4-场景二增量功能开发feature-development)
5. [场景三：迭代优化（Iterative Improvement）](#5-场景三迭代优化iterative-improvement)
6. [场景四：Bug 修复（Bug Fix）](#6-场景四bug-修复bug-fix)
7. [场景五：代码重构（Refactoring）](#7-场景五代码重构refactoring)
8. [场景六：UI/UX 开发](#8-场景六uiux-开发)
9. [场景七：长周期/复杂任务（Autonomous）](#9-场景七长周期复杂任务autonomous)
10. [通用安全规范](#10-通用安全规范)
11. [质量门禁（Quality Gates）](#11-质量门禁quality-gates)
12. [Skill 速查表](#12-skill-速查表)
13. [流程选择决策树](#13-流程选择决策树)

---

## 1. 核心原则

| 原则 | 说明 |
|------|------|
| **规格先行** | 任何开发前必须明确需求，模糊需求通过 clarify 阶段消除 |
| **架构优先** | 编码前必须完成架构设计和方案评审 |
| **安全内建** | 安全不是事后检查，而是贯穿每个阶段的内建能力 |
| **持续验证** | 每个阶段必须有明确的验证标准和质量门禁 |
| **知识沉淀** | 每次开发的经验必须沉淀到 CLAUDE.md 和记忆系统 |
| **最小变更** | 只做被要求的事，不过度工程化 |
| **可回滚** | 所有变更必须可追溯、可回滚 |

---

## 2. 流程总览

```
┌─────────────────────────────────────────────────────────────────┐
│                      开发场景识别                                 │
│  从0开发 │ 增量开发 │ 迭代优化 │ Bug修复 │ 重构 │ UI/UX │ 长周期  │
└────┬────────┬────────┬────────┬───────┬──────┬───────┬─────────┘
     │        │        │        │       │      │       │
     ▼        ▼        ▼        ▼       ▼      ▼       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 0: 需求确认                              │
│  明确目标 → 消除歧义 → 确定范围 → 安全评估                         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 1: 探索与规划                            │
│  代码探索 → 架构设计 → 方案评审 → 任务拆分                         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 2: 实现                                 │
│  编码实现 → 单元测试 → 本地验证                                    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 3: 质量门禁                              │
│  代码审查 → 安全扫描 → 类型检查 → 测试覆盖 → 简化优化              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 4: 交付与沉淀                            │
│  提交代码 → 创建PR → 知识沉淀 → 记忆更新                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 场景一：从 0 到 1 开发（Greenfield）

> **适用场景**：新项目启动、新模块从零构建、原型开发
> **核心 Skill**：`/spec-kit` → `/feature-dev` → `/ralph-loop`

### 3.1 Phase 0: 需求规格化

**目标**：将模糊需求转化为可执行的规格文档

**前置条件**：需要安装 spec-kit CLI
```bash
# 安装 spec-kit CLI（需 Python 3.11+ 和 uv）
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 初始化项目
specify init . --ai claude
```

**操作步骤**：
```
1. 使用 /spec-kit 启动规格驱动开发（7 阶段工作流）
   → Phase 1 Constitution: 确立项目宪法 → .specify/memory/constitution.md
   → Phase 2 Specify: 定义功能规格 → .specify/specs/NNN-feature-name/spec.md
   → Phase 3 Clarify: 消除歧义（每轮最多 5 个问题）
   → Phase 4 Plan: 技术实施策略 → plan.md + data-model.md + contracts/
   → Phase 5 Tasks: 生成依赖排序的任务 → tasks.md
   → Phase 6 Analyze: 跨文档一致性验证（只读）
   → Phase 7 Implement: 按任务逐步实现

2. 产出物目录结构：
   .specify/
   ├── memory/constitution.md          — 项目宪法
   └── specs/001-feature-name/
       ├── spec.md                     — 功能规格
       ├── plan.md                     — 技术方案
       ├── data-model.md               — 数据模型
       ├── contracts/                  — API 契约
       └── tasks.md                    — 依赖排序的任务列表
```

**质量检查点**：
- [ ] 所有核心需求已文档化
- [ ] 安全约束已明确（认证、授权、数据保护）
- [ ] 性能指标已定义
- [ ] 边界条件已考虑

### 3.2 Phase 1: 架构设计

**目标**：设计可扩展、可维护的技术架构

**操作步骤**：
```
1. 使用 /claude-mem:make-plan 创建实施计划
   → 工作机制：Orchestrator 模式，部署 subagent 进行文档发现
   → Phase 0 (Documentation Discovery): subagent 搜索相关文档、API、示例
   → 产出"Allowed APIs"清单，引用具体文档来源
   → 每阶段包含：实现内容 + 文档引用 + 验证检查表 + 反模式防护

2. 关键原则：
   - 从文档拷贝模式，不发明 API
   - 每个 subagent 必须报告信息来源
   - 缺少证据时重新部署 subagent 验证

3. 人工审查并确认计划后再执行
```

**质量检查点**：
- [ ] 架构方案已评审
- [ ] 技术选型有文档依据（不是假设）
- [ ] 目录结构已规划
- [ ] 关键接口已定义

### 3.3 Phase 2: 实现

**目标**：按任务列表逐步实现

**操作步骤**：
```
1. 使用 /claude-mem:do 执行分阶段计划
   → 工作机制：Orchestrator 不直接编码，全部工作由 subagent 完成
   → 每阶段流程：
     a. 部署 Implementation subagent 执行编码（拷贝文档模式，不发明 API）
     b. 部署 Verification subagent 运行验证检查表
     c. 部署 Anti-pattern subagent grep 检查已知反模式
     d. 部署 Code Quality subagent 审查代码
     e. 验证通过后才允许 Commit subagent 提交
   → 阶段间部署 Branch/Sync subagent 推送并准备下一阶段

2. 对于需要自动迭代的模块，使用 /ralph-loop：
   /ralph-loop "实现 XXX 模块，通过所有测试" --max-iterations 10 --completion-promise "All tests passing"

   → 工作机制：通过 stop hook 实现，退出时自动将相同 prompt 反馈回来
   → AI 通过读取文件和 git history 感知上一轮工作，持续改进
   → completion-promise 必须在完全且无歧义为真时才输出（不允许虚假退出）
```

**安全要求**：
- 不提交 .env、密钥、凭证文件
- 所有外部输入必须验证
- SQL 使用参数化查询
- 敏感数据加密存储

### 3.4 Phase 3: 质量门禁

**操作步骤**：
```
1. /review-pr                     — 综合 PR 审查（可选维度）
   可选审查维度（默认 all）：
   ├── code      — 代码质量、项目规范、bug 检测
   ├── errors    — 静默失败、catch 块、错误日志
   ├── tests     — 测试覆盖质量和边界情况
   ├── types     — 类型设计、封装性、不变量（仅新增类型时）
   ├── comments  — 注释准确性、文档完整性
   └── simplify  — 代码简化和可读性（审查通过后）

   指定维度示例：
   /review-pr code errors          — 只审查代码质量和错误处理
   /review-pr all parallel         — 所有维度并行执行

   输出按优先级分类：
   - Critical Issues（合并前必须修复）
   - Important Issues（应该修复）
   - Suggestions（建议改进）

2. /code-review                    — 针对已有 PR 的审查
   → 5 个 Sonnet agent 并行审查：
     a. CLAUDE.md 合规性检查
     b. 变更范围内的浅层 bug 扫描
     c. git blame/history 上下文分析
     d. 历史 PR 评论关联检查
     e. 代码注释合规性检查
   → 每个 issue 由 Haiku agent 独立评分（0-100）
   → 仅输出置信度 ≥80 的问题
   → 自动在 PR 上发表评论

   ⚠️ 注意：/code-review 需要已有 PR，用于 PR 评审场景
   ⚠️ 注意：/review-pr 基于 git diff，用于提交前的本地审查

3. 修复所有 Critical 和 Important 级别的问题
```

### 3.5 Phase 4: 交付与沉淀

**操作步骤**：
```
1. /commit                        — 自动生成规范提交
   → 读取 git status + diff + 最近 10 条 commit
   → 自动匹配项目 commit message 风格
   → 单次完成 stage + commit

2. /commit-push-pr                — 一站式交付
   → 如在 main 分支则自动创建新分支
   → 单次完成 commit + push + gh pr create

3. /revise-claude-md              — 沉淀本次经验到 CLAUDE.md

4. /claude-mem:mem-search         — 验证记忆已保存
   → 3 层查询：search（索引）→ timeline（上下文）→ get_observations（详情）
   → 按需过滤：type/obs_type/date 等参数
```

---

## 4. 场景二：增量功能开发（Feature Development）

> **适用场景**：在已有项目上新增功能模块
> **核心 Skill**：`/feature-dev`

### 4.1 完整流程

```
/feature-dev "功能描述"
触发 7 阶段工作流：

Phase 1: Discovery（需求澄清）
  → 如需求不清晰，AI 主动提问确认
  → 确认要解决的问题、功能边界、约束条件

Phase 2: Codebase Exploration（代码探索）
  → 启动 2-3 个 code-explorer agent 并行探索
  → 每个 agent 关注不同维度（相似功能、架构理解、用户体验等）
  → 每个 agent 返回 5-10 个关键文件列表
  → AI 读取这些文件构建深度理解

Phase 3: Clarifying Questions（消歧）⚠️ 关键阶段，不可跳过
  → 基于探索结果识别：边界情况、错误处理、集成点、向后兼容等
  → 以组织化列表形式呈现所有问题
  → ⚠️ 必须等待人工回答后继续
  → 如用户说"你决定"，AI 给出建议并等待确认

Phase 4: Architecture Design（架构设计）
  → 启动 2-3 个 code-architect agent 并行设计
  → 三种方向：最小变更/干净架构/务实平衡
  → AI 综合分析后推荐最优方案（附理由）
  → ⚠️ 必须等待人工选择方案

Phase 5: Implementation（实现）
  → ⚠️ 必须等待人工明确批准后开始
  → 读取前序阶段识别的所有相关文件
  → 严格遵循项目现有约定
  → 通过 TodoWrite 跟踪进度

Phase 6: Quality Review（质量审查）
  → 3 个 code-reviewer agent 并行审查
  → 关注维度：简洁性/DRY/优雅性、bug/功能正确性、项目约定/抽象
  → 输出最高严重度问题
  → ⚠️ 呈现给用户决定：立即修 / 稍后修 / 跳过

Phase 7: Summary（总结）
  → 文档化：构建内容、关键决策、修改文件、后续建议
```

### 4.2 增量开发特别注意事项

| 关注点 | 说明 |
|--------|------|
| **兼容性** | 新功能不得破坏现有功能，必须运行全量回归测试 |
| **一致性** | 遵循项目现有的代码风格、命名约定、目录结构 |
| **接口稳定** | 公共 API 变更必须向后兼容或有明确的迁移方案 |
| **依赖管理** | 新增依赖需评估安全性、许可证、维护状态 |

### 4.3 提交与审查

```
1. /review-pr code errors         — 提交前本地审查（代码质量 + 错误处理）
2. 修复发现的问题
3. /commit                        — 提交（自动匹配项目 commit 风格）
4. /commit-push-pr                — 推送并创建 PR
5. /code-review                   — 在 PR 上自动发表审查评论
6. /revise-claude-md              — 更新项目知识
```

---

## 5. 场景三：迭代优化（Iterative Improvement）

> **适用场景**：性能优化、用户体验改进、技术债清理
> **核心 Skill**：`/ralph-loop` + `/review-pr`

### 5.1 流程

```
Step 1: 定义优化目标和完成标准
  → 明确可量化的指标（如响应时间 < 200ms、测试覆盖 > 80%）
  → 完成标准必须是可自动检测的（测试通过、lint 通过等）

Step 2: 使用 /ralph-loop 自动迭代
  /ralph-loop "优化 XXX，目标：YYY" --max-iterations 15 --completion-promise "目标指标达成"

  工作机制（基于真实实现）：
  → 通过 stop hook 实现循环：AI 尝试退出时，hook 将相同 prompt 重新注入
  → AI 通过读取文件变更和 git history 感知上一轮工作成果
  → 只有 completion-promise 完全为真时才允许退出
  → --max-iterations 是安全上限，达到后强制停止

Step 3: 人工验证迭代结果
  → 检查 AI 的优化是否合理
  → 确认没有引入副作用

Step 4: 质量门禁
  → /review-pr code simplify       — 审查代码质量并简化
  → /review-pr errors              — 检查错误处理（如涉及）

Step 5: 提交
  → /commit → /commit-push-pr
  → /revise-claude-md
```

### 5.2 迭代安全守则

| 规则 | 说明 |
|------|------|
| **必须设 --max-iterations** | 防止无限循环，建议 10-20 次 |
| **必须有 --completion-promise** | 明确的退出条件，AI 不允许伪造完成 |
| **每轮可验证** | 优化目标必须是可自动检测的（测试、lint、benchmark） |
| **人工兜底** | 达到迭代上限后必须人工介入 |
| **可取消** | 使用 `/cancel-ralph` 随时安全退出循环 |

---

## 6. 场景四：Bug 修复（Bug Fix）

> **适用场景**：已知问题修复、线上故障处理、回归缺陷修复
> **核心 Skill**：`/claude-mem:smart-explore` + `/review-pr`

### 6.1 流程

```
┌─────────────────────────────────────────────────────────┐
│ Phase 0: 问题定位                                        │
│                                                         │
│ 1. 使用 /claude-mem:mem-search 检索历史                  │
│    → search(query="问题关键词") 获取索引                  │
│    → timeline(anchor=ID) 获取上下文                      │
│    → get_observations(ids=[...]) 获取详情                │
│    → 如有历史方案则复用                                   │
│                                                         │
│ 2. 使用 /claude-mem:smart-explore 结构化探索             │
│    → smart_search(query="关键词", path="./src")          │
│      返回匹配的符号 + 折叠文件视图                        │
│    → smart_outline(file_path="目标文件")                 │
│      获取文件完整结构骨架                                 │
│    → smart_unfold(file_path="文件", symbol_name="函数")  │
│      获取特定函数/类的完整源码                             │
│    → 比读完整文件节省 4-8x token                         │
│                                                         │
│ 3. 复现问题                                             │
│    → 编写失败测试用例（TDD 方式）                        │
│    → 确认测试能稳定复现问题                              │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 1: 根因分析                                        │
│                                                         │
│ 1. 分析错误日志、堆栈信息                                │
│ 2. 追溯 git blame 定位引入变更                           │
│ 3. 明确根因（不是表面现象）                               │
│ 4. 评估影响范围                                         │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 2: 修复实现                                        │
│                                                         │
│ 1. 最小化修复（只改必须改的）                            │
│ 2. 确保失败测试变为通过                                  │
│ 3. 运行全量回归测试                                      │
│ 4. ⚠️ 不要顺手重构周边代码                               │
└────────────────────┬────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Phase 3: 验证与审查                                      │
│                                                         │
│ 1. /review-pr code errors                               │
│    → 代码质量 + 错误处理检查                              │
│ 2. /commit（提交信息格式：fix: 描述）                    │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Bug 修复检查清单

- [ ] 问题已稳定复现
- [ ] 根因已明确（非猜测）
- [ ] 修复范围最小化
- [ ] 失败测试已通过
- [ ] 回归测试全部通过
- [ ] 没有引入新的安全漏洞
- [ ] commit message 关联了 issue 编号（如有）

---

## 7. 场景五：代码重构（Refactoring）

> **适用场景**：技术债清理、架构优化、可维护性提升
> **核心 Skill**：`/claude-mem:smart-explore` + `/claude-mem:make-plan` + `/review-pr`

### 7.1 流程

```
Step 1: 重构范围评估
  → /claude-mem:smart-explore 分析代码结构
    - smart_search 定位所有相关符号
    - smart_outline 理解文件结构
    - smart_unfold 查看关键实现
  → 识别重构目标和影响范围
  → 确保有充分的测试覆盖作为安全网

Step 2: 制定重构计划
  → /claude-mem:make-plan 创建分阶段计划
    - Phase 0 文档发现：subagent 搜索相关模式和 API
    - 每阶段包含验证检查表和反模式防护
  → 每个阶段独立可验证、可回滚
  → ⚠️ 人工确认计划后再执行

Step 3: 逐步执行
  → /claude-mem:do 编排 subagent 执行
    - 每阶段：Implementation → Verification → Anti-pattern → Code Quality → Commit
  → 每个重构步骤后运行全量测试
  → 每个步骤单独 commit（方便回滚）

Step 4: 全面审查
  → /review-pr all                — 全维度审查
  → 重点关注：
    - types（类型设计是否改善）
    - simplify（是否真的更简单了）
    - tests（测试覆盖是否充分）

Step 5: 提交
  → /commit-push-pr
  → /revise-claude-md（记录重构决策和原因）
```

### 7.2 重构铁律

| 规则 | 说明 |
|------|------|
| **测试先行** | 没有充分测试覆盖不能开始重构 |
| **行为不变** | 重构不改变外部可观察行为 |
| **小步前进** | 每步可独立验证和回滚 |
| **不混合** | 重构 PR 不混入功能变更或 Bug 修复 |

---

## 8. 场景六：UI/UX 开发

> **适用场景**：页面开发、设计系统构建、交互优化
> **核心 Skill**：`impeccable`（/frontend-design + /audit + /critique）+ `/feature-dev`

### 8.1 流程

```
Step 1: 设计系统生成
  → /teach-impeccable 采集项目设计上下文（一次性）
  → 基于 Impeccable 原则创造性设计（反 AI 味、OKLCH、exponential easing）
  → 产出：设计风格 + 配色方案 + 字体搭配 + Anti AI Slop 自检

Step 2: 功能实现
  → /feature-dev "实现 XXX 页面/组件"
  → 7 阶段完整流程（探索 → 消歧 → 设计 → 实现 → 审查）
  → 基于设计系统编码，遵循项目约定

Step 3: 审查
  → /review-pr code comments simplify
    - code: 代码质量
    - comments: 注释和文档准确性
    - simplify: 简化冗余样式/组件

Step 4: 提交
  → /commit → /commit-push-pr
```

### 8.2 UI/UX 检查清单

- [ ] 响应式适配（移动端、平板、桌面）
- [ ] 可访问性（ARIA 标签、键盘导航、色彩对比度）
- [ ] 加载性能（图片懒加载、代码分割）
- [ ] 浏览器兼容性
- [ ] 暗色模式适配（如需）

---

## 9. 场景七：长周期/复杂任务（Autonomous）

> **适用场景**：跨多个会话的大型任务、批量处理、持续迭代
> **核心 Skill**：`autonomous-skill` + `/claude-mem`

### 9.1 流程

```
Step 1: 任务定义
  → 明确最终目标和验收标准
  → 使用 /claude-mem:make-plan 创建分阶段计划（可选）

Step 2: 启动自主执行
  → 触发方式：自然语言描述，包含"autonomous"/"自主执行"等关键词
  → 自动生成任务名并创建 .autonomous/<task-name>/ 目录
  → 双 agent 架构：
    - Initializer Agent（新任务）：分析需求，创建 task_list.md + progress.md
    - Executor Agent（续接）：读取现有进度，继续完成下一个任务
  → 每个 session 完成后自动检查剩余任务数，3 秒后自动继续

Step 3: 过程监控
  → 查看进度：cat .autonomous/<task-name>/task_list.md
  → 查看日志：cat .autonomous/<task-name>/progress.md
  → 续接任务："continue the autonomous task <task-name>"
  → 中断：Ctrl+C 安全停止

Step 4: 交付验收
  → /review-pr all                — 全面质量审查
  → /revise-claude-md             — 沉淀经验
```

### 9.2 自主任务安全守则

| 规则 | 说明 |
|------|------|
| **明确边界** | 任务范围必须明确，不能是开放式目标 |
| **进度可查** | task_list.md 和 progress.md 持久化记录 |
| **可中断** | Ctrl+C 随时安全中断，续接时自动恢复 |
| **任务隔离** | 每个任务独立目录，不互相干扰 |
| **不越权** | 不执行破坏性操作（删除、force push 等） |

---

## 10. 通用安全规范

### 10.1 代码安全

```
必须遵守：
├── 不提交敏感信息（.env、密钥、token、密码）
├── 外部输入必须验证和清洗
├── SQL 必须参数化查询（禁止字符串拼接）
├── 前端必须防 XSS（转义用户输入）
├── API 必须认证和授权
├── 依赖必须审查（安全性、许可证）
└── 日志不能包含敏感数据
```

### 10.2 Git 安全

```
必须遵守：
├── 禁止 force push 到 main/master
├── 禁止跳过 hooks（--no-verify）
├── 禁止在未确认的情况下执行破坏性操作
├── 每次提交前检查 git diff（防止意外提交）
├── commit 不使用 --amend 修改已推送的提交
└── 优先创建新 commit 而非 amend
```

### 10.3 Skill 使用安全

```
必须遵守：
├── /ralph-loop 必须设 --max-iterations 和 --completion-promise
├── /ralph-loop 可用 /cancel-ralph 安全退出
├── autonomous-skill 必须有明确边界和退出条件
├── /claude-mem:do 每阶段必须通过 Verification subagent 验证后才提交
├── /code-review 需要已有 PR（不是本地审查）
├── /review-pr 用于本地代码审查（基于 git diff）
├── 重要操作前必须人工确认
└── 跨会话任务必须有进度持久化
```

---

## 11. 质量门禁（Quality Gates）

### 11.1 分级质量检查

| 级别 | 适用场景 | 检查项 | Skill 用法 |
|------|---------|--------|-----------|
| **L1 轻量** | 小修改、配置变更 | 代码审查 | `/review-pr code` |
| **L2 标准** | 功能开发、Bug 修复 | 代码 + 错误处理 + 简化 | `/review-pr code errors simplify` |
| **L3 严格** | 核心模块、安全相关 | 全维度审查 | `/review-pr all` |
| **L4 最高** | 发版前、重大重构 | 全维度 + PR 审查 + 迭代修复 | `/review-pr all` → `/code-review`（PR 上）→ `/ralph-loop` 修复 |

### 11.2 `/code-review` vs `/review-pr` 区别

| 维度 | `/code-review` | `/review-pr` |
|------|---------------|-------------|
| **使用时机** | PR 已创建后 | 提交/PR 创建前 |
| **输入来源** | GitHub PR diff | 本地 git diff |
| **审查方式** | 5 个 agent + 置信度评分 | 6 个可选维度 |
| **输出方式** | 自动在 PR 上发表评论 | 在对话中返回报告 |
| **过滤机制** | 置信度 ≥80 才输出 | 按 Critical/Important/Suggestion 分级 |

### 11.3 强制门禁规则

```
所有代码必须通过：
1. ✅ 代码审查（/review-pr code 无 Critical 问题）
2. ✅ 全部测试通过
3. ✅ 无安全漏洞（OWASP Top 10）
4. ✅ 无敏感信息泄露

核心模块额外要求：
5. ✅ 类型设计审查通过（/review-pr types）
6. ✅ 静默失败检测通过（/review-pr errors）
7. ✅ 测试覆盖度达标（/review-pr tests）
8. ✅ 注释准确性验证（/review-pr comments）
```

---

## 12. Skill 速查表

### 12.1 按开发阶段

| 阶段 | Skill | 用途 | 真实机制 |
|------|-------|------|---------|
| **需求** | `/spec-kit` | 规格驱动开发 | 7 阶段：Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement。需先安装 `specify` CLI |
| **规划** | `/claude-mem:make-plan` | 分阶段实施计划 | Orchestrator 模式，subagent 做文档发现，强调从文档拷贝而非发明 API |
| **探索** | `/claude-mem:smart-explore` | 代码结构搜索 | 3 层 MCP 工具：smart_search → smart_outline → smart_unfold，比 Read 省 4-8x token |
| **设计** | `/feature-dev` | 引导式功能开发 | 7 阶段，含 3 个人工等待点（消歧/选方案/批准实现） |
| **UI 设计** | `impeccable` | 设计质量守护 | 20 个专精命令（/audit /critique /polish /colorize 等），反 AI 味，OKLCH 色彩，7 大参考文档 |
| **实现** | `/claude-mem:do` | 执行分阶段计划 | Orchestrator 全委托 subagent，每阶段 4 步验证后才提交 |
| **自动迭代** | `/ralph-loop` | 自主循环直到完成 | stop hook 机制，相同 prompt 反馈循环，AI 读文件/git 感知上轮成果 |
| **长周期** | `autonomous-skill` | 跨会话自主执行 | 双 agent（Initializer + Executor），.autonomous/ 目录持久化，自动续接 |
| **本地审查** | `/review-pr` | 提交前审查 | 6 个可选维度（code/errors/tests/types/comments/simplify），基于 git diff |
| **PR 审查** | `/code-review` | PR 自动评论 | 5 个 Sonnet agent 并行 + Haiku 评分，≥80 才输出，自动发 PR 评论 |
| **提交** | `/commit` | 规范化提交 | 读取 git status/diff/log，自动匹配 commit 风格，单次完成 |
| **PR** | `/commit-push-pr` | 一站式交付 | 自动建分支 + commit + push + gh pr create |
| **沉淀** | `/revise-claude-md` | 经验写入 CLAUDE.md | 从当前会话提取经验更新项目规范 |
| **记忆查询** | `/claude-mem:mem-search` | 跨会话记忆 | 3 层：search（索引）→ timeline（上下文）→ get_observations（详情） |
| **取消循环** | `/cancel-ralph` | 取消 ralph-loop | 安全退出正在运行的 ralph-loop |
| **清理** | `/clean_gone` | 清理分支 | 删除远程已删除的本地分支 + 关联 worktree |

### 12.2 按问题类型

| 我想要... | 使用 | 说明 |
|----------|------|------|
| 从零开始一个项目 | `/spec-kit` → `/claude-mem:do` | spec-kit 定规格，do 执行计划 |
| 给项目加个新功能 | `/feature-dev` | 7 阶段引导式，含 3 个人工确认点 |
| 修一个 Bug | `smart-explore` → `/review-pr code errors` | 结构化定位 + 代码/错误审查 |
| 优化性能/质量 | `/ralph-loop` + `/review-pr` | 自动迭代 + 全面审查 |
| 重构代码 | `make-plan` → `do` → `/review-pr all` | 规划 + 执行 + 全维度审查 |
| 做 UI 页面 | `impeccable`（/audit /critique）→ `/feature-dev` | 设计审计+评审 → 功能开发 |
| 跑一个大任务 | `autonomous-skill` | 跨会话自主执行，自动续接 |
| 查之前怎么做的 | `/claude-mem:mem-search` | 搜索跨会话记忆 |
| 提交前审查代码 | `/review-pr` | 基于 git diff 的本地审查 |
| PR 上自动审查 | `/code-review` | 需要已有 PR，自动发评论 |
| 提交并创建 PR | `/commit-push-pr` | 一站式交付 |

---

## 13. 流程选择决策树

```
开始
 │
 ├── Q1: 是否有现有代码库？
 │    ├── 否 → 从 0 开发流程（场景一）
 │    └── 是 ↓
 │
 ├── Q2: 任务类型？
 │    ├── 新增功能 → 增量功能开发（场景二）
 │    ├── 修复问题 → Bug 修复（场景四）
 │    ├── 优化改进 → 迭代优化（场景三）
 │    ├── 结构调整 → 代码重构（场景五）
 │    ├── 界面相关 → UI/UX 开发（场景六）
 │    └── 大型/长期 → 长周期任务（场景七）
 │
 ├── Q3: 预估复杂度？
 │    ├── 简单（< 50 行改动）→ 直接开发 + L1 质量门禁
 │    ├── 中等（50-500 行）→ 标准流程 + L2 质量门禁
 │    ├── 复杂（> 500 行）→ 完整流程 + L3 质量门禁
 │    └── 超大型（跨会话）→ autonomous-skill + L4 质量门禁
 │
 └── Q4: 是否涉及安全/核心模块？
      ├── 是 → 强制 L3+ 质量门禁
      └── 否 → 按复杂度选择门禁级别
```

---

## 附录：通用交付 Checklist

每次交付前对照检查：

```
代码质量：
□ /review-pr code 无 Critical 问题
□ 代码简洁易读（/review-pr simplify）
□ 所有测试通过

安全：
□ 无敏感信息泄露
□ 输入已验证
□ 无 OWASP Top 10 漏洞

Git：
□ commit message 规范、清晰
□ PR 描述完整
□ 变更范围最小化

知识沉淀：
□ /revise-claude-md 已执行
□ 重要决策已记录
□ 经验可跨会话复用（claude-mem 自动记录）
```

---

> **文档版本**：v1.1
> **最后更新**：2026-03-20
> **维护者**：AI-Express Team
> **数据来源**：所有 Skill 描述基于 `~/.claude/plugins/` 下的实际安装文件
