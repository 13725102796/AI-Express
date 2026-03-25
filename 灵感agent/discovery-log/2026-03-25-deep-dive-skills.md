# OpenClaw & Skills 生态深度调研报告

> 调研日期：2026-03-25
> 调研方法：Web Search 验证 + 多源交叉核实
> 目的：验证此前发现日志中关于 OpenClaw 的信息准确性，并深入分析 Skills 生态

---

## 第一部分：信息验证结果

### 1.1 OpenClaw 是否真实存在？

**结论：确认存在，且规模超出预期。**

OpenClaw 是一个真实的、极其活跃的开源项目。核心事实如下：

| 声明 | 验证结果 | 状态 |
|------|----------|------|
| OpenClaw 是开源 AI Agent | 确认。由奥地利开发者 Peter Steinberger 创建，2025年11月首发 | 已验证 |
| 250,000+ GitHub Stars | 确认。2026年3月3日达到 250,829 stars，超越 React（243,000 stars）。截至3月24日已超 331,000 stars | 已验证，且已过时 |
| ClawHub 技能市场存在 | 确认。ClawHub 是官方 Skill 注册中心，地址 https://clawhub.ai/ | 已验证 |
| ClawHub 日安装量 15,000+ | 未能独立验证具体日安装量数据 | 信息缺口 |
| 13,729 个 Skill 已发布 | 确认。截至 2026年2月28日的数据 | 已验证 |

### 1.2 项目历史时间线

| 时间 | 事件 |
|------|------|
| 2025年11月 | Peter Steinberger 以 "Clawdbot" 之名首次发布 |
| 2026年1月27日 | 因 Anthropic 商标投诉，更名为 "Moltbot" |
| 2026年1月30日 | 再次更名为 "OpenClaw"（Steinberger 认为 Moltbot "不够顺口"） |
| 2026年1月底 | 上线 GitHub 后 72 小时内获 60,000 stars |
| 2026年2月14日 | Steinberger 宣布加入 OpenAI，项目移交开源基金会 |
| 2026年3月3日 | 超越 React，达 250,829 stars |
| 2026年3月24日 | 超过 331,000 stars |

**来源：**
- [OpenClaw - Wikipedia](https://en.wikipedia.org/wiki/OpenClaw)
- [The Story of OpenClaw: From Clawdbot to 250K Stars](https://tenten.co/openclaw/en/blog/openclaw-history)
- [From Clawdbot to Moltbot to OpenClaw: Meet the AI agent generating buzz](https://www.cnbc.com/2026/02/02/openclaw-open-source-ai-agent-rise-controversy-clawdbot-moltbot-moltbook.html)
- [OpenClaw unveils ClawHub Marketplace; draws more than 331,000 stars](https://startupnews.fyi/2026/03/24/openclaw-unveils-clawhub-marketplace-draws-more-than-331000-stars-on-github/)

### 1.3 此前发现日志的准确性评估

| 原始声明 | 评估 |
|----------|------|
| "250,000+ GitHub stars" | 准确但已过时，现已超 331,000 |
| "ClawHub 日安装量 15,000+" | 无法独立验证 |
| "13,729 个 Skill 已发布" | 与多个来源一致（截至 2026年2月28日） |
| "卖家报告单个 Skill 月收入 $100-$1,000" | 与 Superframeworks 等来源一致 |
| "2026年1月才改名 OpenClaw" | 确认，1月30日更名 |
| "30 分钟可完成一个 Skill" | 技术上合理——Skill 核心就是一个 SKILL.md 文件 |

**总体评估：发现日志中关于 OpenClaw 的核心数据基本准确，部分数据已过时（star 数更高了），个别数据（日安装量）无法独立验证。**

---

## 第二部分：OpenClaw Skills 生态深度分析

### 2.1 什么是 OpenClaw Skill？

OpenClaw Skill 本质上极其简单：

- **核心文件**：一个文件夹，包含 `SKILL.md`（YAML frontmatter + Markdown 指令）
- **无需编译**：没有 SDK、没有特殊运行时
- **YAML 字段**：name, version, triggers（触发词）, tools（工具列表）
- **安装路径**：`~/.openclaw/workspace/skills/<name>/SKILL.md`
- **发布方式**：`clawhub publish`，需 GitHub 账号（注册满一周）

**来源：**
- [Skills - OpenClaw 官方文档](https://docs.openclaw.ai/tools/skills)
- [Building Custom OpenClaw Skills | DataCamp](https://www.datacamp.com/tutorial/building-open-claw-skills)
- [What are OpenClaw Skills? | DigitalOcean](https://www.digitalocean.com/resources/articles/what-are-openclaw-skills)

### 2.2 ClawHub 技能分类体系

ClawHub 官方将 Skills 分为 **11 个类别**：

| 类别 | 英文 | 代表性 Skill |
|------|------|-------------|
| AI/机器学习 | AI/ML | Capability Evolver (35K downloads) |
| 工具/实用 | Utility | Web Browsing (180,000+ installs) |
| 开发 | Development | GitHub Integration |
| 生产力 | Productivity | GOG/Google Workspace (14K downloads) |
| 网络 | Web | Felo Search |
| 科学 | Science | — |
| 媒体 | Media | Eleven Labs Agent (TTS) |
| 社交 | Social | Telegram (145,000+ installs) |
| 金融 | Finance | — |
| 地理位置 | Location | — |
| 商业 | Business | n8n Workflow |

**来源：**
- [Best ClawHub Skills: A Complete Guide | DataCamp](https://www.datacamp.com/blog/best-clawhub-skills)
- [Best OpenClaw Skills 2026 | Felo](https://felo.ai/blog/best-openclaw-skills-2026/)

### 2.3 当前最热门 Skills Top 10

| 排名 | 名称 | 安装量 | 功能 |
|------|------|--------|------|
| 1 | Web Browsing | 180,000+ | 网页浏览、内容提取、链接跟踪 |
| 2 | Telegram | 145,000+ | 手机端消息接口，随时与 Agent 对话 |
| 3 | Database Query | 95,000+ | 自然语言查询 PostgreSQL/MySQL/SQLite |
| 4 | Capability Evolver | 35,000+ | Agent 运行时自动进化能力 |
| 5 | GOG (Google Workspace) | 14,000+ | Gmail/Calendar/Drive/Contacts/Sheets/Docs 统一 CLI |
| 6 | n8n Workflow | N/A | 自然语言操控 n8n 自动化工作流 |
| 7 | GitHub Integration | N/A | 自然语言管理 Repo/Issue/PR |
| 8 | Felo Search | N/A | AI 合成搜索答案 + 来源引用 |
| 9 | Eleven Labs Agent | N/A | 文字转语音 |
| 10 | Home Assistant | N/A | 智能家居设备自然语言控制 |

**来源：**
- [Best OpenClaw Skills 2026 | Felo](https://felo.ai/blog/best-openclaw-skills-2026/)
- [7 Essential OpenClaw Skills | KDnuggets](https://www.kdnuggets.com/7-essential-openclaw-skills-you-need-right-now)
- [Top 10 Popular OpenClaw Skills | Growexx](https://www.growexx.com/blog/top-10-popular-openclaw-skills/)

### 2.4 垂直行业 Skills 现状

#### 已有垂直 Skills
- **医疗**：OpenClaw Medical Skills 项目已收录 869 个 AI agent skills，覆盖临床、基因组学、药物发现、生物信息学、医疗器械等。
  - 来源：[FreedomIntelligence/OpenClaw-Medical-Skills](https://github.com/FreedomIntelligence/OpenClaw-Medical-Skills)

#### 仍然稀缺的垂直领域
- **法律**：搜索未发现专门的法律文书 Skill 库（信息缺口）
- **电商运营**：搜索未发现专门的电商运营 Skill 套件（信息缺口）
- **房地产**：Superframeworks 提到房地产分析作为高价 niche skill（$99-$499），但未找到成熟产品
- **内容创作**：有零散 skills，但缺少系统性的行业工作流套件

**这与原始发现日志的判断一致：通用 Skill 多，垂直行业深度 Skill 仍稀缺，存在创业机会。**

### 2.5 变现模式与收入数据

#### ClawHub 定价模式

| 模式 | 价格范围 | 说明 |
|------|----------|------|
| 免费 Skill | $0 | 多数 skills 免费，靠安装量和口碑 |
| 付费 Skill | $10-$200 | ClawHub 支持付费 skill 销售 |
| Skill 套件 | $20-$100/包 | 多个 skills 打包销售 |
| 垂直行业 Skill | $99-$499 | 高价值 niche skills（房地产、法律、医疗） |
| API Credits 模式 | 变动 | Skill 免费，但每次调用消耗 credits |

#### 开发者收入数据

| 指标 | 数据 | 来源 |
|------|------|------|
| 单个 Skill 月收入 | $100-$1,000 | [Superframeworks](https://superframeworks.com/articles/openclaw-business-ideas-indie-hackers) |
| Top 卖家单 Skill 月收入 | $1,000+ | [Superframeworks](https://superframeworks.com/articles/openclaw-make-money-guide) |
| 3-5 个 Skill 组合月收入 | $500-$3,000 | [Superframeworks](https://superframeworks.com/articles/openclaw-business-ideas-indie-hackers) |
| 生态整体月收入（129 家 startup） | $283,000/月（2026年1月数据） | [OpenClaw Statistics](https://fatjoe.com/blog/openclaw-ai-stats/) |
| OpenClaw 安装服务首月收入案例 | $3,600 | [Superframeworks](https://superframeworks.com/articles/openclaw-business-ideas-indie-hackers) |

**注意：收入数据主要来自 Superframeworks 等非官方来源，可能存在选择性偏差（报告高收入者更活跃）。ClawHub 官方未公布卖家收入统计。**

### 2.6 用户规模与市场数据

| 指标 | 数据 | 来源 |
|------|------|------|
| GitHub Stars | 331,000+（截至 2026年3月24日） | [StartupNews](https://startupnews.fyi/2026/03/24/openclaw-unveils-clawhub-marketplace-draws-more-than-331000-stars-on-github/) |
| GitHub Forks | 47,700+（截至 2026年3月2日） | [Wikipedia](https://en.wikipedia.org/wiki/OpenClaw) |
| 峰值用户 | 200万+ | [FatJoe OpenClaw Stats](https://fatjoe.com/blog/openclaw-ai-stats/) |
| ClawHub Skills 总数 | 13,729（截至 2026年2月28日） | 多个来源交叉验证 |
| ClawHub 总下载量 | 150万+ | [claw-hub.net](https://claw-hub.net/) |
| MCP 封装 Skills 占比 | 65%+ | [OpenClaw Launch](https://openclawlaunch.com/guides/best-mcp-servers) |

---

## 第三部分：安全风险 - 重大警告

### 3.1 ClawHavoc 供应链攻击事件

**这是投入 OpenClaw 生态之前必须了解的重大安全事件。**

| 时间 | 事件 |
|------|------|
| 2026年1月27日 | 首个恶意 Skill 上传到 ClawHub |
| 2026年1月31日 | 恶意 Skills 激增 |
| 2026年2月 | Antiy CERT 发现至少 1,184 个恶意 Skills |
| 2026年2月 | Koi Security 扫描发现 341 个在窃取用户数据 |
| 2026年2月7日 | ClawHub 移除 2,419 个可疑 Skills，与 VirusTotal 合作上线自动扫描 |

#### 攻击方式
- 阶段性下载（staged downloads），拉取额外恶意软件
- Python 系统调用建立反向 Shell
- 直接窃取数据
- macOS 上利用 AMOS（Atomic macOS Stealer）窃取浏览器凭证、Keychain、Telegram 数据、SSH 密钥、加密钱包

#### 关键漏洞
- ClawHub 权限模型过于宽松（GitHub 账号满一周即可发布）
- CVE-2026-25253：远程代码执行漏洞
- Snyk 审计：13.4% 的 ClawHub skills 存在严重安全问题

**来源：**
- [ClawHavoc Poisons OpenClaw's ClawHub | CyberPress](https://cyberpress.org/clawhavoc-poisons-openclaws-clawhub-with-1184-malicious-skills/)
- [Researchers Find 341 Malicious ClawHub Skills | The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
- [Hundreds of Malicious Skills Found | eSecurity Planet](https://www.esecurityplanet.com/threats/hundreds-of-malicious-skills-found-in-openclaws-clawhub/)
- [The OpenClaw Security Crisis | Conscia](https://conscia.com/blog/the-openclaw-security-crisis/)

### 3.2 安全建议

如果要在 OpenClaw 生态中构建和销售 Skills：
1. **仅安装高 star、高下载量、来自可信作者的 Skills**
2. **发布前进行安全审查**，不在 Skill 中暴露 API 密钥
3. **关注 ClawHub 安全更新**，VirusTotal 集成后安全性有所提升
4. **不在 args 中传递 secrets**——会在 ps 输出中可见
5. **为自己的 Skill 建立安全信誉**可以成为差异化优势

---

## 第四部分：与其他 AI Skills/Plugin 生态的对比

### 4.1 OpenClaw vs Claude Code Skills

| 维度 | OpenClaw/ClawHub | Claude Code Skills |
|------|------------------|-------------------|
| Skills 数量 | 13,729+ | 生态较小，数量远不及 |
| 安装方式 | `clawhub install` CLI | 放置在 `.claude/commands/` 目录 |
| 市场化程度 | 有公开市场（ClawHub）| 无官方市场，社区驱动 |
| MCP 集成 | 65%+ skills 封装 MCP servers | 原生 MCP 支持 |
| 安全性 | ClawHavoc 事件后加强，但仍有风险 | 无公开市场=更低的供应链攻击面 |
| 消息平台 | 10+ 平台（WhatsApp/iMessage/Slack 等）| Telegram + Discord（Channels 功能） |

**来源：**
- [Claude Code Channels vs OpenClaw | DEV](https://dev.to/ji_ai/claude-code-channels-vs-openclaw-the-tradeoffs-nobodys-talking-about-2h5h)
- [Anthropic ships OpenClaw killer | VentureBeat](https://venturebeat.com/orchestration/anthropic-just-shipped-an-openclaw-killer-called-claude-code-channels)

### 4.2 MCP Servers 生态

- MCP 已成为跨平台标准协议，50+ 企业合作伙伴
- OpenClaw 的 65% skills 实际上是 MCP server 的封装
- MCP 生态与 OpenClaw 生态高度重叠而非竞争关系

---

## 第五部分：创业机会评估（更新版）

### 5.1 机会依然成立

基于深度验证后的判断，原始发现日志中的核心结论仍然成立：

**高机会领域：**
1. **垂直行业 Skill 套件** — 法律、电商领域确实稀缺，医疗已有人布局
2. **安全审计 Skill** — ClawHavoc 事件后，安全需求是真实且紧迫的
3. **成本管理工具** — 用户月 API 支出 $10-$700+ 的数据来源可信

### 5.2 需要修正的判断

| 原始判断 | 修正 |
|----------|------|
| "单个 Skill 月收入 $100-$1,000" | 数据来源有限（主要是 Superframeworks），可能有幸存者偏差 |
| "3-5 个 Skill 组合可达 $600-$5,000/月" | 偏乐观，多数来源暗示"当前大部分 skill 是免费的" |
| "先发优势窗口 6-12 个月" | 可能更短——生态增长速度极快，安全事件可能减缓 |
| "差异化空间 7/10" | 应降至 6/10——13,729 个 skills 竞争已经激烈 |

### 5.3 新增风险因素

1. **安全信任危机**：ClawHavoc 事件可能让用户对第三方 Skills 更谨慎
2. **官方竞争**：Anthropic 推出 Claude Code Channels 直接对标 OpenClaw 的消息平台功能
3. **创始人离开**：Peter Steinberger 加入 OpenAI 后，项目方向可能变化
4. **收入数据不透明**：ClawHub 尚未公布官方的卖家收入统计

---

## 第六部分：信息缺口

以下信息在搜索中无法获得或无法验证：

| 缺口 | 说明 |
|------|------|
| ClawHub 日安装量 | 原始日志声称 15,000+/天，未找到独立来源验证 |
| ClawHub 付费 Skill 占比 | 多个来源暗示"当前大部分 skill 是免费的"，付费生态成熟度存疑 |
| 具体卖家收入分布 | 只有头部数据（$1,000+/月），缺少中位数和长尾数据 |
| ClawHub 抽成比例 | 未找到官方 ClawHub 对卖家的分成政策 |
| 法律/电商 Skill 具体产品 | 搜索未发现成熟的法律或电商 Skill 产品 |
| OpenClaw 日活用户数 | 仅有"峰值200万+"的数据，缺少当前 DAU |
| 中文开发者在 ClawHub 的参与度 | 未找到相关数据 |

---

## 第七部分：结论与行动建议

### 核心结论

1. **OpenClaw 是真实的、快速增长的开源项目**——331,000+ stars，200万+ 用户，13,729+ skills
2. **ClawHub 是真实的 Skill 市场**——但付费生态尚不成熟，大部分 skills 仍免费
3. **变现机会存在但需谨慎**——头部卖家有收入，但数据可能有幸存者偏差
4. **安全风险是真实的重大问题**——ClawHavoc 事件、13.4% skills 有安全问题
5. **垂直行业 Skill 确实稀缺**——医疗已有人布局，法律和电商仍是空白

### 建议优先行动

1. **如果要进入**：先做 2-3 个免费的高质量垂直 Skill，建立安全信誉和安装量
2. **安全优先**：将"安全可信"作为核心卖点，ClawHavoc 后用户对此敏感
3. **关注 Claude Code Channels 发展**：Anthropic 正在进入这个领域，可能改变格局
4. **收入预期要保守**：月收入 $100-$500 更现实，$1,000+ 是少数头部卖家
5. **同时布局 MCP**：65% ClawHub skills 封装 MCP servers，MCP 技能可跨平台复用

---

## 来源汇总

### 核心来源（多次引用）
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [OpenClaw Wikipedia](https://en.wikipedia.org/wiki/OpenClaw)
- [ClawHub 官方](https://clawhub.ai/)
- [awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills)

### 数据来源
- [OpenClaw AI Stats 2026 | FatJoe](https://fatjoe.com/blog/openclaw-ai-stats/)
- [OpenClaw Statistics 2026 | Gradually.ai](https://www.gradually.ai/en/openclaw-statistics/)
- [OpenClaw 250K Stars Milestone | Star History](https://www.star-history.com/blog/openclaw-surpasses-react-most-starred-software)
- [OpenClaw 331K Stars | StartupNews](https://startupnews.fyi/2026/03/24/openclaw-unveils-clawhub-marketplace-draws-more-than-331000-stars-on-github/)

### 变现与商业
- [How to Make Money with OpenClaw | Superframeworks](https://superframeworks.com/articles/openclaw-make-money-guide)
- [5 Profitable Business Ideas | Superframeworks](https://superframeworks.com/articles/openclaw-business-ideas-indie-hackers)
- [Who Actually Makes Money From OpenClaw | AgentPuter](https://www.agentputer.com/blog/who-makes-money-from-openclaw/)

### 安全
- [ClawHavoc | CyberPress](https://cyberpress.org/clawhavoc-poisons-openclaws-clawhub-with-1184-malicious-skills/)
- [341 Malicious Skills | The Hacker News](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
- [OpenClaw Security Crisis | Conscia](https://conscia.com/blog/the-openclaw-security-crisis/)

### 开发指南
- [OpenClaw Skills 官方文档](https://docs.openclaw.ai/tools/skills)
- [Building Custom Skills | DataCamp](https://www.datacamp.com/tutorial/building-open-claw-skills)
- [Skill Publishing Guide | ClawSkills](https://clawskills.io/docs/skill-publishing-guide)

### 生态对比
- [Claude Code Channels vs OpenClaw | DEV](https://dev.to/ji_ai/claude-code-channels-vs-openclaw-the-tradeoffs-nobodys-talking-about-2h5h)
- [Anthropic ships Claude Code Channels | VentureBeat](https://venturebeat.com/orchestration/anthropic-just-shipped-an-openclaw-killer-called-claude-code-channels)
- [Nvidia on OpenClaw | NextPlatform](https://www.nextplatform.com/ai/2026/03/17/nvidia-says-openclaw-is-to-agentic-ai-what-gpt-was-to-chattybots/5209428)
