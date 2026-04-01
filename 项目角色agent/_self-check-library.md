---
name: _self-check-library
description: Agent 自检清单库 — 按角色定义的预提交质量门控。orchestrator 派发任务时从此文件中按角色复制对应检查项到 <self-check>。
---

# Agent 自检清单库

> orchestrator 在构造 `<task-handoff>` 的 `<self-check>` 时，从此文件中按目标 agent 角色复制对应的检查项。
> agent 在提交 `<task-completion>` 前，必须逐项验证并将结果填入 `<self-check-results>`。

---

## research-agent

- [ ] 调研报告包含 ≥ 3 个竞品分析，每个竞品有功能对比
- [ ] 每个关键结论附有数据来源（URL 或出处），无来源的结论标注"待验证"
- [ ] 产研报告（research-market.md）和设计报告（research-design.md）分别独立输出
- [ ] 配色方案推荐基于行业数据而非个人偏好，附推荐理由

---

## product-agent

### PRD 模式
- [ ] PRD 包含完整的 5W1H（Who / What / When / Where / Why / How）
- [ ] 功能列表有明确的 P0 / P1 / P2 优先级标记
- [ ] 信息架构中的页面数量与后续 page-specs 将要描述的页面数量一致
- [ ] 每个功能的验收标准使用 Given / When / Then 格式，包含具体数值
- [ ] 设计指引部分包含明确的调性描述（不只是"好看"）
- [ ] 无模糊用词："等"、"可能"、"大概"、"应该"、"差不多"

### Page-specs 模式
- [ ] 每个页面规格包含：页面目标、核心组件清单、交互逻辑、数据需求
- [ ] 页面间的导航关系完整（A 页面链接到 B，B 也能回到 A）
- [ ] 每个交互逻辑描述了触发条件和预期结果
- [ ] 组件清单与 PRD 功能需求一一对应，无遗漏

---

## design-agent

- [ ] demo.html 可独立打开且无控制台错误
- [ ] 所有 CSS 变量使用 OKLCH 色彩空间
- [ ] 至少包含四大系统：色彩系统 + 字体系统 + 间距系统 + 动效系统
- [ ] 组件样例覆盖基础状态（default / hover / active / disabled / focus）
- [ ] 设计风格与 PRD 设计指引的调性一致
- [ ] 如果偏离了 Impeccable 默认美学，在 `<key-decisions>` 中说明原因

---

## page-design-agent

- [ ] HTML 文件可独立在浏览器打开且无控制台错误
- [ ] 所有颜色、字体、间距引用 demo.html 的 CSS 变量（不硬编码值）
- [ ] 交互逻辑与 page-specs.md 对应页面描述一致
- [ ] 响应式布局在 375px（移动）、768px（平板）、1440px（桌面）三个断点下无明显破损
- [ ] 页面内的导航链接/按钮与 page-specs.md 中的页面间关系一致
- [ ] 文本内容使用真实感内容（不是 Lorem ipsum）

---

## tech-architect-agent

- [ ] 每个 API 端点有明确的 HTTP 方法 + 路径 + 请求/响应 Schema
- [ ] 数据模型关系完整（所有外键、索引已标注）
- [ ] 模块拆分粒度合理（每个模块可独立开发和测试）
- [ ] `shared-types.md` 已生成，覆盖所有 API 端点的 Request / Response 类型
- [ ] 技术选型有明确理由（不只是"流行"）

---

## fullstack-dev-agent

### 后端
- [ ] 所有 API 路由的请求/响应 Schema 与 shared-types.md 一致（不自行定义类型）
- [ ] 数据库模型与 tech-architecture.md 的数据模型定义一致
- [ ] 服务启动后 health check 端点可访问
- [ ] 无硬编码密钥、凭证、数据库连接串（使用环境变量）
- [ ] API 错误响应格式统一（包含 code + message）

### 前端
- [ ] 所有 API 请求/响应类型与 shared-types.md 一致（不自行定义类型）
- [ ] 组件使用设计令牌（引用 CSS 变量，不硬编码颜色/字体/间距）
- [ ] `npm run build`（或对应构建命令）无错误
- [ ] 路由路径与 page-specs.md 定义的页面结构一致
- [ ] 无硬编码的 API 地址（使用环境变量或配置文件）

### 全栈联调
- [ ] 前端 Service 层调用的 API URL 与后端路由定义完全一致
- [ ] 前后端错误码对齐（后端返回的 error code 前端都有对应处理）
- [ ] 完整业务链路可跑通（注册→登录→核心功能→数据持久化验证）

---

## test-agent

- [ ] 每个测试用例有明确的前置条件和预期结果
- [ ] 测试覆盖所有 P0 功能（PRD 中标记的核心功能）
- [ ] 失败的测试附有截图/日志证据和复现步骤
- [ ] 测试报告明确区分环境问题 vs 代码 bug
- [ ] 使用的测试数据策略与后端就绪程度匹配（参见渐进式测试策略）

---

## design-reviewer-agent

- [ ] 每个问题使用 `<review-issue>` 格式（含 issue-id / severity / location / repro-steps）
- [ ] 问题按 severity 排序（critical → major → minor → suggestion）
- [ ] 每个问题有可定位的 location（CSS 选择器 / 组件名 / 行号）
- [ ] 未执行任何文件修改操作（审查者只审查，不修改）
- [ ] 量化指标已验证：硬编码色值数量、非 4 倍数间距数量等
