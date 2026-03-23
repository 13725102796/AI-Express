# 多 Agent 协作全流程产品开发实践

## 背景

在 KnowBase（个人知识库）项目中，从零搭建了一套 12 个 Agent 的完整产品开发流水线，覆盖从需求→调研→产品→设计→开发→测试的全生命周期。本文档总结关键经验和踩过的坑。

## 一、Agent 体系设计经验

### 1.1 角色分工原则

**每个 Agent 只做一件事**，不要让一个 Agent 既写 PRD 又写代码。实际落地的 12 个角色：

| Phase | Agent | 核心职责 |
|-------|-------|---------|
| 0 需求 | research-agent | 市场调研（产研报告 + 设计色彩报告） |
| 0 需求 | product-agent | PRD 编写 + 页面拆解 |
| 0 需求 | design-agent | 风格探索 demo.html |
| 1 设计 | page-design-agent | 逐页生成完整 HTML |
| 1 设计 | design-reviewer-agent | 设计质量审查 |
| 2 开发 | tech-architect-agent | 技术选型 + 架构设计 |
| 2 开发 | frontend-dev-agent | 前端开发 |
| 2 开发 | backend-dev-agent | 后端开发 |
| 2 开发 | test-agent | 代码测试 + 浏览器实操测试 |
| 编排 | phase0/1/2-orchestrator | 各阶段流程编排 |

### 1.2 关键设计决策

**设计细节由设计 Agent 决策，不上升给用户**：审查中发现的圆角 px 值、字号等偏差，由设计 agent 自主调整，orchestrator 负责同步 PRD。避免用户被细节打扰。

**调研报告是参考，不是指令**：research-agent 的产研报告和设计色彩报告仅提供数据支撑，产品 Agent 和设计 Agent 基于自身专业判断独立决策。

**输出物料集中管理**：所有交付物统一放在 `项目角色agent/输出物料/[项目名称]/` 下，每个项目一个文件夹，避免文件散落。

## 二、并行化是核心提效手段

### 2.1 页面生成并行

8 个页面可以同时生成（都读取同一份 page-specs.md + demo.html），从串行 8×5min = 40min 压缩到 ~7min。

### 2.2 审查并行

每轮审查中，所有页面的审查同时进行。Claude 需求审查 + 设计审查也并行。

### 2.3 修改并行

所有需修改的页面同时修改，不等前一个改完再改下一个。

### 2.4 开发+测试流水线

模块级流水线：后端模块完成 → 立即测试 → 同时前端开发 → 前端完成 → 立即测试。不是"全部开发完再全部测试"。

## 三、审查机制经验

### 3.1 3 轮审查是必要的

- Round 1：发现结构性问题（元素缺失、逻辑遗漏）
- Round 2：复查修复 + 深入交互细节
- Round 3：打磨体验（动效、文案、间距）

实践数据：页面拆解 3 轮（9→9.5→10），页面设计 3 轮（77-92 → 修复 → 定稿）。

### 3.2 Dev-QA 有限重试（来自 Agency-Agents 项目）

每个模块最多 3 次 Dev-QA 循环，防止无限循环。第 3 次仍 FAIL 则升级处理（拆分/简化/标记限制）。

### 3.3 证据驱动（来自 Agency-Agents 项目）

- 没有截图的结论自动拒绝
- 默认判定 NEEDS WORK
- 自动失败触发器：满分无证据 → 自动 FAIL

### 3.4 结构化交接模板

Agent 间传递任务使用标准模板（来源/目标/模块/输入/验收标准），QA 结果使用 PASS/FAIL/ESCALATION 模板。解决多 agent 协作中 73% 发生在交接边界的上下文丢失问题。

## 四、踩过的坑

### 4.1 Gemini CLI 模型映射问题

**问题**：design-agent 调用 Gemini CLI 时手动传 `-m gemini-3.1-pro-high`，但代理服务将其映射为 `gemini-2.5-pro`，导致模型不对。

**解决**：不要传 `-m` 参数，让 CLI 读取 `~/.gemini/.env` 中的配置。

**教训**：外部工具的配置优先级需要理解清楚，不要在命令行覆盖配置文件。

### 4.2 子 Agent 不继承全局 effort 设置

**问题**：全局 `settings.json` 设置了 `effortLevel: "max"`，但子 agent 不自动继承。

**解决**：在每个 agent 的 frontmatter 中显式添加 `effort: max`。

### 4.3 页面风格不一致（P-04 偏差事件）

**问题**：P-04 详情页与其他页面视觉风格严重偏差——SVG 图标用了 fill（实心）而非 stroke（线条），dev-bar 用了深色背景。

**根因**：不同 agent 实例对"SVG 图标风格"的理解不一致。

**解决**：以 P-03（质量最高的页面）为基准重写 P-04，明确指定"从 P-03 复制 AppShell 样式"。

**教训**：跨页面风格一致性需要有明确的"基准页面"参考，不能只依赖 CSS 变量。

### 4.4 启动错误的 dev server

**问题**：端口 3000 上运行着别的项目，Playwright 测试打开后发现页面标题是 "v0 App" 而非 "KnowBase"。

**解决**：kill 掉错误进程，从正确的项目目录启动 dev server。

**教训**：测试前必须验证 dev server 是否对应正确的项目（检查页面标题/内容）。

### 4.5 Playwright MCP 版本不匹配

**问题**：`npx playwright install` 安装了 chromium-1208，但 MCP 服务要的是 chromium-1200。

**解决**：创建符号链接 `ln -sfn chromium-1208 chromium-1200`。

**教训**：MCP 工具的 Playwright 版本与全局安装的可能不同，需要检查 MCP 实际依赖的版本。

### 4.6 子 Agent 无法使用 Playwright MCP 工具

**问题**：通过 Agent tool 启动的子 agent 没有 Playwright MCP 工具的权限。

**解决**：在主会话中直接执行浏览器测试，不委托给子 agent。

**教训**：MCP 工具的权限作用域是主会话级别，子 agent 可能无法访问。需要在主会话中执行需要 MCP 工具的操作。

## 五、技术选型经验（双轨验证）

### 选型方法论

**新技术轨**：全网搜索 2025-2026 最新方案，确保享受技术红利。
**成熟模式轨**：验证是否支持成熟架构模式，确保稳定可靠。
**交叉验证**：最新稳定版 × 成熟架构模式 × 生产级案例。

### KnowBase 最终选型

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| 前端 | Next.js 16 + React 19 | Vercel AI SDK useChat 原生流式支持 |
| 后端 | FastAPI | Python AI 生态（LangChain/Docling）无可替代 |
| 向量库 | PostgreSQL + pgvector | MVP 够用，与业务数据共库，RLS 数据隔离 |
| LLM | Claude Sonnet 4 + Gemini Flash | Claude 引用准确，Gemini Flash 低成本 |

## 六、流程效率数据

| 阶段 | 耗时 | 产出 |
|------|------|------|
| Phase 0 需求 | ~1h | PRD + 调研报告 + demo.html |
| Phase 1 设计 | ~3h | page-specs + 8 个页面 HTML（3 轮审查） |
| Phase 2 开发 | ~2h | 前端 67 文件 + 后端 44 文件 + 测试报告 |

**总计约 6 小时**完成从零到可运行代码的全流程。

## 适用场景

- 从零开始的产品开发（有明确需求描述）
- 需要设计稿 → 代码的完整链路
- 多人协作项目中的 AI 辅助开发
- 快速原型验证（MVP）

## 相关项目

- KnowBase 个人知识库（本次实践项目）
- AI-Express 最佳实践知识库（agent 定义存放处）

---
*最后更新: 2026-03-23*
