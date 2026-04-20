# 研发人效 Dashboard 产研报告

> 调研时间：2026-04-09
> 调研范围：研发效能度量平台、工程管理仪表盘、开发者生产力分析工具
> 项目定位：基于 Plane + Gitea 已有基础设施的轻量级数据聚合展示层

## 1. 行业概况

### 1.1 市场规模（TAM/SAM/SOM）

- **TAM（Total Addressable Market）**：全球软件开发市场 2025 年达 8,239 亿美元，预计 2034 年增长至 22,483 亿美元，CAGR 11.8%。其中研发效能管理工具作为子赛道，Gartner 预测到 2027 年将有 50% 的软件工程组织采用"开发者生产力洞察平台"（Developer Productivity Insight Platforms） — 数据来源：[Gartner Peer Insights](https://www.gartner.com/reviews/market/developer-productivity-insight-platforms)、[Keyhole Software](https://keyholesoftware.com/software-development-statistics-2026-market-size-developer-trends-technology-adoption/)
- **SAM（Serviceable Available Market）**：面向中国中小企业（50-500人研发团队）的自托管研发效能展示层，估算规模约 5-10 亿人民币/年。推算依据：中国约 50 万家有研发团队的企业 x 5%-10% 有研发效能管理需求 x 年均 2-5 万元工具预算
- **SOM（Serviceable Obtainable Market）**：本项目为内部工具（杰森集团自用），SOM 为 0（非商业化产品）。但技术方案可复用到同类需求的中小企业，潜在可获取市场约 1000-3000 家企业
- **增长趋势**：研发效能度量从"可选"转为"必需"，DORA 指标框架采用率已达 40.8%，SPACE 框架采用率 14.1% — 数据来源：[Platform Engineering.org](https://platformengineering.org/blog/how-to-measure-developer-productivity-and-platform-roi-a-complete-framework-for-platform-engineers)

### 1.2 行业趋势与关键事件

1. **DORA 指标成为事实标准**：由 Google 收购的 DORA 团队定义的四大指标（部署频率、变更前置时间、变更失败率、恢复时间）已成为研发效能度量的基线框架 — [DORA.dev](https://dora.dev/)
2. **SPACE 框架补充团队健康维度**：微软提出的 SPACE 框架覆盖满意度、绩效、活动、协作、效率五个维度，强调"不要只看速度，还要看团队可持续性" — [Swarmia Blog](https://www.swarmia.com/blog/comparing-developer-productivity-frameworks/)
3. **AI 对度量的冲击**：84% 的开发者在 2025 年使用或计划使用 AI 工具，2026 年 LinearB 基准报告新增 AI 对交付速度、代码质量和团队健康的影响指标 — [LinearB 2026 Benchmarks](https://linearb.io/resources/software-engineering-benchmarks-report)
4. **自托管趋势加速**：Plane 已获得 50,000+ 团队部署，Docker 拉取量 500K+，GitHub 31K+ Stars，反映中小企业对数据主权的强烈需求 — [Plane GitHub](https://github.com/makeplane/plane)
5. **从"监控"到"赋能"的叙事转变**：行业共识是度量工具应帮助 CTO/组长发现瓶颈和提供支持，而非作为绩效考核的"监视器" — [EM-Tools](https://www.em-tools.io/engineering-metrics)

### 1.3 行业发展阶段判断

**成长期**。判断依据：
- 采用率快速增长（50% 预测增长）但尚未饱和
- 新玩家持续入场（DX、Swarmia、CodePulse 等近 2 年涌现）
- 度量框架从单一（DORA）向组合方案（DORA + SPACE + DX Core 4）演化
- 尚无绝对垄断者，市场格局分散

## 2. 竞品分析

### 2.1 竞品详情

#### LinearB

- **官网**：https://linearb.io
- **一句话定位**：面向工程团队的工作流优化和分析平台
- **核心功能**：DORA 指标追踪、Cycle Time 分析、gitStream 自动化工作流、部署频率监控、投资组合追踪
- **目标用户**：中大型研发团队（50+ 工程师），工程 VP/CTO
- **定价模式**：Free tier（小团队）→ Enterprise（按需报价），中等价位
- **优势**：深度 Git 集成、gitStream 工作流自动化、2026 基准报告行业影响力大
- **不足/用户吐槽**：功能重、上手门槛高、Roll-out 时间长 — 来源：[Jellyfish Blog](https://jellyfish.co/blog/linearb-alternatives-competitors/)
- **UI 风格关键词**：专业、数据密集、企业感
- **估算规模**：融资 $71M+，团队 100+ 人

#### Jellyfish

- **官网**：https://jellyfish.co
- **一句话定位**：工程管理平台，提供工程过程、资源分配和项目产出的可视化
- **核心功能**：工程投资分析、Sprint 绩效追踪、团队活动可视化、项目管理工具集成分析
- **目标用户**：工程管理层（VP Engineering、Director），关注战略层面
- **定价模式**：Enterprise 定价（年合约，按工程师数计费），高价位
- **优势**：直观拖拽式仪表盘、战略层面的工程投资分析、丰富的集成生态
- **不足/用户吐槽**：价格高、偏战略层面缺少开发者视角、不支持自托管 — 来源：[GetDX Blog](https://getdx.com/blog/jellyfish-alternatives/)
- **UI 风格关键词**：清爽、商务、仪表盘式
- **估算规模**：融资 $107M+，团队 200+ 人

#### Swarmia

- **官网**：https://www.swarmia.com
- **一句话定位**：开发团队的工程效能分析平台，聚焦 DORA 和工作流指标
- **核心功能**：DORA 指标仪表盘、SPACE 框架支持、代码审查分析、Sprint 交付追踪、Slack 集成
- **目标用户**：中等规模研发团队（20-200 人），工程经理
- **定价模式**：Free tier → Growth → Enterprise，中等价位
- **优势**：设置简单、仪表盘清晰直观、DORA + SPACE 双框架支持
- **不足/用户吐槽**：自定义指标能力有限、不支持自托管 — 来源：[CodePulse Comparison](https://codepulsehq.com/guides/engineering-analytics-tools-comparison)
- **UI 风格关键词**：简洁、现代、数据可视化友好
- **估算规模**：融资 $15M+，团队 50+ 人

#### DX（GetDX）

- **官网**：https://getdx.com
- **一句话定位**：开发者体验平台，融合调查和系统数据追踪团队健康
- **核心功能**：DX Core 4 框架（流畅度、认知负荷、协作、开发者满意度）、定期开发者调查、系统指标关联分析
- **目标用户**：关注开发者体验的工程领导
- **定价模式**：按工程师数计费
- **优势**：独特的"开发者体验"视角、定量+定性结合、不只看速度
- **不足/用户吐槽**：偏主观数据（依赖调查）、不太适合纯度量需求 — 来源：[Swarmia Blog](https://www.swarmia.com/blog/comparing-developer-productivity-frameworks/)
- **UI 风格关键词**：人性化、柔和、偏产品设计风
- **估算规模**：创始团队来自微软，早期阶段

#### Grafana（通用方案）

- **官网**：https://grafana.com
- **一句话定位**：开源可观测性平台，可通过插件和数据源实现研发效能仪表盘
- **核心功能**：自定义仪表盘、多数据源聚合、告警系统、插件生态
- **目标用户**：有定制能力的技术团队
- **定价模式**：开源免费（自托管）→ Grafana Cloud（按量计费）
- **优势**：完全可定制、自托管、免费、生态丰富
- **不足/用户吐槽**：需要自己搭建数据管道、不是开箱即用的研发效能方案、学习曲线陡峭
- **UI 风格关键词**：技术感、暗色为主、图表密集
- **估算规模**：Grafana Labs 融资 $480M+，全球最广泛的可观测性工具之一

### 2.2 竞品对比矩阵

| 维度 | LinearB | Jellyfish | Swarmia | DX | Grafana | DevPerf Dashboard（我们的机会） |
|------|---------|-----------|---------|----|---------|-----------------------------|
| 核心功能 | 工作流优化+DORA | 工程投资分析 | DORA+SPACE | 开发者体验 | 通用可观测 | Plane+Gitea 聚合展示 |
| 自托管 | 否 | 否 | 否 | 否 | 是 | 是（Docker Compose） |
| 数据源 | GitHub/GitLab/Jira | 多种PM+Git | GitHub/Jira | 调查+系统 | 任意 | Plane + Gitea（明确范围） |
| 上手难度 | 高 | 中 | 低 | 中 | 高 | 低（只读展示层） |
| 定价 | $$ | $$$ | $$ | $$ | 免费/按量 | 免费（自研） |
| 目标用户 | VP Eng | VP Eng | EM | 工程领导 | DevOps | CTO/组长/杰森管理层 |
| OKR管理 | 无 | 无 | 无 | 无 | 无 | 有（内置） |
| 中国企业适配 | 弱 | 弱 | 弱 | 弱 | 中 | 强（中文、内网部署） |

### 2.3 SWOT 分析（针对 DevPerf Dashboard）

| | 正面 | 负面 |
|---|------|------|
| **内部** | **Strengths**: (1) 完全自托管，数据不出内网 (2) 与已有 Plane+Gitea 基础设施深度集成 (3) 轻量级只读展示层，不重复造轮子 (4) 内置 OKR 管理（竞品都没有） (5) 技术栈现代轻量（Bun+Hono+SQLite） | **Weaknesses**: (1) 仅支持 Plane+Gitea 两个数据源 (2) 自研维护成本 (3) 缺少 DORA/SPACE 等标准框架度量 (4) 无社区生态支持 |
| **外部** | **Opportunities**: (1) 中国中小企业自托管研发效能工具空白 (2) "管理层只读窗口"定位差异化明确 (3) 可作为内部工具最佳实践向外输出 (4) Plane 社区版生态快速增长 | **Threats**: (1) Plane 可能自研 Dashboard 功能 (2) 飞书/钉钉的研发效能插件可能追赶 (3) 内部使用若沦为"监控"工具会遭开发者抵制 |

## 3. 用户需求洞察

### 3.1 用户声音汇总

**高频痛点 Top 5**

1. **指标监控沦为"监视器"** — 开发者感到被追踪而非被支持，行为扭曲（"刷 story point"） — 提及频次：高 — 来源：[EM-Tools](https://www.em-tools.io/engineering-metrics)、[Jellyfish Library](https://jellyfish.co/library/developer-productivity/pain-points/)
2. **工具分散，数据孤岛** — 团队平均使用 6+ 工具，13% 使用 14+ 工具，跨工具数据整合困难 — 提及频次：高 — 来源：[Jellyfish Pain Points](https://jellyfish.co/library/developer-productivity/pain-points/)
3. **仪表盘太复杂，指标过多** — "试图度量一切的仪表盘最终没人相信" — 提及频次：高 — 来源：[EM-Tools](https://www.em-tools.io/engineering-metrics)
4. **管理层缺少透明化窗口** — CTO/投资人无法快速了解研发进度，依赖人工汇报 — 提及频次：中 — 来源：用户需求原文（杰森集团场景）
5. **飞书表格管理研发进度效率低** — 手动更新、格式不统一、无法自动聚合 — 提及频次：中 — 来源：用户需求原文

**未被满足的需求**

- 轻量级、只读的管理层视角仪表盘（不是开发者日常工具，是管理者看全景的窗口）
- 基于已有 PM 工具数据的自动聚合（不要求二次录入）
- OKR 与研发进度的关联（竞品普遍缺失）
- 中文界面 + 内网部署的合规方案

**使用场景洞察**

- 场景 A：CTO 每周一早上打开 Dashboard，10 分钟内了解全部产品线 Sprint 进度和阻塞点
- 场景 B：组长在站会前查看团队成员的任务分配和代码活动，提前识别需要帮助的成员
- 场景 C：杰森集团投资管理层在季度评审时查看 OKR 完成率和研发产出趋势
- 场景 D：管理员在新成员入职时配置 Git 作者映射，确保数据归属正确

### 3.2 需求 KANO 分类

| 类型 | 需求 | 说明 |
|------|------|------|
| **基本型（Must-be）** | 团队总览仪表盘（Sprint 交付率、任务状态） | 没有这个 Dashboard 就失去存在意义 |
| **基本型（Must-be）** | 数据自动同步（Plane + Gitea） | 不自动同步 = 回到飞书表格手动模式 |
| **基本型（Must-be）** | 角色权限控制（admin/viewer 分离） | 杰森管理层只读是核心需求 |
| **基本型（Must-be）** | 项目明细（燃尽图、任务矩阵） | 管理层下钻到项目层是基础期望 |
| **期望型（One-dimensional）** | 个人产出页（交付率趋势、KPI 评分卡） | 做好了能帮助 1:1 沟通，做差了变成监控 |
| **期望型（One-dimensional）** | 筛选联动（时间/项目/人员筛选） | 筛选越灵活，Dashboard 越有用 |
| **期望型（One-dimensional）** | Git 活动统计（贡献热力图、PR 指标） | 代码活动可视化是管理者期望的 |
| **兴奋型（Attractive）** | OKR 看板（内联编辑、自动进度计算） | 竞品几乎都没有，有了是差异化亮点 |
| **兴奋型（Attractive）** | KR 关联 Plane Cycle/Module 自动同步进度 | 超出预期的自动化，大幅减少手动更新 |
| **无差异型（Indifferent）** | 暗色模式 | 管理层用户不太在意，开发者可能喜欢但非核心场景 |
| **无差异型（Indifferent）** | 移动端完整适配 | 管理层主要在电脑上看，移动端基础可用即可 |

## 4. 战略建议

### 4.1 差异化方向

DevPerf Dashboard 的核心差异化不在"功能多"，而在**精准定位**：

1. **"管理层只读窗口"** — 不是开发者的日常工具（那是 Plane），是管理层的全景视角。这个定位避免了与 LinearB/Swarmia 正面竞争
2. **Plane + Gitea 深度集成** — 不做通用集成，只做这两个数据源，做到数据最准确、延迟最低
3. **内置 OKR 管理** — 将战略目标（OKR）与执行进度（Sprint/Git）在同一界面关联，这是竞品的空白点
4. **自托管 + 中文 + 内网** — 完全满足中国中小企业的数据合规需求

### 4.2 MVP 功能建议

1. **团队总览（6 面板）** — Must-be — 这是 Dashboard 的核心页面，管理层打开就能获得全局视角
2. **数据自动同步** — Must-be — 没有自动同步，Dashboard 就是空壳
3. **项目明细（燃尽图+任务矩阵）** — Must-be — 管理层需要从总览下钻到项目的能力
4. **角色权限（admin/viewer）** — Must-be — 杰森管理层只读是硬性需求
5. **OKR 看板** — Attractive — 差异化亮点，建议 MVP 即包含，但可简化（先做展示和手动编辑，KR 自动关联 Plane 放到后续迭代）

### 4.3 风险提示

- **"监控"标签风险**：如果开发者感知此工具是"监控器"，会遭到隐性抵制。建议：(1) 过程指标（代码行数等）仅诊断用，不作考核依据 (2) 在 Dashboard 中明确标注"过程指标仅供参考" (3) 上线前与团队沟通定位
- **Plane API 稳定性风险**：Plane 社区版 API 文档不完善，实际返回格式可能与文档不一致，需要联调时间预留
- **数据归因风险**：Git 作者映射需要手动配置，新成员入职如果未配置会导致数据遗漏

### 4.4 商业模式建议

本项目为内部工具，无直接商业模式。但技术方案有外部价值：
- **开源方案**：将 DevPerf Dashboard 开源，吸引 Plane + Gitea 用户社区
- **模板复用**：抽象为"自托管研发效能 Dashboard 模板"，供类似基础设施的企业快速部署

## 附录

### 信息缺口

- Plane 社区版 API 的实际请求频率限制（官方文档未明确）
- 杰森集团实际团队规模和产品线数量（影响数据量级估算）
- 国内同类自托管研发效能工具的使用案例（信息有限）

### 数据来源清单

1. [Gartner Peer Insights - Developer Productivity Insight Platforms](https://www.gartner.com/reviews/market/developer-productivity-insight-platforms)
2. [Keyhole Software - Software Development Statistics 2026](https://keyholesoftware.com/software-development-statistics-2026-market-size-developer-trends-technology-adoption/)
3. [LinearB - 2026 Software Engineering Benchmarks Report](https://linearb.io/resources/software-engineering-benchmarks-report)
4. [Swarmia - Comparing Developer Productivity Frameworks](https://www.swarmia.com/blog/comparing-developer-productivity-frameworks/)
5. [Jellyfish - 9 Common Pain Points That Kill Developer Productivity](https://jellyfish.co/library/developer-productivity/pain-points/)
6. [EM-Tools - Engineering Metrics That Actually Matter](https://www.em-tools.io/engineering-metrics)
7. [Plane GitHub Repository](https://github.com/makeplane/plane)
8. [DORA - DevOps Research and Assessment](https://dora.dev/)
9. [Jellyfish vs LinearB vs Swarmia Comparison](https://codepulsehq.com/guides/engineering-analytics-tools-comparison)
10. [Platform Engineering - How to Measure Developer Productivity](https://platformengineering.org/blog/how-to-measure-developer-productivity-and-platform-roi-a-complete-framework-for-platform-engineers)
