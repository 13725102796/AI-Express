<phase-transition>
<from>phase0</from>
<to>phase1</to>
<completed-at>2026-04-09T02:00:00Z</completed-at>

<decisions>
- 产品定位：基于 Plane + Gitea 已有基础设施的轻量级研发效能数据聚合展示层，为杰森集团管理层提供只读的团队产出透明化窗口
- 核心功能（P0）：用户认证(JWT)、团队总览页(6面板)、项目明细页(燃尽图+里程碑+任务矩阵)、OKR看板页(树形展示+KR编辑)、管理后台(用户CRUD+作者映射+同步日志)、数据同步引擎(Plane 15min+Gitea 30min)、角色权限控制(admin/manager/developer/viewer)
- 次要功能（P1）：个人产出页(交付率趋势+热力图+KPI卡)、Git活动页(团队热力图+PR指标)
- 风格方向：信赖靛蓝(Trusted Indigo) -- 专业商务调性，亮色为主，靛蓝主色+琥珀强调色+微暖白背景。选择理由：目标用户为30-50岁管理层/CTO，专业商务调性接受度最高，行业契合度5/5
- 配色方案：主色 oklch(0.45 0.12 255) / 辅色 oklch(0.55 0.03 250) / 强调色 oklch(0.75 0.15 75)
- 字体方案：标题 Plus Jakarta Sans (extrabold/bold) / 正文 Plus Jakarta Sans (regular/medium) / 代码 JetBrains Mono
- 动效基调：ease-out-quart cubic-bezier(0.25,1,0.5,1) + 入场600ms ease-out-expo + hover 200ms + active 100ms
- 页面数量：8 页 (登录、团队总览、项目明细、个人产出、OKR看板、Git活动、管理后台、404)
- 设计调性：专业可信(Professional)、清晰高效(Efficient)、数据驱动(Data-driven)、管理层友好
</decisions>

<file-manifest>
- PRD.md: v1.0 -- 8 章节(产品概述/用户画像/功能需求/非功能需求/信息架构/设计指引/范围边界/开放问题) -- 约 6000 字
- demo.html: 65+ CSS 变量 + 6 section(Hero/配色/字体/组件/仪表盘预览/动效) + 覆盖状态(hover/active/focus/disabled) + Design Tokens 参考表
- research-market.md: 核心发现 -- (1)研发效能度量行业处于成长期，DORA指标采用率40.8%，Gartner预测2027年50%软工组织将采用开发者生产力洞察平台；(2)竞品LinearB/Jellyfish/Swarmia均为SaaS不支持自托管，自托管是本项目核心差异化；(3)市场从"监控"转向"赋能"叙事，度量数据应帮助发现瓶颈而非作为绩效监视器
- research-design.md: 选用方案A"信赖靛蓝" -- 理由：管理层接受度5/5、行业契合度5/5、无障碍友好度5/5，亮色为主+靛蓝导航+琥珀CTA
</file-manifest>

<open-issues>
- Plane 社区版 API 请求频率限制未明确，15min 同步频率可能需根据实际测试调整
- 杰森集团实际团队规模和产品线数量待确认（影响数据量级和性能预期）
- viewer 角色的"下属"关系定义方式待确认（是否需要 users 表增加"上级"字段）
- KPI 权重配置是否需要可配置化（当前 PRD 写死 70%/30%）
- SQLite 数据增长后的归档策略待 Phase 2 规划
</open-issues>

<constraints-for-next-phase>
- OKLCH 色值须在 CSS 中提供 HEX fallback（格式：color: #HEX; color: oklch(...)），以支持 Chrome 90-110 和 Firefox 90-112
- Warning 色分层使用：大文字/图标用 --color-warning oklch(0.65 0.16 70)，小文字标签用 --color-warning-text oklch(0.55 0.18 70)
- ECharts 图表配色使用 HEX 值配置（#3B5998, #0D9668, #D4920A, #7C4DBA, #2B8CA3），CSS 使用 OKLCH
- 所有可交互元素最小 44x44px 触控区域（pointer:coarse 设备 48px）
- 动效必须处理 prefers-reduced-motion，归零所有动画
- 不使用纯黑 #000000、纯白 #FFFFFF、纯灰色，所有中性色带蓝色调 (hue 250)
- 不使用 bounce/elastic easing，不使用 glassmorphism/渐变背景/卡片嵌套
- 间距系统基于 4px 倍数
- 用户已指定技术栈（Bun + Hono + Drizzle + SQLite + Vue 3 + Vite + ECharts + Naive UI），不可替换
- 数据仅在内网流转，完全自托管，Docker Compose 与 Plane/Gitea 同机部署
</constraints-for-next-phase>

<context-for-agents>
本项目是基于 Plane + Gitea 已有基础设施的轻量级研发效能数据聚合展示层（DevPerf Dashboard），为杰森集团管理层提供只读的团队产出透明化窗口。核心功能包括：JWT认证(4级角色)、团队总览页(6面板2x3Grid)、项目明细页(燃尽图+里程碑+任务矩阵)、OKR看板页(树形+KR编辑)、管理后台(用户CRUD+作者映射+同步日志)、数据同步引擎(Plane 15min/Gitea 30min)。
设计风格为"信赖靛蓝"(Trusted Indigo)专业商务调性，使用 oklch(0.45 0.12 255) 靛蓝为主色、oklch(0.75 0.15 75) 琥珀为强调色、oklch(0.985 0.005 250) 微暖白为背景色。标题字体 Plus Jakarta Sans (extrabold/bold)、正文 Plus Jakarta Sans (regular/medium)、代码 JetBrains Mono。4px 间距基础单位，圆角 btn:8px card:12px modal:16px。动效克制，ease-out-quart 为默认 easing，入场 600ms，hover 200ms。
关键约束：完全自托管(Docker Compose同机部署)、只读优先(OKR编辑是唯一写入)、OKLCH色值须有HEX fallback、ECharts用HEX配色、过程指标仅诊断用(不作绩效打分依据)。技术栈：Bun + Hono + Drizzle ORM + SQLite + Vue 3 + Vite + TypeScript + ECharts + Naive UI。
</context-for-agents>
</phase-transition>
