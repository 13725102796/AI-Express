---
name: _protocol
description: 全局交接协议 — 所有 orchestrator 和 agent 共同遵循的结构化通信格式。定义任务派发、完成报告、审查反馈、升级上报、状态追踪的标准格式。
---

# 全局交接协议 v1

> 本协议是所有 orchestrator 和 agent 的**单一事实来源**。修改此文件即全局生效。
> 参考架构：Claude Code coordinator 模式（结构化 XML 通知 + 消息队列 + 上下文继承）

---

## 1. 任务派发格式（orchestrator → agent）

每次使用 Agent 工具派发任务时，prompt **必须**以此结构开头：

```xml
<task-handoff>
<task-id>[phaseN]-[stepN]-[agent名]-[序号]</task-id>
<from>[来源 orchestrator 或 agent]</from>
<to>[目标 agent 名称]</to>
<project>[项目名称]</project>
<output-dir>[完整输出路径]</output-dir>

<objective>[一句话任务目标，不超过 50 字]</objective>

<context-snapshot>
[上游关键决策的结构化摘要。必须是决策内容本身，不是文件路径。必须包含：]
- 核心需求：[PRD 关键结论，1-2 句]
- 设计决策：[配色/字体/动效的具体值，如有]
- 技术选型：[框架/版本，如有]
- 前置约束：[来自上游 agent 的硬约束]
- 已知风险：[上游发现但未解决的问题]
</context-snapshot>

<input-files>
- [文件路径]: [文件包含什么 + agent 需要从中提取什么]
</input-files>

<deliverables>
- [输出文件名]: [验收标准 — 可测试的 PASS/FAIL 条件]
</deliverables>

<constraints>
- [技术/范围/时间约束]
</constraints>

<self-check>
[agent 提交前必须自行验证的检查项，从 _self-check-library.md 中按角色提取]
- [ ] [检查项 1]
- [ ] [检查项 2]
</self-check>
</task-handoff>

[可选的补充自然语言说明]
```

### 关键规则

1. **`<context-snapshot>` 禁止为空**。如果 orchestrator 无法填写，说明自身对上游决策的理解不足——应先读取上游输出再派发。
2. **`<self-check>` 必须从 `_self-check-library.md` 中按角色复制**，不可省略。
3. **`<deliverables>` 的验收标准必须可测试**——用"包含 N 个 section"、"CSS 变量数量 ≥ N"等可验证条件，不用"质量好"等模糊描述。

---

## 2. 任务完成报告（agent → orchestrator）

每个 agent 完成任务后，**最终输出的末尾**必须包含以下结构：

```xml
<task-completion>
<task-id>[与派发时相同的 task-id]</task-id>
<status>[completed | partial | failed]</status>
<summary>[一句话结果摘要]</summary>

<deliverables>
- [文件名]: [done | partial | skipped] — [一句话描述]
</deliverables>

<self-check-results>
- [x] [检查项 1]: PASS
- [ ] [检查项 2]: FAIL — [原因]
</self-check-results>

<key-decisions>
- [在执行过程中做出的重要决策]: [理由]
</key-decisions>

<escalations>
[需要上报给 orchestrator 的问题。包括但不限于：]
- 输入文件缺失或格式不符预期
- 发现需求矛盾或歧义
- 任务范围超出预估
- 技术方案遇到不可调和的冲突
- 上游决策可能有误
[如果没有需要上报的问题，写"无"]
</escalations>

<downstream-context>
[下游 agent 需要知道的关键信息。格式化为可直接复制到下一个 <context-snapshot> 的内容]
</downstream-context>
</task-completion>
```

### 关键规则

1. **`<self-check-results>` 必须逐项回应 `<self-check>` 中的每个检查项**。有 FAIL 项时，先尝试自行修复再提交。
2. **`<escalations>` 禁止为空字符串** — 没有问题时写"无"。
3. **`<downstream-context>` 是对下游 agent 的"预编译上下文"**——orchestrator 可直接将其纳入下一个 `<context-snapshot>`。

---

## 3. 审查反馈格式（reviewer → agent）

所有审查输出（orchestrator 自检 或 design-reviewer-agent 审查）必须使用以下格式：

```xml
<review-issue>
<issue-id>[R{轮次}-{序号}]</issue-id>
<severity>[critical | major | minor | suggestion]</severity>
<category>[需求偏差 | 交互缺陷 | 视觉不一致 | 代码错误 | 性能问题 | 类型不匹配]</category>
<location>[文件路径:行号 或 CSS选择器 或 组件名称]</location>
<description>[问题描述]</description>
<repro-steps>
1. [复现步骤 1]
2. [预期结果]
3. [实际结果]
</repro-steps>
<fix-guidance>[建议的修复方向，不只是"这里不好"，要说"改成什么"]</fix-guidance>
</review-issue>
```

### 审查修改指令格式

orchestrator 合并审查结果后，发送给 agent 的修改指令使用：

```xml
<fix-request>
<round>[当前轮次]</round>
<page>[页面编号 + 名称]</page>
<issues>
[按 severity 排序的 <review-issue> 列表]
</issues>
<acceptance-criteria>
修复后需要满足的验证条件：
- [逐条列出]
</acceptance-criteria>
</fix-request>
```

### 审查合并规则

- 多来源 issue（orchestrator + reviewer）合并到同一列表
- 相同 location 的 issue 合并，取更高 severity
- `critical` 必须修复才能进入下一轮
- `suggestion` 可选修复

---

## 4. 升级上报协议（agent → orchestrator）

当 agent 在执行中遇到以下情况，**必须**在 `<task-completion>` 的 `<escalations>` 中上报：

| 上报场景 | 上报内容 |
|---------|---------|
| 输入文件缺失/格式错误 | 缺失的文件名 + 期望格式 |
| 需求矛盾/歧义 | 矛盾点 + 影响范围 |
| 范围超出预估 | 估计工作量 + 建议拆分方案 |
| 技术冲突 | 冲突双方 + 各自利弊 |
| 上游决策可能有误 | 可能错误的决策 + 依据 |

### orchestrator 处理 escalation 的协议

收到 `<task-completion>` 后：

1. 检查 `<escalations>` 是否有实际内容（非"无"）
2. 评估影响范围：
   - **仅当前步骤** → 记录到 context.md，继续执行
   - **影响后续步骤** → 暂停，更新 context.md，调整后续派发的 `<context-snapshot>`
   - **影响整个 phase** → 暂停，向用户上报
3. 将处理结果记录到 status 文件

---

## 5. 状态文件格式（机器可解析）

每个 phase 的 `phaseN-status.md` 使用以下格式：

```markdown
---
phase: [N]
project: [项目名称]
started: [ISO timestamp]
last_updated: [ISO timestamp]
current_step: [step-id]
overall_status: [pending | in_progress | completed | blocked | failed]
---

## Steps

### [step-id]
- status: [pending | in_progress | completed | failed | skipped]
- agent: [agent 名称]
- started: [timestamp]
- completed: [timestamp]
- retry_count: [0-3]
- deliverables:
  - [文件名]: [verified | pending | failed]
- notes: [关键信息]
- escalations: [从 agent 上报的问题摘要]

### [next-step-id]
- status: pending
- depends_on: [前置 step-id]

## Blockers
- [blocker 描述 + 关联 step-id]

## Resume Protocol
从 current_step 恢复：
1. 验证前置 step 的 deliverables 文件存在且状态为 verified
2. 读取 current_step 的 notes 和 escalations
3. 继续执行
```

---

## 6. Agent 继续 vs 重建决策规则

当 agent 输出需要修改时：

### 优先 SendMessage 继续（保留上下文）

适用场景：
- 交接物验证发现小问题（缺少某个 section、格式不对）
- 审查反馈需要修改（agent 已有完整上下文）
- agent 上报了 escalation 且 orchestrator 已有解决方案

继续时的 prompt 格式：
```
你之前的输出需要以下调整：

<fix-items>
1. [具体修改项 + 位置 + 期望结果]
2. [...]
</fix-items>

请修改后重新输出 <task-completion>。
```

### 重建新 Agent

适用场景：
- 之前的 agent 方向完全错误（输出与预期结构不符）
- 上下文已被错误信息污染（连续 2+ 轮修复同一问题未果）
- 需要切换到不同的 agent 类型

> **决策依据**："Continue workers when context overlaps; spawn fresh when context pollutes."

---

## 7. 交接物验证协议

orchestrator 每次收到 agent 返回后，执行以下验证：

### 三步验证

1. **文件存在性**：用 Glob 确认 `<deliverables>` 中的文件存在，文件大小 > 0
2. **结构完整性**：用 Grep 搜索必要标记
   - PRD.md: 必须包含 `## 3` + `## 5` + `## 6`（功能需求 + 信息架构 + 设计指引）
   - demo.html: 必须包含 `--color-primary` + `--font-heading` + `--space-`
   - tech-architecture.md: 必须包含 `API` + `数据模型`
   - shared-types.md: 必须包含 `interface` + `Request` + `Response`
   - page-specs.md: 每个页面必须包含 `交互逻辑` + `核心组件`
3. **内容质量**：读取关键 section，验证非空且符合预期
4. **开发规范合规**（仅 fullstack-dev-agent 交付物）：
   - API 响应格式符合 `_dev-standards.md` 第 2.2 节（`{ code, data, message }`）
   - 数据库表包含 `created_at` + `updated_at`（第 3.1 节）
   - `.env.example` 存在且包含所有必填变量（第 8.1 节）
   - 代码中无 `_dev-standards.md` 第 9.1 节禁止的模式

### 验证失败处理

- 用 SendMessage 继续原 agent 补充（不重建）
- 告知具体缺失项和期望格式
- 记录到 status 文件的 notes 中
