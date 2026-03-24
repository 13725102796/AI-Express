# 分红股排行榜 - 页面规格文档

> 版本：v1.2（Round 2 审查修订）
> 基于：PRD.md v1.0
> 页面数量：2
> 优先级范围：P0 + P1

---

## 全局设计系统

### 设计 Token 引用

所有页面复用 demo.html 中定义的 CSS 变量体系：

| Token 类别 | 关键变量 | 用途 |
|-----------|---------|------|
| 主色 | `--color-primary: #1A73E8` | Tab 激活态、链接、主按钮 |
| 辅色 | `--color-secondary: #5F6368` | 次要文字、辅助信息 |
| 强调色 | `--color-accent: #F59E0B` | 排名前三高亮、评分强调 |
| 成功色 | `--color-success: #34A853` | 通用成功状态 |
| 错误色 | `--color-error: #EA4335` | 错误提示、失败状态、A股涨色（仅在需要展示涨跌时使用） |
| 背景色 | `--color-bg-primary: #F8FAFC` | 页面底色 |
| 卡片背景 | `--color-bg-secondary: #FFFFFF` | 卡片、表格背景 |
| 字体-中文 | `--font-family-zh: 'Noto Sans SC'` | 中文内容 |
| 字体-英文 | `--font-family-en: 'Inter'` | 数字、英文 |
| 字体-等宽 | `--font-family-mono` | 股票代码 |
| 圆角 | `--radius-lg: 12px` | 卡片、表格容器 |
| 阴影 | `--shadow-sm / md / lg` | 层级表达 |

### 全局可访问性要求

- 所有可交互元素必须可通过键盘访问（Tab 键切换焦点）
- 焦点状态使用 `:focus-visible` 样式（`box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.3)`）
- 文字对比度符合 WCAG AA 标准（4.5:1 以上）
- 表格使用语义化标签（`<table>`, `<thead>`, `<tbody>`, `<th scope="col">` 等）
- 表格容器添加 `aria-label` 描述当前排行榜类型
- Tab 栏使用 `role="tablist"`，每个 Tab 使用 `role="tab"` + `aria-selected`
- Tab 对应的面板使用 `role="tabpanel"` + `aria-labelledby`

### 全局共享组件

#### G01 - 页面头部（Header）

- **位置**：页面最顶部，所有页面共享
- **元素清单**：
  - Logo + 产品名称「分红股排行榜」：左对齐，点击回到首页
  - 数据概览：「共 N 只分红股」+ 「数据更新于 YYYY-MM-DD HH:mm」
  - 「更新数据」按钮：右对齐，btn-primary 样式
- **P02 简化版差异**：移除数据概览和「更新数据」按钮，仅保留 Logo + 产品名称 + 面包屑导航
- **状态**：
  - 默认态：按钮可点击，显示上次更新时间
  - 更新中：按钮显示旋转图标 + "更新中..."，disabled 状态
  - 更新成功：按钮恢复，时间戳刷新
  - 更新失败：按钮恢复，显示红色错误提示（5秒后自动消失）
  - 冷却中：按钮 disabled，显示剩余冷却时间
- **交互逻辑**：
  - 点击「更新数据」-> 按钮变为 loading -> 模拟 2s 延迟 -> 成功/失败随机 -> 更新时间戳 / 显示错误
  - 防抖：5 分钟内不可重复点击（localStorage 存储上次更新时间）
  - 更新超时：60 秒
- **响应式**：
  - 桌面端（>=1280px）：一行显示，logo 左 / 概览中 / 按钮右
  - 平板端（768px-1279px）：两行，第一行 logo + 按钮，第二行概览
  - 移动端（<768px）：垂直堆叠，概览文字缩小

#### G02 - 页面底部（Footer）

- **位置**：页面最底部，所有页面共享
- **元素清单**：
  - 评分说明区块：标题「综合评分说明」+ 算法描述文字
    - 稳定性得分（连续分红年数归一化，占 40%）
    - 股息率得分（近3年平均股息率归一化，占 35%）
    - 分红规模得分（累计分红总额归一化，占 25%）
    - 归一化方法说明
  - 数据来源区块：标题「数据来源」+ 说明文字（"数据来自 A 股公开市场数据，仅供参考"）
  - 免责声明区块：灰色小字「本站数据仅供参考，不构成投资建议。投资有风险，入市需谨慎。」
  - 版权信息：(c) 2026 分红股排行榜
- **P02 简化版差异**：仅保留免责声明 + 版权信息，不显示评分说明和数据来源
- **排版**：三个区块横向排列（桌面端），纵向堆叠（移动端）
- **样式**：背景 `--color-bg-tertiary`，文字 `--color-text-secondary`，字号 `--font-size-sm`

#### G03 - Tab 栏组件

- **位置**：排行榜区域顶部
- **元素清单**：
  - Tab 1：「综合排行」（默认激活）
  - Tab 2：「稳定分红」
  - Tab 3：「分红最多」
- **HTML 语义**：
  - 容器：`<div role="tablist" aria-label="排行榜类型切换">`
  - 每个 Tab：`<button role="tab" aria-selected="true/false" aria-controls="tabpanel-id" tabindex="0/-1">`
  - 面板：`<div role="tabpanel" aria-labelledby="tab-id">`
- **样式**：
  - 容器：`tab-bar` 样式（demo.html 中已定义）
  - 激活态：白色背景 + primary 色文字 + shadow-sm
  - 非激活态：透明背景 + secondary 色文字
- **交互逻辑（鼠标）**：
  - 点击 Tab -> 300ms 防抖 -> 即时切换数据源 + 100ms fadeIn -> 视觉切换体感 < 200ms（符合 PRD 3.1 要求）
  - Tab 切换时表格重置到第 1 页
  - 切换过程中禁止重复点击
- **交互逻辑（键盘）**：
  - 左/右箭头键：在 Tab 间移动焦点
  - Enter/Space：激活当前焦点的 Tab
  - Home 键：跳到第一个 Tab
  - End 键：跳到最后一个 Tab
- **URL Hash 同步**：切换 Tab 时更新 URL hash（#comprehensive / #stable / #highest），支持直接通过 URL 访问对应 Tab

#### G04 - 数据表格组件

- **位置**：排行榜区域主体
- **HTML 语义**：
  - 表格容器添加 `aria-label="[当前排行榜类型]排行数据"`
  - 表头使用 `<th scope="col">`
  - 排名列使用 `aria-label="排名第N名"`
- **通用表格特性**：
  - 表头固定（sticky），表体可滚动
  - 数值列右对齐（font-variant-numeric: tabular-nums），文字列左对齐
  - 行 hover 高亮（`--color-bg-hover`）
  - 排名 1-3 名特殊样式（金/银/铜色背景的排名徽章）
  - 空数据显示「--」
  - 浮点数统一保留 2 位小数
  - 股票代码使用等宽字体
  - 每页 50 条数据
  - 排行榜排序固定，由数据源和当前 Tab 类型决定。当前版本不支持用户点击列头切换排序方向
- **分页器**：
  - 位于表格底部
  - 元素：「上一页」按钮 + 页码列表（最多显示 5 个页码 + 省略号）+ 「下一页」按钮 + 总条数「共 N 条」
  - 首页时「上一页」disabled，末页时「下一页」disabled
  - 键盘支持：Tab 键切换到分页器，Enter/Space 点击按钮
- **响应式**：
  - 桌面端：完整列显示
  - 移动端：表格容器横向可滚动（overflow-x: auto），关键列（排名、名称、核心数值）优先显示

#### G05 - 行操作（跳转详情）

- **触发**：点击表格中的股票名称（文字链接样式，primary 色 + 下划线）
- **行为**：在新标签页打开该股票的详情页（P02-detail.html?code=XXXXXX）
- **视觉**：股票名称 hover 时显示下划线 + 颜色变深
- **键盘**：股票名称链接可通过 Tab 聚焦，Enter 激活

---

## P01 - 首页 / 排行榜主页

### 页面概述

| 属性 | 值 |
|------|---|
| 页面编号 | P01 |
| 页面名称 | 首页 / 排行榜主页 |
| 文件名 | P01-home.html |
| 优先级 | P0 |
| 对应 PRD 功能 | 3.1 Tab 切换、3.2 稳定分红排行、3.3 分红最多排行、3.4 综合排行、3.5 手动数据更新、3.6 数据表格、3.7 页面顶部信息区、3.8 页面底部信息区 |
| 入口 | 直接访问 / 详情页返回 |
| 出口 | 点击股票名称 -> P02 详情页 |

### 页面结构

```
P01-home.html
+-- [G01] 页面头部
|   +-- Logo + 产品标题「分红股排行榜」
|   +-- 数据概览（分红股总数 + 更新时间）
|   +-- 「更新数据」按钮
+-- 主内容区
|   +-- 统计概览卡片区（3 个统计卡片）
|   |   +-- 卡片 1：分红股总数
|   |   +-- 卡片 2：平均股息率
|   |   +-- 卡片 3：最长连续分红
|   +-- [G03] Tab 栏
|   |   +-- 综合排行（默认）
|   |   +-- 稳定分红
|   |   +-- 分红最多
|   +-- 表格工具栏
|   |   +-- 搜索框（股票代码/名称模糊搜索）
|   |   +-- 结果计数「当前显示 N 条」
|   +-- [G04] 数据表格（按当前 Tab 切换列配置）
|   +-- [G04] 分页器
+-- [G02] 页面底部
```

### 元素清单

#### 统计概览卡片区

| 元素 | 类型 | 描述 | 样式 |
|------|------|------|------|
| 分红股总数卡片 | card | 显示数字 + 标签「A股分红股数量」 | card 组件，icon 为柱状图 SVG，数字用 accent 色 |
| 平均股息率卡片 | card | 显示百分比 + 标签「全市场平均股息率」 | card 组件，icon 为趋势线 SVG，数字用 primary 色 |
| 最长连续分红卡片 | card | 显示年数 + 标签「最长连续分红年数」+ 对应股票名称 | card 组件，icon 为奖杯 SVG，数字用 accent 色 |

#### 搜索框

| 元素 | 类型 | 描述 |
|------|------|------|
| 搜索输入框 | input | placeholder: "搜索股票代码或名称..."，左侧放大镜图标，`aria-label="搜索股票"` |
| 结果计数 | text | 「当前显示 N 条」，搜索过滤后实时更新 |

**搜索交互**：
- 输入内容后 300ms 防抖触发过滤
- 支持模糊匹配股票代码（6位数字）和股票名称（中文）
- 过滤结果重置分页到第 1 页
- 清空搜索框恢复全部数据
- Esc 键清空搜索框

#### 综合排行 Tab 表格列定义

| 列名 | 字段 | 对齐 | 宽度 | 说明 |
|------|------|------|------|------|
| 排名 | rank | 居中 | 60px | 1-3 名使用金银铜徽章 |
| 股票代码 | code | 左对齐 | 100px | 等宽字体，如 600519 |
| 股票名称 | name | 左对齐 | 120px | 可点击跳转详情页，primary 色链接 |
| 所属行业 | industry | 左对齐 | 100px | badge 样式 |
| 综合评分 | score | 左对齐 | 140px | 数字 + 评分条（score-bar），0-100 分 |
| 连续分红年数 | consecutiveYears | 右对齐 | 100px | 整数 + "年" |
| 最近年度股息率 | dividendYield | 右对齐 | 120px | 保留 2 位小数 + "%" |
| 近3年平均股息率 | avgYield3Y | 右对齐 | 130px | 保留 2 位小数 + "%" |

#### 稳定分红 Tab 表格列定义

| 列名 | 字段 | 对齐 | 宽度 | 说明 |
|------|------|------|------|------|
| 排名 | rank | 居中 | 60px | 1-3 名使用金银铜徽章 |
| 股票代码 | code | 左对齐 | 100px | 等宽字体 |
| 股票名称 | name | 左对齐 | 120px | 可点击链接 |
| 所属行业 | industry | 左对齐 | 100px | badge 样式 |
| 连续分红年数 | consecutiveYears | 右对齐 | 120px | 主排序字段，整数 + "年" |
| 最近年度股息率 | dividendYield | 右对齐 | 120px | 次排序字段，保留 2 位小数 + "%" |
| 最近年度每股分红 | dps | 右对齐 | 130px | 保留 2 位小数 + "元" |

#### 分红最多 Tab 表格列定义

| 列名 | 字段 | 对齐 | 宽度 | 说明 |
|------|------|------|------|------|
| 排名 | rank | 居中 | 60px | 1-3 名使用金银铜徽章 |
| 股票代码 | code | 左对齐 | 100px | 等宽字体 |
| 股票名称 | name | 左对齐 | 120px | 可点击链接 |
| 所属行业 | industry | 左对齐 | 100px | badge 样式 |
| 最近年度股息率 | dividendYield | 右对齐 | 120px | 主排序字段，保留 2 位小数 + "%" |
| 近3年平均股息率 | avgYield3Y | 右对齐 | 130px | 保留 2 位小数 + "%" |
| 最近年度每股分红 | dps | 右对齐 | 130px | 保留 2 位小数 + "元" |
| 累计分红总额 | totalDividend | 右对齐 | 130px | 单位：亿元，保留 2 位小数 |

### 页面状态

#### S1 - 首次访问（空状态）

- **触发条件**：localStorage 无数据且无缓存
- **表现**：
  - 统计卡片显示「--」
  - 表格区域显示空状态插画 + 文字「暂无数据，请点击"更新数据"获取最新排行」
  - 「更新数据」按钮有脉冲动画引导用户点击
  - 底部正常显示

#### S2 - 数据加载中（骨架屏）

- **触发条件**：点击「更新数据」按钮后
- **表现**：
  - 统计卡片显示骨架屏 shimmer 效果
  - 表格区域显示 8 行骨架屏行（与 demo.html 中的 skeleton 样式一致）
  - Tab 栏可见但不可点击
  - 「更新数据」按钮显示旋转图标 + "更新中..."

#### S3 - 正常数据展示

- **触发条件**：数据加载完成
- **表现**：
  - 统计卡片显示真实数据（带 fadeInUp 入场动画）
  - 表格显示当前 Tab 对应的排行数据（每行依次 fadeIn）
  - 分页器正常显示
  - 所有交互可用

#### S4 - 数据更新失败

- **触发条件**：更新接口返回错误或超时
- **表现**：
  - 表格保留之前的数据（如有）
  - 「更新数据」按钮上方出现红色提示条「数据更新失败，请稍后重试」
  - 提示条 5 秒后 fadeOut 自动消失
  - 按钮恢复可点击状态

#### S5 - 搜索无结果

- **触发条件**：搜索输入后无匹配数据
- **表现**：
  - 表格区域显示「未找到匹配的股票，请尝试其他关键词」
  - 分页器隐藏
  - 搜索框保持输入内容

#### S6 - 更新冷却中

- **触发条件**：5 分钟内已更新过
- **表现**：
  - 「更新数据」按钮 disabled 状态
  - 按钮文字显示「N分N秒后可更新」倒计时
  - 其余内容正常

### 假数据

#### 统计卡片数据

```json
{
  "totalStocks": 856,
  "avgDividendYield": 3.28,
  "maxConsecutiveYears": 27,
  "maxConsecutiveStock": "贵州茅台"
}
```

#### 综合排行榜数据（前 8 条）

```json
[
  {"rank": 1, "code": "600519", "name": "贵州茅台", "industry": "白酒", "score": 95.2, "consecutiveYears": 27, "dividendYield": 3.85, "avgYield3Y": 3.52},
  {"rank": 2, "code": "601318", "name": "中国平安", "industry": "保险", "score": 91.8, "consecutiveYears": 18, "dividendYield": 5.42, "avgYield3Y": 4.88},
  {"rank": 3, "code": "000858", "name": "五粮液", "industry": "白酒", "score": 89.6, "consecutiveYears": 25, "dividendYield": 3.62, "avgYield3Y": 3.21},
  {"rank": 4, "code": "601398", "name": "工商银行", "industry": "银行", "score": 88.3, "consecutiveYears": 20, "dividendYield": 6.15, "avgYield3Y": 5.78},
  {"rank": 5, "code": "600036", "name": "招商银行", "industry": "银行", "score": 87.1, "consecutiveYears": 19, "dividendYield": 5.68, "avgYield3Y": 5.23},
  {"rank": 6, "code": "601088", "name": "中国神华", "industry": "煤炭", "score": 85.7, "consecutiveYears": 17, "dividendYield": 7.82, "avgYield3Y": 6.95},
  {"rank": 7, "code": "000333", "name": "美的集团", "industry": "家电", "score": 84.2, "consecutiveYears": 16, "dividendYield": 4.35, "avgYield3Y": 3.98},
  {"rank": 8, "code": "600900", "name": "长江电力", "industry": "电力", "score": 83.5, "consecutiveYears": 22, "dividendYield": 3.92, "avgYield3Y": 3.65}
]
```

#### 稳定分红排行榜数据（前 8 条）

```json
[
  {"rank": 1, "code": "600519", "name": "贵州茅台", "industry": "白酒", "consecutiveYears": 27, "dividendYield": 3.85, "dps": 25.98},
  {"rank": 2, "code": "000858", "name": "五粮液", "industry": "白酒", "consecutiveYears": 25, "dividendYield": 3.62, "dps": 4.56},
  {"rank": 3, "code": "000651", "name": "格力电器", "industry": "家电", "consecutiveYears": 24, "dividendYield": 4.18, "dps": 2.00},
  {"rank": 4, "code": "600900", "name": "长江电力", "industry": "电力", "consecutiveYears": 22, "dividendYield": 3.92, "dps": 0.85},
  {"rank": 5, "code": "601398", "name": "工商银行", "industry": "银行", "consecutiveYears": 20, "dividendYield": 6.15, "dps": 0.30},
  {"rank": 6, "code": "600036", "name": "招商银行", "industry": "银行", "consecutiveYears": 19, "dividendYield": 5.68, "dps": 1.85},
  {"rank": 7, "code": "601318", "name": "中国平安", "industry": "保险", "consecutiveYears": 18, "dividendYield": 5.42, "dps": 2.42},
  {"rank": 8, "code": "601088", "name": "中国神华", "industry": "煤炭", "consecutiveYears": 17, "dividendYield": 7.82, "dps": 2.56}
]
```

#### 分红最多排行榜数据（前 8 条）

```json
[
  {"rank": 1, "code": "601088", "name": "中国神华", "industry": "煤炭", "dividendYield": 7.82, "avgYield3Y": 6.95, "dps": 2.56, "totalDividend": 3215.68},
  {"rank": 2, "code": "601398", "name": "工商银行", "industry": "银行", "dividendYield": 6.15, "avgYield3Y": 5.78, "dps": 0.30, "totalDividend": 12856.32},
  {"rank": 3, "code": "600036", "name": "招商银行", "industry": "银行", "dividendYield": 5.68, "avgYield3Y": 5.23, "dps": 1.85, "totalDividend": 2986.45},
  {"rank": 4, "code": "601318", "name": "中国平安", "industry": "保险", "dividendYield": 5.42, "avgYield3Y": 4.88, "dps": 2.42, "totalDividend": 4528.16},
  {"rank": 5, "code": "000333", "name": "美的集团", "industry": "家电", "dividendYield": 4.35, "avgYield3Y": 3.98, "dps": 3.00, "totalDividend": 856.72},
  {"rank": 6, "code": "000651", "name": "格力电器", "industry": "家电", "dividendYield": 4.18, "avgYield3Y": 3.75, "dps": 2.00, "totalDividend": 1025.38},
  {"rank": 7, "code": "600900", "name": "长江电力", "industry": "电力", "dividendYield": 3.92, "avgYield3Y": 3.65, "dps": 0.85, "totalDividend": 1568.92},
  {"rank": 8, "code": "600519", "name": "贵州茅台", "industry": "白酒", "dividendYield": 3.85, "avgYield3Y": 3.52, "dps": 25.98, "totalDividend": 2365.12}
]
```

#### 扩展假数据（第 9-50 条通用数据池）

```json
[
  {"code": "600585", "name": "海螺水泥", "industry": "建材", "score": 82.1, "consecutiveYears": 15, "dividendYield": 4.56, "avgYield3Y": 4.12, "dps": 2.68, "totalDividend": 758.23},
  {"code": "002415", "name": "海康威视", "industry": "安防", "score": 80.8, "consecutiveYears": 14, "dividendYield": 3.28, "avgYield3Y": 3.05, "dps": 0.80, "totalDividend": 425.16},
  {"code": "601166", "name": "兴业银行", "industry": "银行", "score": 79.5, "consecutiveYears": 16, "dividendYield": 5.92, "avgYield3Y": 5.35, "dps": 1.05, "totalDividend": 1856.42},
  {"code": "600016", "name": "民生银行", "industry": "银行", "score": 78.2, "consecutiveYears": 15, "dividendYield": 5.45, "avgYield3Y": 4.98, "dps": 0.25, "totalDividend": 1425.68},
  {"code": "601288", "name": "农业银行", "industry": "银行", "score": 77.8, "consecutiveYears": 14, "dividendYield": 6.82, "avgYield3Y": 6.25, "dps": 0.23, "totalDividend": 9856.32},
  {"code": "000002", "name": "万科A", "industry": "房地产", "score": 76.5, "consecutiveYears": 20, "dividendYield": 2.85, "avgYield3Y": 3.42, "dps": 0.35, "totalDividend": 1256.78},
  {"code": "601857", "name": "中国石油", "industry": "石油", "score": 75.3, "consecutiveYears": 16, "dividendYield": 5.12, "avgYield3Y": 4.68, "dps": 0.45, "totalDividend": 8965.42},
  {"code": "600887", "name": "伊利股份", "industry": "乳业", "score": 74.8, "consecutiveYears": 18, "dividendYield": 3.15, "avgYield3Y": 2.95, "dps": 0.92, "totalDividend": 568.32},
  {"code": "000568", "name": "泸州老窖", "industry": "白酒", "score": 74.2, "consecutiveYears": 17, "dividendYield": 3.42, "avgYield3Y": 3.18, "dps": 6.80, "totalDividend": 425.16},
  {"code": "601668", "name": "中国建筑", "industry": "建筑", "score": 73.5, "consecutiveYears": 13, "dividendYield": 4.85, "avgYield3Y": 4.32, "dps": 0.30, "totalDividend": 2156.89},
  {"code": "600104", "name": "上汽集团", "industry": "汽车", "score": 72.8, "consecutiveYears": 18, "dividendYield": 4.92, "avgYield3Y": 4.56, "dps": 0.85, "totalDividend": 1568.45},
  {"code": "601939", "name": "建设银行", "industry": "银行", "score": 72.1, "consecutiveYears": 15, "dividendYield": 6.52, "avgYield3Y": 5.98, "dps": 0.39, "totalDividend": 11256.32},
  {"code": "002304", "name": "洋河股份", "industry": "白酒", "score": 71.5, "consecutiveYears": 14, "dividendYield": 3.68, "avgYield3Y": 3.35, "dps": 3.00, "totalDividend": 356.78},
  {"code": "600048", "name": "保利发展", "industry": "房地产", "score": 70.8, "consecutiveYears": 16, "dividendYield": 3.92, "avgYield3Y": 3.56, "dps": 0.48, "totalDividend": 856.42},
  {"code": "601601", "name": "中国太保", "industry": "保险", "score": 70.2, "consecutiveYears": 13, "dividendYield": 4.28, "avgYield3Y": 3.85, "dps": 1.20, "totalDividend": 625.36},
  {"code": "601328", "name": "交通银行", "industry": "银行", "score": 69.5, "consecutiveYears": 14, "dividendYield": 6.35, "avgYield3Y": 5.82, "dps": 0.37, "totalDividend": 5268.45},
  {"code": "002714", "name": "牧原股份", "industry": "养殖", "score": 68.8, "consecutiveYears": 10, "dividendYield": 3.56, "avgYield3Y": 2.85, "dps": 1.50, "totalDividend": 256.32},
  {"code": "600276", "name": "恒瑞医药", "industry": "医药", "score": 68.2, "consecutiveYears": 16, "dividendYield": 1.85, "avgYield3Y": 1.62, "dps": 0.80, "totalDividend": 325.68},
  {"code": "601628", "name": "中国人寿", "industry": "保险", "score": 67.5, "consecutiveYears": 12, "dividendYield": 3.92, "avgYield3Y": 3.45, "dps": 0.65, "totalDividend": 2568.42},
  {"code": "002230", "name": "科大讯飞", "industry": "科技", "score": 66.8, "consecutiveYears": 11, "dividendYield": 1.25, "avgYield3Y": 1.08, "dps": 0.30, "totalDividend": 98.56},
  {"code": "600030", "name": "中信证券", "industry": "证券", "score": 66.2, "consecutiveYears": 15, "dividendYield": 3.25, "avgYield3Y": 2.95, "dps": 0.65, "totalDividend": 856.78},
  {"code": "601899", "name": "紫金矿业", "industry": "有色", "score": 65.5, "consecutiveYears": 13, "dividendYield": 3.85, "avgYield3Y": 3.42, "dps": 0.35, "totalDividend": 568.92},
  {"code": "600028", "name": "中国石化", "industry": "石化", "score": 64.8, "consecutiveYears": 18, "dividendYield": 5.68, "avgYield3Y": 5.12, "dps": 0.42, "totalDividend": 7856.45},
  {"code": "000001", "name": "平安银行", "industry": "银行", "score": 64.2, "consecutiveYears": 12, "dividendYield": 5.15, "avgYield3Y": 4.68, "dps": 0.58, "totalDividend": 1256.32},
  {"code": "601111", "name": "中国国航", "industry": "航空", "score": 63.5, "consecutiveYears": 9, "dividendYield": 2.45, "avgYield3Y": 1.85, "dps": 0.15, "totalDividend": 356.78},
  {"code": "600031", "name": "三一重工", "industry": "机械", "score": 62.8, "consecutiveYears": 12, "dividendYield": 3.68, "avgYield3Y": 3.25, "dps": 0.80, "totalDividend": 425.16},
  {"code": "002352", "name": "顺丰控股", "industry": "物流", "score": 62.2, "consecutiveYears": 8, "dividendYield": 2.15, "avgYield3Y": 1.92, "dps": 0.55, "totalDividend": 198.56},
  {"code": "601818", "name": "光大银行", "industry": "银行", "score": 61.5, "consecutiveYears": 13, "dividendYield": 5.85, "avgYield3Y": 5.32, "dps": 0.21, "totalDividend": 1568.92},
  {"code": "600050", "name": "中国联通", "industry": "通信", "score": 60.8, "consecutiveYears": 11, "dividendYield": 3.42, "avgYield3Y": 3.05, "dps": 0.12, "totalDividend": 856.45},
  {"code": "601888", "name": "中国中免", "industry": "旅游", "score": 60.2, "consecutiveYears": 10, "dividendYield": 2.35, "avgYield3Y": 2.12, "dps": 2.50, "totalDividend": 325.68},
  {"code": "002475", "name": "立讯精密", "industry": "电子", "score": 59.5, "consecutiveYears": 9, "dividendYield": 1.45, "avgYield3Y": 1.28, "dps": 0.35, "totalDividend": 156.32},
  {"code": "600690", "name": "海尔智家", "industry": "家电", "score": 59.0, "consecutiveYears": 15, "dividendYield": 3.28, "avgYield3Y": 2.95, "dps": 0.78, "totalDividend": 458.92},
  {"code": "601012", "name": "隆基绿能", "industry": "光伏", "score": 58.2, "consecutiveYears": 8, "dividendYield": 2.65, "avgYield3Y": 2.35, "dps": 0.65, "totalDividend": 198.56},
  {"code": "600809", "name": "山西汾酒", "industry": "白酒", "score": 57.5, "consecutiveYears": 12, "dividendYield": 2.85, "avgYield3Y": 2.56, "dps": 8.50, "totalDividend": 268.45},
  {"code": "000725", "name": "京东方A", "industry": "面板", "score": 56.8, "consecutiveYears": 7, "dividendYield": 3.92, "avgYield3Y": 3.15, "dps": 0.15, "totalDividend": 325.68},
  {"code": "002594", "name": "比亚迪", "industry": "汽车", "score": 56.2, "consecutiveYears": 10, "dividendYield": 0.85, "avgYield3Y": 0.72, "dps": 2.32, "totalDividend": 156.32},
  {"code": "601985", "name": "中国核电", "industry": "电力", "score": 55.5, "consecutiveYears": 8, "dividendYield": 3.25, "avgYield3Y": 2.98, "dps": 0.22, "totalDividend": 356.78},
  {"code": "600741", "name": "华域汽车", "industry": "汽车零部件", "score": 55.0, "consecutiveYears": 14, "dividendYield": 4.85, "avgYield3Y": 4.32, "dps": 1.10, "totalDividend": 268.45},
  {"code": "601225", "name": "陕西煤业", "industry": "煤炭", "score": 54.2, "consecutiveYears": 9, "dividendYield": 6.25, "avgYield3Y": 5.68, "dps": 1.38, "totalDividend": 568.92},
  {"code": "002027", "name": "分众传媒", "industry": "传媒", "score": 53.5, "consecutiveYears": 8, "dividendYield": 5.12, "avgYield3Y": 4.56, "dps": 0.30, "totalDividend": 256.78},
  {"code": "600188", "name": "兖矿能源", "industry": "煤炭", "score": 52.8, "consecutiveYears": 12, "dividendYield": 5.85, "avgYield3Y": 5.12, "dps": 2.18, "totalDividend": 625.45},
  {"code": "601169", "name": "北京银行", "industry": "银行", "score": 52.2, "consecutiveYears": 11, "dividendYield": 5.62, "avgYield3Y": 5.08, "dps": 0.32, "totalDividend": 856.32}
]
```

### 交互逻辑详细描述

#### I01 - Tab 切换

1. **触发**：用户点击非激活状态的 Tab 或使用键盘（左/右箭头 + Enter/Space）
2. **防抖**：300ms 内重复点击忽略（PRD 3.1 边界条件要求）
3. **过程**：
   - 当前 Tab 移除 `active` 类，`aria-selected="false"`
   - 目标 Tab 添加 `active` 类，`aria-selected="true"`
   - JS 根据当前 Tab 类型对全量数据重新排序后即时替换数据源 + 100ms fadeIn（视觉切换体感 < 200ms，符合 PRD 3.1 性能要求）
   - 排序规则：综合排行按 score 降序；稳定分红按 consecutiveYears 降序（同值按 dividendYield 降序）；分红最多按 dividendYield 降序
   - 分页重置到第 1 页
   - 搜索框清空
   - URL hash 更新
4. **结果**：表格显示新 Tab 对应的排行数据

#### I02 - 分页操作

1. **触发**：点击页码 / 上一页 / 下一页（鼠标或键盘 Enter）
2. **过程**：
   - 验证目标页码有效性
   - 表格内容滚动到顶部
   - 数据切片显示（当前页 * 50 到 (当前页 + 1) * 50）
   - 分页器高亮当前页码
3. **结果**：表格显示对应页的数据

#### I03 - 股票名称点击跳转

1. **触发**：点击表格中的股票名称（鼠标或键盘 Enter）
2. **过程**：构建 URL：`P02-detail.html?code={stockCode}`
3. **结果**：新标签页打开详情页

#### I04 - 搜索过滤

1. **触发**：搜索框输入内容
2. **防抖**：300ms
3. **过程**：
   - 获取输入值（trim 后）
   - 对当前 Tab 的全部数据进行 code 和 name 字段模糊匹配
   - 匹配结果更新到表格
   - 更新结果计数
   - 分页重置到第 1 页
4. **清空**：Esc 键或清空输入恢复全部数据
5. **结果**：表格只显示匹配结果

#### I05 - 更新数据

1. **触发**：点击「更新数据」按钮
2. **前置检查**：检查 localStorage 中的上次更新时间，若 5 分钟内已更新则拒绝
3. **过程**：
   - 按钮变为 loading 状态（旋转图标 + "更新中..."）
   - 模拟 API 调用（setTimeout 2000ms）
   - 随机成功/失败（80% 成功率）
4. **成功**：
   - 更新 localStorage 时间戳
   - 刷新页面顶部的更新时间显示
   - 表格数据刷新（假数据不变，实际仅刷新显示）
   - 按钮恢复
5. **失败**：
   - 显示红色错误提示条
   - 5 秒后自动 fadeOut
   - 按钮恢复
   - 数据保留之前内容

#### I06 - 行 hover 高亮

1. **触发**：鼠标移入表格行
2. **过程**：CSS transition 添加 `--color-bg-hover` 背景
3. **结果**：当前行浅蓝高亮

---

## P02 - 股票详情页

### 页面概述

| 属性 | 值 |
|------|---|
| 页面编号 | P02 |
| 页面名称 | 股票分红详情页 |
| 文件名 | P02-detail.html |
| 优先级 | P0 |
| 对应 PRD 功能 | 扩展功能：用户点击排行榜中的股票后查看该股票的分红历史详情 |
| 入口 | P01 排行榜中点击股票名称 |
| 出口 | 返回排行榜（P01） |

### 页面结构

```
P02-detail.html
+-- [G01] 页面头部（简化版：仅 Logo + 标题，无更新按钮和数据概览）
|   +-- Logo + 产品标题（点击返回首页）
|   +-- 面包屑：首页 > 股票详情 > {股票名称}
+-- 股票基本信息区
|   +-- 股票代码 + 名称 + 行业标签
|   +-- 综合评分（大字 + 评分条）
|   +-- 关键指标卡片组（4 个）
|       +-- 连续分红年数
|       +-- 最近年度股息率
|       +-- 近 3 年平均股息率
|       +-- 累计分红总额
+-- 分红历史表格
|   +-- 表格标题「历年分红记录」
|   +-- 分红明细表格
+-- 分红趋势区（简化版）
|   +-- 文字说明 + 柱状图区域占位（用 CSS 绘制简易柱状图）
+-- 返回排行榜按钮
+-- [G02] 页面底部（简化版：仅免责声明 + 版权，无评分说明和数据来源）
```

### 元素清单

#### 面包屑导航

| 元素 | 类型 | 描述 |
|------|------|------|
| 首页链接 | a | 点击返回 P01-home.html |
| 分隔符 | span | ">" |
| 股票详情 | text | 当前层级 |
| 股票名称 | text | 动态显示当前股票名称 |

#### 股票基本信息区

| 元素 | 类型 | 描述 | 样式 |
|------|------|------|------|
| 股票代码 | text | 6 位代码，等宽字体 | font-family-mono, font-size-lg |
| 股票名称 | h1 | 股票中文名称 | font-size-3xl, font-weight-bold |
| 行业标签 | badge | 所属行业 | badge-primary |
| 综合评分 | 组合 | 大字数值 + 评分条 + "综合排名第 N 名" | 数值用 accent 色，font-size-4xl |
| 连续分红年数卡片 | card | 数值 + 标签 | 参考 demo.html card 组件 |
| 最近年度股息率卡片 | card | 百分比 + 标签 | 同上 |
| 近 3 年平均股息率卡片 | card | 百分比 + 标签 | 同上 |
| 累计分红总额卡片 | card | 金额 + 标签 | 同上 |

#### 分红历史表格

| 列名 | 字段 | 对齐 | 说明 |
|------|------|------|------|
| 年度 | year | 左对齐 | 如 "2024"、"2023" |
| 分红方案 | plan | 左对齐 | 如 "每10股派25.98元" |
| 每股分红(元) | dps | 右对齐 | 保留 2 位小数 |
| 股息率(%) | yield | 右对齐 | 保留 2 位小数 |
| 除权除息日 | exDate | 左对齐 | YYYY-MM-DD 格式 |
| 分红总额(亿元) | totalAmount | 右对齐 | 保留 2 位小数 |

#### 分红趋势区（简易柱状图）

- 使用纯 CSS 绘制水平柱状图
- 每年一行：年份标签 + 彩色条 + 数值
- 柱状图颜色使用 primary 色渐变
- 最多显示近 10 年数据

#### 返回按钮

| 元素 | 类型 | 描述 |
|------|------|------|
| 返回排行榜 | button | btn-secondary 样式，左箭头图标 + "返回排行榜" |

### 页面状态

#### S1 - 正常展示

- **触发条件**：通过 URL 参数获取到有效的股票代码
- **表现**：所有区块正常渲染，数据来自假数据匹配

#### S2 - 加载中

- **触发条件**：页面加载时
- **表现**：
  - 基本信息区和卡片显示骨架屏
  - 表格显示骨架行
  - 0.5 秒后 fadeIn 显示真实内容

#### S3 - 股票未找到

- **触发条件**：URL 中无 code 参数或 code 无匹配
- **表现**：
  - 基本信息区显示「未找到该股票信息」
  - 提示文字 + 「返回排行榜」按钮
  - 表格区和趋势区隐藏

### 假数据

详情页内嵌所有排行榜数据池中的股票详情。对于核心股票（贵州茅台、中国平安、工商银行）提供完整 10 年历史数据，对于扩展池股票根据 consecutiveYears 字段自动生成历史数据（JS 运行时基于 dps 字段按每年递减 5-10% 生成）。

#### 贵州茅台详情数据（默认展示）

```json
{
  "code": "600519",
  "name": "贵州茅台",
  "industry": "白酒",
  "score": 95.2,
  "comprehensiveRank": 1,
  "consecutiveYears": 27,
  "dividendYield": 3.85,
  "avgYield3Y": 3.52,
  "totalDividend": 2365.12,
  "history": [
    {"year": "2024", "plan": "每10股派259.80元", "dps": 25.98, "yield": 3.85, "exDate": "2024-07-12", "totalAmount": 326.52},
    {"year": "2023", "plan": "每10股派240.00元", "dps": 24.00, "yield": 3.52, "exDate": "2023-07-14", "totalAmount": 301.42},
    {"year": "2022", "plan": "每10股派222.60元", "dps": 22.26, "yield": 3.18, "exDate": "2022-07-08", "totalAmount": 279.68},
    {"year": "2021", "plan": "每10股派216.75元", "dps": 21.68, "yield": 2.95, "exDate": "2021-07-16", "totalAmount": 272.38},
    {"year": "2020", "plan": "每10股派192.93元", "dps": 19.29, "yield": 2.68, "exDate": "2020-07-10", "totalAmount": 242.36},
    {"year": "2019", "plan": "每10股派170.25元", "dps": 17.03, "yield": 2.42, "exDate": "2019-07-12", "totalAmount": 213.92},
    {"year": "2018", "plan": "每10股派145.39元", "dps": 14.54, "yield": 2.15, "exDate": "2018-07-13", "totalAmount": 182.72},
    {"year": "2017", "plan": "每10股派109.99元", "dps": 11.00, "yield": 1.82, "exDate": "2017-07-07", "totalAmount": 138.16},
    {"year": "2016", "plan": "每10股派67.87元", "dps": 6.79, "yield": 1.56, "exDate": "2016-07-08", "totalAmount": 85.28},
    {"year": "2015", "plan": "每10股派61.71元", "dps": 6.17, "yield": 1.45, "exDate": "2015-07-10", "totalAmount": 77.52}
  ]
}
```

#### 中国平安详情数据（备选）

```json
{
  "code": "601318",
  "name": "中国平安",
  "industry": "保险",
  "score": 91.8,
  "comprehensiveRank": 2,
  "consecutiveYears": 18,
  "dividendYield": 5.42,
  "avgYield3Y": 4.88,
  "totalDividend": 4528.16,
  "history": [
    {"year": "2024", "plan": "每10股派24.20元", "dps": 2.42, "yield": 5.42, "exDate": "2024-08-02", "totalAmount": 442.56},
    {"year": "2023", "plan": "每10股派22.80元", "dps": 2.28, "yield": 4.88, "exDate": "2023-08-04", "totalAmount": 416.92},
    {"year": "2022", "plan": "每10股派22.00元", "dps": 2.20, "yield": 4.35, "exDate": "2022-08-05", "totalAmount": 402.28},
    {"year": "2021", "plan": "每10股派22.00元", "dps": 2.20, "yield": 3.92, "exDate": "2021-07-23", "totalAmount": 402.28},
    {"year": "2020", "plan": "每10股派16.20元", "dps": 1.62, "yield": 3.15, "exDate": "2020-07-31", "totalAmount": 296.28},
    {"year": "2019", "plan": "每10股派15.00元", "dps": 1.50, "yield": 2.85, "exDate": "2019-08-02", "totalAmount": 274.32},
    {"year": "2018", "plan": "每10股派12.00元", "dps": 1.20, "yield": 2.56, "exDate": "2018-07-27", "totalAmount": 219.42},
    {"year": "2017", "plan": "每10股派10.00元", "dps": 1.00, "yield": 2.12, "exDate": "2017-07-28", "totalAmount": 182.86}
  ]
}
```

#### 工商银行详情数据（备选）

```json
{
  "code": "601398",
  "name": "工商银行",
  "industry": "银行",
  "score": 88.3,
  "comprehensiveRank": 4,
  "consecutiveYears": 20,
  "dividendYield": 6.15,
  "avgYield3Y": 5.78,
  "totalDividend": 12856.32,
  "history": [
    {"year": "2024", "plan": "每10股派3.064元", "dps": 0.31, "yield": 6.15, "exDate": "2024-07-05", "totalAmount": 1092.68},
    {"year": "2023", "plan": "每10股派2.933元", "dps": 0.29, "yield": 5.78, "exDate": "2023-07-07", "totalAmount": 1045.86},
    {"year": "2022", "plan": "每10股派2.933元", "dps": 0.29, "yield": 5.42, "exDate": "2022-07-08", "totalAmount": 1045.86},
    {"year": "2021", "plan": "每10股派2.660元", "dps": 0.27, "yield": 5.15, "exDate": "2021-07-09", "totalAmount": 948.56},
    {"year": "2020", "plan": "每10股派2.628元", "dps": 0.26, "yield": 4.92, "exDate": "2020-07-10", "totalAmount": 937.12},
    {"year": "2019", "plan": "每10股派2.506元", "dps": 0.25, "yield": 4.68, "exDate": "2019-07-04", "totalAmount": 893.68},
    {"year": "2018", "plan": "每10股派2.408元", "dps": 0.24, "yield": 4.35, "exDate": "2018-07-13", "totalAmount": 858.72},
    {"year": "2017", "plan": "每10股派2.343元", "dps": 0.23, "yield": 4.12, "exDate": "2017-07-07", "totalAmount": 835.56}
  ]
}
```

#### 扩展池股票历史数据生成规则

对于没有手写历史数据的扩展池股票，P02 页面的 JS 将自动生成历史数据：

```
function generateHistory(stock) {
  // 基于 stock.dps 和 stock.consecutiveYears
  // 从 2024 年开始往前追溯 min(consecutiveYears, 10) 年
  // 每年 dps = 上一年 dps * (0.90 ~ 0.95) 随机递减
  // yield 在 dps 基础上按比例递减
  // exDate 为每年 7 月随机日期
  // totalAmount = dps * 随机基数（与 totalDividend 大致匹配）
  // plan = "每10股派" + (dps * 10).toFixed(2) + "元"
}
```

### 交互逻辑

#### I01 - 面包屑导航

1. **触发**：点击「首页」链接（鼠标或键盘 Enter）
2. **结果**：跳转到 P01-home.html

#### I02 - 返回排行榜

1. **触发**：点击底部「返回排行榜」按钮（鼠标或键盘 Enter）
2. **结果**：跳转到 P01-home.html

#### I03 - 页面加载数据匹配

1. **触发**：页面加载时
2. **过程**：
   - 解析 URL 参数 `code`
   - 先从核心详情数据中匹配（600519/601318/601398）
   - 若无匹配，从扩展池数据中匹配并自动生成历史数据
   - 若仍无匹配 -> 显示「未找到」状态
3. **加载动画**：骨架屏 -> 500ms 延迟 -> fadeInUp 显示真实内容

#### I04 - Logo 点击

1. **触发**：点击页面顶部 Logo/标题
2. **结果**：跳转到 P01-home.html

---

## 页面间关系

```
P01-home.html --[点击股票名称]--> P02-detail.html?code=600519
P02-detail.html --[点击Logo/面包屑/返回按钮]--> P01-home.html
```

---

## 响应式断点

| 断点 | 宽度范围 | 布局说明 |
|------|---------|---------|
| 移动端 | < 768px | 单列布局，表格横向滚动，卡片纵向堆叠，简化底部 |
| 平板端 | 768px - 1279px | 两列卡片，表格完整显示，底部两列 |
| 桌面端 | >= 1280px | 三列卡片，表格完整，底部三列，最大宽度 1200px 居中 |
