# 卡密中台（CardKey Hub）设计色彩报告

> 调研时间：2026-04-20
> 目标用户画像：
> - **主用户：管理员**（中小运营者，30-50 岁，有一定互联网经验，注重效率与可信度）
> - **次用户：业务方开发者**（阅读 API 文档、调试签名，需要干净清晰的技术感）
> 产品调性关键词：**克制 · 专业 · 高效 · 开发者友好 · 可信赖**
> 参考基调：Linear / Vercel / Stripe Dashboard（B 端工具型后台）

---

## 1. 行业色彩语言

### 1.1 行业色彩惯例

卡密/凭证/支付基础设施类 B 端后台的色彩惯例：

| 色调 | 心理映射 | 代表产品 |
|------|---------|---------|
| **深蓝 / 靛蓝** | 信赖、专业、金融级安全感 | Stripe（Downriver #0A2540）、PayPal |
| **Indigo / 紫蓝** | 开发者工具、技术感、现代 | Linear（#5E6AD2）、Vercel Pro Plan |
| **纯黑白** | 极简主义、设计自信、无干扰 | Vercel（#000/#FFF + Geist）、Raycast |
| **深灰 + 单点高饱和强调色** | 克制、专注、工程师审美 | Linear（Woodsmoke + Indigo）、GitHub |
| **绿色** | 成功、金钱、增长 | Robinhood、部分财税 SaaS——不适合卡密这种"凭证"语境 |

**我们的选择逻辑**：
- 避免：绿色（金钱联想易误解为"可提现"）、橙红色（促销感，不符合基础设施定位）、渐变花哨（不符合克制调性）
- 推荐：**深灰中性底 + 单一高辨识度品牌色（Indigo/Violet 系）**——对标 Linear 的成功路径

### 1.2 头部产品用色统计

| 产品 | 主色 | 辅色/背景 | 强调色 | 整体风格 |
|------|------|----------|--------|---------|
| **Linear** | `#5E6AD2` Indigo | `#08090A` Woodsmoke / `#F4F5F8` Black Haze | 品牌 Indigo 自身 | 极简 + 键盘优先 + 克制 [来源：mobbin] |
| **Stripe Dashboard** | `#635BFF` Cornflower Blue | `#0A2540` Downriver / `#F6F9FC` Black Squeeze | 同主色 | 金融级专业感 [来源：mobbin] |
| **Vercel Dashboard** | `#000000` Black | `#FFFFFF` White | 仅语义色（红/绿/黄） | 极致极简 + Geist 字体 [来源：vercel.com/geist] |
| **Supabase** | `#3ECF8E` Green（底层偏黑） | `#1C1C1C` 深黑 | 绿色高亮 | 开发者友好 |
| **PlanetScale** | `#000000` + `#A47EFE` Purple | 深黑 | 紫色 | 极简 + 紫色强调 |

共识：**所有优秀 B 端开发者工具后台都采用"深色/浅色双主题 + 单一高辨识度品牌色 + 严格限制装饰色"的策略**。

### 1.3 色彩心理学参考

- **目标管理员用户**（30-50 岁运营者）：偏好**可信赖、专业、清爽**，反感花哨和娱乐化配色
- **目标业务方开发者**：偏好**暗色优先、对比度高、代码块清晰**
- **文化禁忌**：避免大面积红色（警告色预留）、避免绿色（金钱易误解）、避免金色（促销感）
- **无障碍考量**：主文本在背景上对比度 ≥ 4.5:1（WCAG AA），大字/UI ≥ 3:1

---

## 2. 推荐配色方案（3 套）

### 方案 A：Indigo Keystone（Linear 路径）🌟 **首推**

- **调性关键词**：专业 / 克制 / 可信赖 / 开发者友好
- **适合场景**：B 端工具型后台，强调基础设施的专业感
- **核心理念**：深色为主战场，单一高辨识度 Indigo 做强调色，语义色严格限制

**色彩体系（浅色模式）**：

| 用途 | HEX | OKLCH（近似） | 说明 |
|------|-----|---------------|------|
| 主色（品牌/主 CTA） | `#5E6AD2` | `oklch(0.58 0.17 270)` | Indigo Keystone（借鉴 Linear） |
| 主色悬停 | `#4F59C7` | `oklch(0.53 0.17 270)` | 主色加深 10% |
| 背景（页面） | `#FAFAFB` | `oklch(0.98 0.003 270)` | 极浅中性灰，非纯白 |
| 背景（卡片） | `#FFFFFF` | `oklch(1 0 0)` | 纯白 |
| 侧栏背景 | `#F4F5F8` | `oklch(0.96 0.006 270)` | Black Haze（Linear 用） |
| 边框 | `#E4E5E9` | `oklch(0.91 0.005 270)` | 克制、非高对比 |
| 文字主 | `#0F1012` | `oklch(0.18 0.008 270)` | 深灰（非纯黑，减少刺眼） |
| 文字次 | `#6B6E76` | `oklch(0.52 0.008 270)` | 中灰 |
| 文字弱 | `#9CA0A8` | `oklch(0.68 0.006 270)` | 弱灰 |
| 成功 | `#16A34A` | `oklch(0.63 0.18 145)` | 语义色（核销成功） |
| 警告 | `#D97706` | `oklch(0.65 0.17 60)` | 语义色（即将过期） |
| 错误 | `#DC2626` | `oklch(0.58 0.22 25)` | 语义色（签名失败/作废） |
| 信息 | `#0891B2` | `oklch(0.62 0.12 220)` | 语义色（提示） |

**色彩体系（深色模式，主打）**：

| 用途 | HEX | OKLCH（近似） | 说明 |
|------|-----|---------------|------|
| 主色 | `#7C8BFF` | `oklch(0.68 0.16 270)` | 深色下提亮版 Indigo |
| 背景（页面） | `#08090A` | `oklch(0.14 0.004 270)` | Woodsmoke（Linear） |
| 背景（卡片） | `#121316` | `oklch(0.18 0.005 270)` | 略浅一档 |
| 侧栏背景 | `#0D0E10` | `oklch(0.15 0.004 270)` | 介于页面和卡片之间 |
| 边框 | `#24262B` | `oklch(0.26 0.006 270)` | 低对比边框 |
| 文字主 | `#F4F5F8` | `oklch(0.96 0.006 270)` | 偏冷白（非纯白） |
| 文字次 | `#9CA0A8` | `oklch(0.68 0.006 270)` | 中灰 |
| 文字弱 | `#6B6E76` | `oklch(0.52 0.008 270)` | 弱灰 |
| 成功 | `#22C55E` | `oklch(0.71 0.18 145)` | |
| 警告 | `#F59E0B` | `oklch(0.74 0.18 60)` | |
| 错误 | `#EF4444` | `oklch(0.65 0.23 25)` | |
| 信息 | `#06B6D4` | `oklch(0.72 0.14 220)` | |

**对比度检查**（WCAG AA 需 ≥ 4.5:1 for normal text）：
- 浅色：`#0F1012` on `#FFFFFF` → 约 19:1 ✅
- 浅色：`#5E6AD2` on `#FFFFFF` → 约 5.1:1 ✅（normal text 达标）
- 深色：`#F4F5F8` on `#08090A` → 约 17:1 ✅
- 深色：`#7C8BFF` on `#08090A` → 约 7.3:1 ✅

**参考来源**：
- [Linear 品牌色系](https://mobbin.com/colors/brand/linear)
- [Linear Brand Guidelines](https://linear.app/brand)

**使用建议（60-30-10 法则）**：
- **60%**：页面/侧栏中性灰背景
- **30%**：卡片白/深背景 + 文字
- **10%**：Indigo 主色仅用于 CTA 按钮、品牌 logo、激活态导航、关键数据高亮

---

### 方案 B：Developer Black（Vercel 极简路径）

- **调性关键词**：极致极简 / 设计自信 / 技术感 / 高留白
- **适合场景**：完全聚焦开发者的产品
- **核心理念**：纯黑纯白 + 仅语义色，无装饰色

**色彩体系（深色模式，主打）**：

| 用途 | HEX | OKLCH | 说明 |
|------|-----|-------|------|
| 主色（CTA） | `#FFFFFF` 按钮背景 + `#000000` 文字 | — | Vercel 反色逻辑 |
| 背景（页面） | `#000000` | `oklch(0 0 0)` | 纯黑 |
| 背景（卡片） | `#0A0A0A` | `oklch(0.07 0 0)` | 极深灰 |
| 边框 | `#262626` | `oklch(0.27 0 0)` | 深灰边框 |
| 文字主 | `#FAFAFA` | `oklch(0.99 0 0)` | 偏白 |
| 文字次 | `#A1A1AA` | `oklch(0.7 0 0)` | 中灰 |
| 文字弱 | `#52525B` | `oklch(0.44 0 0)` | 暗灰 |
| 成功 | `#00DC82` | `oklch(0.78 0.2 155)` | 鲜绿色（仅状态） |
| 警告 | `#F5A623` | `oklch(0.75 0.17 70)` | |
| 错误 | `#FF0000` | `oklch(0.63 0.25 25)` | 高对比纯红 |

**优势**：设计风险低，不会过时
**劣势**：对于需要展示"品牌个性"的 SaaS 可能过于冷峻；缺乏记忆点

**参考来源**：
- [Vercel Geist 颜色系统](https://vercel.com/geist/colors)
- [SeedFlip Vercel Design System Breakdown](https://seedflip.co/blog/vercel-design-system)

---

### 方案 C：Stripe Finance（金融级可信）

- **调性关键词**：金融级 / 庄重 / 企业感 / 稳重
- **适合场景**：面向 To B 大客户，强调合规与稳重
- **核心理念**：Downriver 深蓝底 + Cornflower Blue 强调色

**色彩体系（浅色模式主打）**：

| 用途 | HEX | OKLCH | 说明 |
|------|-----|-------|------|
| 主色（CTA） | `#635BFF` | `oklch(0.56 0.22 275)` | Cornflower Blue（Stripe 品牌） |
| 导航/强调深色 | `#0A2540` | `oklch(0.22 0.06 255)` | Downriver 深海军蓝 |
| 背景（页面） | `#F6F9FC` | `oklch(0.97 0.01 240)` | Black Squeeze 冷白 |
| 背景（卡片） | `#FFFFFF` | `oklch(1 0 0)` | 纯白 |
| 边框 | `#E3E8EE` | `oklch(0.92 0.01 240)` | |
| 文字主 | `#0A2540` | `oklch(0.22 0.06 255)` | 深海军蓝做文字 |
| 文字次 | `#425466` | `oklch(0.42 0.04 240)` | |
| 文字弱 | `#8898AA` | `oklch(0.65 0.04 240)` | |
| 成功 | `#00D924` | 强鲜绿 | |
| 警告 | `#F7B500` | | |
| 错误 | `#CD3D64` | 玫红 | |

**参考来源**：
- [Mobbin Stripe Brand Palette](https://mobbin.com/colors/brand/stripe)
- [Stripe 无障碍色彩系统博客](https://stripe.com/blog/accessible-color-systems)

**劣势**：调性偏"金融感"，对于售卖兑换码的"小运营者场景"略重

---

## 3. 字体趋势

### 3.1 推荐字体方案（与方案 A 配套）

| 用途 | 字体 | 备选 | 说明 |
|------|------|------|------|
| UI 标题/正文（英文） | **Inter** | Geist, SF Pro | 开源、Google Fonts 免费、B 端最通用 |
| UI 标题/正文（中文） | **PingFang SC / 苹方** | HarmonyOS Sans, 思源黑体 Noto Sans SC | Apple/鸿蒙系统自带优先，fallback Google Fonts Noto Sans SC |
| 数字/金额 | Inter（tabular-nums 特性） | JetBrains Mono | 等宽数字防止对齐跳动 |
| 代码/API 密钥展示 | **JetBrains Mono** | Fira Code, Cascadia Mono | 配对得分 Inter + JetBrains Mono = 88/100 [来源：fontalternatives.com] |

### 3.2 字号层级（type scale）

推荐 1.125 比例（Minor Second）—— B 端紧凑型节奏：

| 层级 | 桌面 | 移动 | 行高 | 字重 |
|------|------|------|------|------|
| Display（极少用） | 48px | 36px | 1.1 | 600 |
| H1（页面标题） | 30px | 24px | 1.2 | 600 |
| H2（section 标题） | 24px | 20px | 1.3 | 600 |
| H3（子 section） | 18px | 16px | 1.4 | 600 |
| Body Large | 16px | 16px | 1.5 | 400 |
| Body | 14px | 14px | 1.5 | 400 |
| Small/Caption | 13px | 13px | 1.4 | 400 |
| Micro（标签） | 12px | 12px | 1.3 | 500 |
| Code | 13px | 13px | 1.5 | 400（mono） |

### 3.3 字重使用

- 400 Regular：正文
- 500 Medium：标签、强调小文本
- 600 SemiBold：标题
- 不使用 700+ Bold（会显得侵略性）
- 不使用 300 Light 及以下（在小屏上可读性差）

---

## 4. 视觉风格趋势

### 4.1 当前 B 端后台主流趋势（2026）

根据 [Art of Styleframe 2026](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/) 和 [SaaSFrame 2026 Trends](https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns)：

| 要素 | 当前主流 | 我们的选择 |
|------|---------|-----------|
| 视觉风格 | 扁平化 + 轻微深度（阴影/边框二选一） | **扁平 + 边框优先**（Linear 风格） |
| 布局模式 | 固定侧栏 + 主内容区（Linear/Vercel/Notion 共识） | **固定侧栏（桌面）+ 顶部导航（移动）** |
| 暗色/亮色 | **深色为默认，82% 用户偏好** | **深色默认，支持浅色切换** |
| 动效风格 | 微交互为主、无大型滚动动画 | **克制**：fade+translate 微交互，≤ 200ms |
| 圆角趋势 | 6-8px 中等圆角（软而不萌） | **radius: 6px / 8px / 12px 三档** |
| 玻璃态（Glassmorphism） | 仅用于 overlay/modal | **不滥用**，仅顶部导航或模态可 backdrop-blur |
| AI 驱动的智能检索 | 2026 兴起 | **MVP 不做**，P2 规划 |

### 4.2 间距系统

使用 **4px grid**（最严格的 B 端规范）：

| Token | 值 | 使用场景 |
|-------|---|---------|
| space-0 | 0 | — |
| space-1 | 4px | 极小间隙（图标 + 文字） |
| space-2 | 8px | 紧凑组件内部 |
| space-3 | 12px | 按钮内 padding |
| space-4 | 16px | 常规组件内部 |
| space-5 | 20px | 组件间小间隔 |
| space-6 | 24px | 组件间标准间隔 |
| space-8 | 32px | section 内间隔 |
| space-10 | 40px | section 间小间隔 |
| space-12 | 48px | section 间标准间隔 |
| space-16 | 64px | 页面顶部 padding |

### 4.3 动效基调（Impeccable 风格）

- **缓动函数**：`cubic-bezier(0.16, 1, 0.3, 1)`（exponential ease-out，Linear 风格）
- **时长**：
  - micro（hover/focus）：120ms
  - small（打开/关闭菜单）：200ms
  - medium（模态/抽屉）：280ms
  - **不超过 400ms**（B 端忌冗长）
- **入场动画**：`opacity 0→1` + `translateY(4px)→0`（极克制）
- **避免**：spring bounce、scale > 1.05、rotate、parallax
- **Stagger（连续出现）**：列表项延迟 20-40ms 即可

---

## 5. 风格参考案例（文字情绪板）

### 5.1 Linear App 🌟 **首推参考**

- **整体感受**：克制 / 专业 / 键盘优先 / 工程师审美的典范
- **配色特点**：深灰 Woodsmoke 底 + 单一 Indigo 强调色，整个产品几乎不出现其他装饰色
- **排版特点**：Inter 字体、紧凑行高（1.4-1.5）、层级靠字重区分不靠字号暴涨
- **组件风格**：按钮圆角 6px、阴影几乎为 0、边框 1px 低对比、hover 仅背景色微变
- **动效特点**：exponential ease-out、≤ 200ms、fade+translate 不用 scale
- **值得借鉴**：**整体哲学就是我们要的**——克制、单一品牌色、深色优先、B 端工具产品的最佳实践
- **需要规避**：Linear 过于键盘党化（大量 keyboard shortcut），我们的管理员用户不一定熟悉——鼠标路径也要流畅

### 5.2 Vercel Dashboard

- **整体感受**：极简 / 设计自信 / 留白大胆
- **配色特点**：纯黑 + 纯白 + Geist 字体足够，几乎无装饰色
- **排版特点**：Geist 字体、大量留白、大标题小正文的对比
- **组件风格**：边框极细（0.5px 视觉效果）、按钮方正、无多余装饰
- **动效特点**：几乎无动效
- **值得借鉴**：**"无装饰色，仅语义色"的策略**，数据型页面参考其空间节奏
- **需要规避**：过于冷峻可能让"小红书运营者"类用户觉得没亲和力——我们保留品牌 Indigo

### 5.3 Stripe Dashboard

- **整体感受**：金融级 / 庄重 / 可信
- **配色特点**：Downriver 深蓝 + Cornflower Blue，浅色主打
- **排版特点**：标题层级分明，数字用 tabular 对齐
- **组件风格**：卡片圆角 8px、轻微阴影、表格清晰
- **动效特点**：克制的 fade 和 slide
- **值得借鉴**：**KPI 卡片布局**（四宫格 + 数字 + 趋势 + sparkline）、表格筛选器的交互、API 文档即产品的理念
- **需要规避**：整体调性偏金融，我们是服务凭证，不需要那么"重"

### 5.4 Supabase Dashboard

- **整体感受**：开发者友好 / 深色优先 / 开源气质
- **配色特点**：深黑 + 绿色高亮（Supabase 的 Supabase Green）
- **组件风格**：较 Linear 略活泼，绿色使用面积更大
- **值得借鉴**：API 密钥 / 连接串的展示方式（带复制按钮、reveal/hide 切换）
- **需要规避**：绿色在卡密场景有"现金"联想，我们不采用

### 5.5 PlanetScale

- **整体感受**：黑底 + 紫色高亮、cinematic feel
- **配色特点**：纯黑 + Purple (#A47EFE)
- **值得借鉴**：深色系顶部导航的处理、代码块样式

---

## 6. 设计红线（必须规避）

| 红线 | 原因 |
|------|------|
| ❌ 使用绿色做主色/品牌色 | 用户可能误解为"可提现金钱"，违反合规调性 |
| ❌ 使用金色/橙色渲染卡密 | 促销感过强，不符合"基础设施"定位 |
| ❌ 使用渐变做大面积背景 | 不符合 B 端克制原则，显得业余 |
| ❌ 使用 Lorem ipsum 假数据 | 所有演示必须用业务语义的真实感内容（如"紫微灵犀年度会员卡 × 500 张"） |
| ❌ 出现 emoji 做装饰 | 降低专业感（可用于状态图标如 ✅，但不作为品牌元素） |
| ❌ 按钮阴影过重（> 2px blur） | 过时的 Material Design 时期风格 |
| ❌ 硬编码色值而非 CSS 变量 | 不可维护、无法切换主题 |
| ❌ 使用 cursive / handwriting 字体 | 不符合 B 端调性 |
| ❌ 动效 > 400ms | B 端忌冗长 |
| ❌ 使用 spring bounce / scale 动画 | 不符合克制调性，Linear/Vercel/Stripe 均不用 |
| ❌ 数据可视化用彩虹色系 | 颜色过多无法聚焦 |
| ❌ 侧栏宽度超过 280px | 挤占主内容区 |
| ❌ 在 B 端后台使用插画/3D | 不符合工具产品定位 |

---

## 7. 推荐最终方向

**首推：方案 A（Indigo Keystone）+ Linear 风格参考 + 深色优先 + Inter/JetBrains Mono 字体**

**理由**：
1. Linear 是 B 端工具产品的标杆，路径被验证
2. 单一 Indigo 品牌色既保留辨识度，又不过分张扬——符合"基础设施"定位
3. 深色优先匹配开发者 audience，浅色切换照顾管理员 audience
4. 4px grid + exponential easing + OKLCH 色彩空间 = 与 Impeccable 默认美学高度一致
5. 字体全部免费商用（Inter / Noto Sans SC / JetBrains Mono 均 OFL/Apache 2.0）

**需要 design-agent 在 demo.html 中展示的必要元素**：
- ✅ 完整色彩系统（深色 + 浅色双主题切换）
- ✅ 字体系统（Inter + 中文 + JetBrains Mono 代码块）
- ✅ 按钮组件（primary / secondary / ghost / danger，default/hover/active/disabled/focus 五态）
- ✅ 卡片组件（KPI 卡、列表卡、表单卡）
- ✅ 表格组件（sticky header、筛选器、空状态）
- ✅ 状态徽章（未使用 / 已使用 / 已作废 / 已过期 / 已冻结）
- ✅ 输入框、下拉、Toast、Modal 基础组件
- ✅ API 密钥展示（reveal/hide + 复制）
- ✅ 代码块（展示 HMAC 签名示例）
- ✅ 动效展示（按钮 hover / fade-in / stagger）

---

## 附录：参考资料

- [Linear 品牌色系（Mobbin）](https://mobbin.com/colors/brand/linear)
- [Linear Brand Guidelines](https://linear.app/brand)
- [Linear 设计重构文章](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Stripe 品牌色系（Mobbin）](https://mobbin.com/colors/brand/stripe)
- [Stripe 无障碍色彩博客](https://stripe.com/blog/accessible-color-systems)
- [Vercel Geist 颜色系统](https://vercel.com/geist/colors)
- [Vercel Geist 字体](https://vercel.com/font)
- [SeedFlip Vercel Design System Breakdown](https://seedflip.co/blog/vercel-design-system)
- [SaaSFrame 2026 Dashboard Design Trends](https://www.saasframe.io/blog/the-anatomy-of-high-performance-saas-dashboard-design-2026-trends-patterns)
- [Art of Styleframe Dashboard Patterns 2026](https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/)
- [AdminLTE 2026 SaaS Templates](https://adminlte.io/blog/saas-admin-dashboard-templates/)
- [Inter + JetBrains Mono Pairing](https://fontalternatives.com/pairings/inter-and-jetbrains-mono/)

---

<task-completion>
<task-id>phase0-step1-research-agent-001</task-id>
<status>completed</status>
<summary>产研 + 设计色彩双报告生成完毕，基于 20+ 信息源（A 级 6+，B 级 8+，C 级 5+），覆盖合规红线、竞品 SWOT、KANO 分类、3 套配色方案、完整字体 + 动效 + 组件清单</summary>

<deliverables>
- research-market.md: done — 4 大章节 + 附录，覆盖 TAM/SAM/SOM、5 个竞品 SWOT、KANO 四象限、MVP 8 项建议、风险提示、商业模式
- research-design.md: done — 7 大章节，3 套配色方案含完整 HEX+OKLCH 色值、字体方案、5 个风格参考案例、13 条设计红线
</deliverables>

<self-check-results>
- [x] 调研报告包含 ≥ 3 个竞品分析，每个竞品有功能对比：PASS（5 个竞品：kamiFaka / xxgkami / Verify / ZFaka + Stripe 等对照组）
- [x] 每个关键结论附有数据来源（URL 或出处）：PASS（信息缺口已明确标注）
- [x] 产研报告和设计报告分别独立输出：PASS
- [x] 配色方案推荐基于行业数据而非个人偏好，附推荐理由：PASS（方案 A 推荐理由挂钩 Linear 验证路径 + 合规红线）
</self-check-results>

<key-decisions>
- 首推方案 A（Indigo Keystone），理由：Linear 是 B 端工具标杆、单一品牌色既有辨识度又克制、与 Impeccable 美学一致
- 定位"服务兑换凭证"而非"预付消费卡"，单张 ≤ 1000 元 + 有效期 ≤ 3 年 + 不做充送/分销，避开预付卡监管重点
- 不采用绿色做主色（金钱联想）、不采用橙/金色（促销感）
- 字体方案全部免费商用：Inter + Noto Sans SC + JetBrains Mono
- 深色优先（82% 用户偏好 + 开发者审美）+ 浅色双主题
</key-decisions>

<escalations>
无
</escalations>

<downstream-context>
给 product-agent 的预编译上下文：
- 产品定位已锁死：Stripe-for-Cardkey 基础设施，非一体化发卡网
- MVP 必做 8 项功能：管理员登录、应用管理（app_key/app_secret）、批量生成+CSV、HMAC 核销 API、批次管理、核销查询、数据大盘、哈希入库+pepper
- MVP 不做：支付、分销、充送、C 端用户
- 合规定位：服务兑换凭证（单张 ≤ 1000 元，有效期 ≤ 3 年，免责声明显眼）
- 运营视角必须覆盖：批次管理（作废/召回）、核销日志筛选、异常核销监测（同 IP 高频 / 同 user 多失败）、审计日志 90 天

给 design-agent 的预编译上下文：
- 首推方案 A（Indigo Keystone）：主色 #5E6AD2（浅色）/ #7C8BFF（深色）、深色底 #08090A / 浅色底 #FAFAFB
- 参考 Linear 风格：单一品牌色 + 扁平+边框优先 + 6/8/12px 三档圆角
- 字体：Inter + Noto Sans SC + JetBrains Mono
- 间距：4px grid，1-16 步阶
- 动效：cubic-bezier(0.16, 1, 0.3, 1) + ≤ 400ms + 无 spring/bounce
- 深色优先 + 浅色可切换
- 禁用：绿色主色、金/橙主色、Lorem ipsum、emoji 装饰、spring 动画
</downstream-context>
</task-completion>
