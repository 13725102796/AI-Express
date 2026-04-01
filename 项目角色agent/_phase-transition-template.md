---
name: _phase-transition-template
description: Phase 过渡文档模板 — 定义 Phase 之间的结构化交接格式，确保跨 Phase 的关键决策、文件清单和约束不丢失。
---

# Phase 过渡文档模板

> 每个 Phase 结束时，orchestrator 必须按此模板生成对应的过渡文档。
> 下一个 Phase 的 orchestrator 在 Step 0 必须读取并验证此文档。

---

## phase0-to-phase1.md 模板

```xml
<phase-transition>
<from>phase0</from>
<to>phase1</to>
<completed-at>[ISO timestamp]</completed-at>

<decisions>
- 产品定位：[一句话产品定义]
- 核心功能（P0）：[功能列表]
- 次要功能（P1）：[功能列表]
- 风格方向：[具体描述 + 选择理由]
- 配色方案：主色 [OKLCH值] / 辅色 [OKLCH值] / 强调色 [OKLCH值]
- 字体方案：标题 [字体名] / 正文 [字体名]
- 动效基调：[easing 函数] + [标准时长]
- 页面数量：[N] 页
- 设计调性：[具体调性关键词]
</decisions>

<file-manifest>
- PRD.md: [版本标记] — [核心章节列表] — [总字数约 N]
- demo.html: [CSS 变量数量] + [组件样例数量] + [覆盖的状态类型]
- research-market.md: [核心发现 3 句话]
- research-design.md: [选用配色方案编号 + 理由]
</file-manifest>

<open-issues>
- [未解决问题 + 建议处理方式]
</open-issues>

<constraints-for-next-phase>
- [Phase 1 必须遵守的设计约束]
- [用户明确提出的偏好/限制]
</constraints-for-next-phase>

<context-for-agents>
[预编译上下文块 — 可直接复制到 Phase 1 各 agent 的 <context-snapshot> 中]
本项目是[产品定位]。核心功能包括[P0 列表]。
设计风格为[调性]，使用[主色]为主色、[字体]为标题字体。
关键约束：[约束列表]。
</context-for-agents>
</phase-transition>
```

---

## phase1-to-phase2.md 模板

```xml
<phase-transition>
<from>phase1</from>
<to>phase2</to>
<completed-at>[ISO timestamp]</completed-at>

<decisions>
- 最终页面列表：[P01 名称, P02 名称, ... P0N 名称]
- 共享组件：[从多个页面中提取的可复用组件列表]
- 设计令牌摘要：
  - 主色: [OKLCH 值]
  - 辅色: [OKLCH 值]
  - 标题字体: [字体名]
  - 正文字体: [字体名]
  - 基础间距: [值]
  - 标准圆角: [值]
  - 标准动效: [easing] [时长]
- 审查中的设计调整：[在审查轮次中做出的重要设计变更]
</decisions>

<file-manifest>
- page-specs.md: [N] 页规格 — [总字数约 N]
- pages/P01-xxx.html: [页面描述] — [审查状态: PASS / 有条件 PASS]
- pages/P02-xxx.html: [页面描述] — [审查状态]
- ... [所有页面]
- demo.html: [最终版本变更摘要（相对 Phase 0）]
</file-manifest>

<quality-gate-results>
- 审查总轮次：[N] 轮
- 所有页面最终状态：[全部 PASS / 部分有条件 PASS]
- 遗留问题：[审查中发现但决定不修复的问题列表]
</quality-gate-results>

<constraints-for-next-phase>
- [Phase 2 必须遵守的设计约束]
- [从审查中发现的已知限制]
- [页面间的依赖关系]
</constraints-for-next-phase>

<context-for-agents>
[预编译上下文块 — 可直接复制到 Phase 2 各 agent 的 <context-snapshot> 中]
本项目是[产品定位]，包含 [N] 个页面：[页面列表]。
设计系统使用 OKLCH 色彩空间，主色[值]、辅色[值]。
标题字体[名称]、正文字体[名称]、基础间距[值]。
共享组件：[列表]。
技术约束：[列表]。
</context-for-agents>
</phase-transition>
```

---

## 使用规则

### 生成方

- Phase 0 orchestrator 在所有步骤完成后，生成 `phase0-to-phase1.md`
- Phase 1 orchestrator 在所有步骤完成后，生成 `phase1-to-phase2.md`
- 过渡文档存放在 `输出物料/[项目名称]/` 目录下

### 消费方

- Phase 1 orchestrator 的 **Step 0** 必须读取 `phase0-to-phase1.md`
- Phase 2 orchestrator 的 **Step 0** 必须读取 `phase1-to-phase2.md`

### 验证规则

消费方读取过渡文档后，必须验证：
1. `<decisions>` 所有字段非空
2. `<file-manifest>` 中列出的文件实际存在
3. `<context-for-agents>` 包含完整的预编译上下文

验证失败 → 停止流程，提示用户先完成上一个 Phase。
