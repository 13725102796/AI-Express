# 自进化产品闭环系统（Autonomous Product Loop）

> 让 AI Agent 自主发现机会 → 构建产品 → 上线赚钱 → 用数据反馈自我进化 → 迭代或孵化新产品

## 系统全景

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS PRODUCT LOOP                   │
│                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│   │ 1.DISCOVER│───▶│ 2. BUILD │───▶│3. DEPLOY │              │
│   │  发现机会  │    │  构建产品 │    │ 上线变现  │              │
│   └──────────┘    └──────────┘    └──────────┘              │
│        ▲                                │                    │
│        │                                ▼                    │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│   │ 6.EVOLVE │◀───│5.ANALYZE │◀───│4.MEASURE │              │
│   │  进化决策 │    │  分析归因 │    │  数据采集 │              │
│   └──────────┘    └──────────┘    └──────────┘              │
│        │                                                     │
│        ▼                                                     │
│   ┌──────────┐                                              │
│   │ PORTFOLIO│  产品组合管理（所有产品的生命周期追踪）         │
│   └──────────┘                                              │
│                                                              │
│   ────── 自动执行    ══════ 需要人类审批（💰/法律/上架）      │
└─────────────────────────────────────────────────────────────┘
```

## 核心理念

### 能自动化的

| 环节 | 自动化程度 | 说明 |
|------|-----------|------|
| 趋势发现 | 🟢 全自动 | 定时爬取 ProductHunt/HN/GitHub Trending |
| 机会评估 | 🟢 全自动 | 多维度打分模型 |
| PRD 生成 | 🟢 全自动 | 灵感 Agent 已有能力 |
| 代码生成 | 🟡 半自动 | 现有 agent pipeline 可完成，但需质量卡口 |
| 部署上线 | 🟡 半自动 | CI/CD 可自动，但首次域名/账号需人工 |
| 埋点采集 | 🟢 全自动 | 标准化埋点 SDK |
| 数据分析 | 🟢 全自动 | 指标计算 + 归因分析 |
| 迭代决策 | 🟡 半自动 | Agent 提出方案，关键决策人类审批 |
| 支付接入 | 🔴 需人工 | 支付账号注册、合规审核 |
| 应用上架 | 🔴 需人工 | App Store/Google Play 需人工提交 |

### 人类卡口（不可跳过）

1. **💰 花钱决策**：任何涉及付费 API、域名购买、服务器升级
2. **📋 合规决策**：隐私政策、用户协议、支付接入
3. **🚀 首次上线**：第一个产品的部署流程需人工走通一次
4. **🔄 Kill/Pivot 决策**：砍掉一个产品或重大方向调整

---

## 六大引擎详细设计

### Engine 1：Discovery（发现引擎）

**触发方式**：定时任务（建议每天 1 次）+ 手动触发

**数据源自动扫描**：

```yaml
scan_sources:
  - source: ProductHunt
    frequency: daily
    strategy: "获取当日 Top 20 产品，提取品类/技术栈/增长数据"

  - source: Hacker News
    frequency: daily
    strategy: "Show HN 帖子，按得分排序 Top 10"

  - source: GitHub Trending
    frequency: daily
    strategy: "按语言分类的 Trending Repos，关注 star 增速"

  - source: IndieHackers
    frequency: weekly
    strategy: "收入里程碑帖子，提取商业模式"

  - source: Twitter/X
    frequency: daily
    strategy: "AI/indie hacker 圈关键词监控"
    keywords: ["built in a weekend", "launched today", "first $1000 MRR",
               "side project", "open source alternative"]
```

**机会评分模型**：

```
opportunity_score = (
    market_signal    * 0.25 +  # 市场信号强度（搜索量、讨论热度）
    feasibility      * 0.25 +  # 我们能做吗？（技术栈匹配度、复杂度）
    monetization     * 0.20 +  # 能赚钱吗？（付费意愿信号、竞品定价）
    differentiation  * 0.15 +  # 有差异化空间吗？
    timing           * 0.15    # 时机对吗？（太早/太晚/刚好）
)
```

**输出**：`discovery-log/{date}.md` — 每日发现日志

```markdown
# 发现日志 2026-03-25

## 今日高分机会（score >= 7.0）

### 机会 #1：[名称]
- **评分**：8.2/10
- **信号来源**：ProductHunt #3 + HN 讨论 200+ comments
- **市场缺口**：[描述]
- **轻量可行性**：⭐⭐⭐⭐
- **变现路径**：Freemium，Pro 版 $9/月
- **建议动作**：→ 进入 BUILD 阶段

### 机会 #2：...

## 今日中分机会（5.0 <= score < 7.0）
[持续观察列表]

## 趋势信号（跨多天出现的模式）
- [趋势 A]：连续 3 天在 HN/PH 出现类似产品...
```

---

### Engine 2：Build（构建引擎）

**触发条件**：Discovery 评分 >= 7.0 的机会 + 人类审批通过

**自动化 Pipeline**：

```
机会确认
  │
  ▼
灵感 Agent → PRD.md
  │
  ▼
Research Agent → 竞品分析（可选，高分机会直接跳过）
  │
  ▼
Product Agent → PRD 审核 & 完善
  │
  ▼
Design Agent → demo.html（设计稿）
  │
  ▼
Tech Architect Agent → 技术方案
  │
  ▼
[人类审批点：确认要投入开发]
  │
  ▼
Frontend/Backend Dev Agent → 代码实现
  │
  ▼
Test Agent → 自动测试
  │
  ▼
Code Review Agent → 代码审查
  │
  ▼
→ 产出：可部署的完整项目
```

**关键约束**：
- 每个产品从机会确认到可部署，目标 **48 小时内**
- 技术栈倾向标准化（减少维护成本）：Next.js/Nuxt + Supabase/SQLite + Vercel/Cloudflare
- 每个产品必须内置标准化埋点（为 Engine 4 做准备）

---

### Engine 3：Deploy（部署与变现引擎）

**自动化部分**：

```yaml
deploy_pipeline:
  # 代码部署（全自动）
  - step: git_push
    action: "推送到 GitHub repo"

  - step: auto_deploy
    action: "Vercel/Cloudflare 自动部署"
    trigger: "push to main"

  # 标准化变现组件（模板化，半自动）
  - step: monetization_setup
    components:
      - landing_page: "标准模板，自动填充产品信息"
      - pricing_page: "基于 PRD 定价策略生成"
      - payment_integration: "Stripe/LemonSqueezy（首次需人工配置）"
      - analytics: "自动接入 Plausible/Umami（自托管，免费）"

  # SEO & 分发（半自动）
  - step: distribution
    actions:
      - "生成 SEO meta tags"
      - "生成 ProductHunt launch 文案（人工提交）"
      - "生成 Twitter/X 发布文案（人工发布）"
      - "生成 HN Show HN 帖子（人工发布）"
```

**人工卡口**：
- 首次支付账号配置
- 产品发布到各平台
- 域名购买决策

---

### Engine 4：Measure（度量引擎）

**标准化埋点体系**（所有产品共用）：

```typescript
// 每个产品内置的标准事件
interface StandardEvents {
  // 获客
  page_view: { path: string; referrer: string; utm_source?: string }

  // 激活
  signup: { method: 'email' | 'google' | 'github' }
  onboarding_complete: { duration_seconds: number }

  // 留存
  session_start: { returning: boolean; days_since_last: number }
  feature_used: { feature_name: string; duration_ms: number }

  // 营收
  checkout_started: { plan: string; price: number }
  payment_success: { plan: string; price: number; currency: string }
  payment_failed: { reason: string }

  // 流失信号
  error_encountered: { error_type: string; page: string }
  rage_click: { element: string; count: number }
  bounce: { page: string; time_on_page_ms: number }
}
```

**数据采集方案**：

```yaml
analytics_stack:
  # 行为数据（自托管，零成本）
  - tool: Umami / Plausible（自托管）
    data: page_view, session, referrer, geo

  # 产品事件（自建）
  - tool: 轻量事件收集 API
    data: 自定义事件（上述 StandardEvents）
    storage: SQLite / Supabase

  # 营收数据
  - tool: Stripe Dashboard API / LemonSqueezy API
    data: MRR, churn, LTV

  # 错误监控
  - tool: Sentry（免费额度）
    data: 前端错误、API 错误
```

**数据汇总**：每日自动生成 `metrics/{product_name}/{date}.json`

```json
{
  "date": "2026-03-25",
  "product": "product-name",
  "acquisition": {
    "visitors": 342,
    "signups": 12,
    "conversion_rate": 0.035,
    "top_referrers": ["producthunt.com", "twitter.com", "google.com"]
  },
  "activation": {
    "onboarding_completion_rate": 0.67,
    "time_to_value_median_seconds": 180
  },
  "retention": {
    "dau": 45,
    "wau": 120,
    "d1_retention": 0.42,
    "d7_retention": 0.18
  },
  "revenue": {
    "mrr": 127.00,
    "new_subscribers": 3,
    "churned": 1,
    "arpu": 9.07
  },
  "health_signals": {
    "error_rate": 0.002,
    "p95_latency_ms": 340,
    "rage_clicks": 5,
    "top_errors": ["TypeError: Cannot read property 'x' of undefined"]
  }
}
```

---

### Engine 5：Analyze（分析引擎）

**触发方式**：每周自动运行 + 关键指标异常时触发

**分析框架**：

```markdown
## 周度分析报告模板

### 1. 指标健康度看板（红黄绿灯）

| 指标 | 本周值 | 上周值 | 变化 | 状态 |
|------|--------|--------|------|------|
| 日访客 | 342 | 280 | +22% | 🟢 |
| 注册转化率 | 3.5% | 4.1% | -14% | 🟡 |
| D7 留存 | 18% | 22% | -18% | 🔴 |
| MRR | $127 | $98 | +30% | 🟢 |
| 错误率 | 0.2% | 0.1% | +100% | 🟡 |

### 2. 漏斗分析
访问 → 注册 → 激活 → 留存 → 付费
[每一步的转化率和流失原因]

### 3. 归因分析
- 增长驱动因素：[什么带来了增长]
- 下降归因：[什么导致了下降]
- 用户行为模式：[高价值用户 vs 流失用户的行为差异]

### 4. 假设验证
| 假设 | 验证方法 | 结果 | 结论 |
|------|---------|------|------|
| "用户需要 X 功能" | 看 feature_used 事件 | 仅 5% 使用 | ❌ 假设不成立 |
| "简化注册能提升转化" | A/B 测试 | +15% 注册 | ✅ 假设成立 |

### 5. 行动建议（按优先级排序）
- P0：[紧急修复/优化]
- P1：[本周应该做的]
- P2：[可以排入下周的]
```

---

### Engine 6：Evolve（进化引擎）

**这是闭环的核心——把数据转化为行动。**

**决策树**：

```
收到分析报告
    │
    ├── 产品健康（绿灯为主）
    │   ├── 增长中 → 加大投入（新功能 / 新渠道）
    │   ├── 平稳期 → 优化转化漏斗 / 探索新方向
    │   └── 天花板 → 考虑衍生产品
    │
    ├── 产品亚健康（黄灯为主）
    │   ├── 留存差 → 深挖流失原因 → 产品迭代
    │   ├── 获客差 → 调整分发策略 / SEO 优化
    │   └── 转化差 → 优化 onboarding / 定价调整
    │
    └── 产品危险（红灯为主）
        ├── 连续 2 周红灯 → 小范围 pivot
        ├── 连续 4 周红灯 → [人类决策] kill or pivot
        └── 单次红灯 → 紧急修复（bug/性能）
```

**进化动作类型**：

```yaml
evolution_actions:
  # 微迭代（全自动）
  - type: bugfix
    trigger: "error_rate > 1% 或 rage_click > 10/day"
    action: "分析错误日志 → 自动修复 → 测试 → 部署"

  - type: copy_optimization
    trigger: "landing_page bounce_rate > 70%"
    action: "分析用户行为 → 重写文案 → A/B 测试"

  - type: ux_optimization
    trigger: "onboarding_completion < 50%"
    action: "分析流失步骤 → 简化流程 → 部署"

  # 功能迭代（半自动，需人类审批）
  - type: feature_add
    trigger: "用户反馈频次 > 5 次/周 相同需求"
    action: "生成 mini PRD → [人类审批] → 开发 → 部署"

  - type: pricing_adjustment
    trigger: "付费转化率 < 2% 且 activation > 60%"
    action: "提出定价调整方案 → [人类审批] → 实施"

  # 战略决策（人类主导）
  - type: pivot
    trigger: "连续 4 周核心指标下降"
    action: "生成 pivot 方案报告 → [人类决策]"

  - type: kill
    trigger: "MRR < $10 且 DAU < 5 持续 30 天"
    action: "生成复盘报告 → [人类决策] → 经验沉淀到知识库"

  - type: spawn_new
    trigger: "产品 portfolio 有空余产能 或 发现高分机会"
    action: "→ 回到 Engine 1，开始新一轮循环"
```

**进化记录**（知识沉淀）：

每次进化动作完成后，自动记录到 `evolution-log.md`：

```markdown
## [日期] [产品名] — [动作类型]

### 触发原因
[什么指标异常触发了这次进化]

### 采取的行动
[具体做了什么]

### 结果
[行动后指标变化]

### 学到的经验
[这次经验可以应用到其他产品吗？]
```

---

## Product Portfolio（产品组合管理）

所有产品的生命周期追踪，保存在 `portfolio.md`：

```markdown
# 产品组合看板

## 活跃产品

| 产品 | 状态 | 上线日期 | DAU | MRR | 健康度 | 下一步 |
|------|------|---------|-----|-----|--------|--------|
| ProductA | 增长期 | 2026-03-01 | 120 | $450 | 🟢 | 加新功能 |
| ProductB | 验证期 | 2026-03-20 | 15 | $0 | 🟡 | 优化留存 |

## 已关闭产品

| 产品 | 存活时间 | 峰值 MRR | 关闭原因 | 关键教训 |
|------|---------|---------|---------|---------|
| ProductX | 45 天 | $23 | 市场太小 | 验证阶段应先测市场规模 |

## 待孵化机会

| 机会 | 发现日期 | 评分 | 状态 |
|------|---------|------|------|
| 机会 #42 | 2026-03-25 | 8.2 | 等待产能空出 |
```

---

## 自进化知识库

Agent 通过不断的实践积累「产品直觉」，存储为可检索的经验：

```yaml
knowledge_base:
  # 什么有效
  winning_patterns:
    - pattern: "开发者工具 + Freemium + 开源核心"
      evidence: "ProductA 用此模式 3 个月达到 $1K MRR"
      confidence: high

    - pattern: "解决明确痛点 > 追逐趋势"
      evidence: "ProductB 追 AI 热点但没有明确用户痛点，失败"
      confidence: high

  # 什么无效
  failure_patterns:
    - pattern: "面向所有人的通用工具"
      evidence: "ProductX 试图做通用方案，用户不知道它能干什么"
      lesson: "越垂直越好，从最小的利基切入"

    - pattern: "功能多但没有核心亮点"
      evidence: "ProductY 上线时有 20 个功能但没有一个做到极致"
      lesson: "MVP 只做 1-2 个核心功能，做到 10x better"

  # 渠道经验
  distribution_learnings:
    - channel: "ProductHunt"
      effectiveness: "首日流量爆发但留存差"
      best_practice: "需配合 onboarding 优化同步上线"

    - channel: "SEO"
      effectiveness: "慢但稳定"
      best_practice: "长尾关键词 + 解决方案型内容"
```

---

## 实施路线图

### Phase 0：基础设施搭建（第 1 周）

- [ ] 建立 `灵感agent/` 目录结构
- [ ] 配置定时发现任务（先用 Claude Code 的 schedule 功能）
- [ ] 搭建标准化埋点 SDK 模板
- [ ] 创建数据采集 + 汇总脚本
- [ ] 初始化 `portfolio.md` 和 `evolution-log.md`

### Phase 1：第一个产品闭环（第 2-3 周）

- [ ] 运行 Discovery 引擎，找到第一个机会
- [ ] 走完 Build → Deploy 全流程
- [ ] 接入 Measure 引擎，开始采集数据
- [ ] 手动跑一次 Analyze + Evolve，验证流程

### Phase 2：自动化升级（第 4-6 周）

- [ ] Discovery 引擎全自动化（定时扫描 + 评分）
- [ ] Analyze 引擎自动化（周度报告自动生成）
- [ ] Evolve 引擎半自动化（bugfix/copy 全自动，功能迭代半自动）
- [ ] 第二个产品进入 pipeline

### Phase 3：规模化 & 知识沉淀（第 7-12 周）

- [ ] 3-5 个产品同时运行
- [ ] 知识库有 10+ 条验证过的经验
- [ ] Agent 的机会评分模型基于历史数据校准
- [ ] 建立产品间的经验迁移机制

---

## 目录结构

```
灵感agent/
├── inspiration-agent.md          # 灵感 Agent 主 prompt
├── autonomous-product-loop.md    # 本文档：系统设计
├── discovery-log/                # 每日发现日志
│   └── {date}.md
├── portfolio.md                  # 产品组合看板
├── evolution-log.md              # 进化记录
├── knowledge-base/               # 自进化知识库
│   ├── winning-patterns.md
│   ├── failure-patterns.md
│   └── distribution-learnings.md
├── metrics/                      # 数据采集
│   └── {product_name}/
│       └── {date}.json
├── templates/                    # 标准化模板
│   ├── analytics-sdk/            # 埋点 SDK 模板
│   ├── landing-page/             # 落地页模板
│   └── deploy-config/            # 部署配置模板
└── products/                     # 各产品的产出物
    └── {product_name}/
        ├── inspiration-report.md
        ├── PRD.md
        └── ...
```
