# 分红股排行榜 - 技术架构文档

> 版本：v1.0
> 基于：PRD.md v1.0 + page-specs.md v1.2

## 1. 技术选型

### 1.1 后端框架：Python FastAPI

- **版本**：FastAPI 0.115+（Python 3.11+）
- **选型理由**：
  - 异步支持，适合数据抓取和 API 服务
  - 自动生成 OpenAPI 文档
  - Pydantic v2 数据校验
  - 与 AKShare 同属 Python 生态，无桥接成本

### 1.2 数据抓取：AKShare

- **版本**：AKShare 最新稳定版
- **选型理由**：
  - 完全免费开源，无 API Key 需求
  - 覆盖 A 股分红数据接口
  - 活跃维护，社区成熟

### 1.3 数据库：SQLite

- **选型理由**：
  - 零配置，单文件部署
  - 适合本地运行的轻量场景
  - Python 标准库原生支持
  - 数据量（~5000 只股票）完全在 SQLite 性能范围内

### 1.4 前端：原生 HTML + CSS + JavaScript

- **选型理由**：
  - 设计稿已是完整的 HTML/CSS/JS 实现
  - 2 个页面的简单应用，无需框架
  - 直接复用 demo.html 的设计系统
  - 零构建依赖，打开即用
  - 从设计稿到产品代码的改动最小

### 1.5 部署方式

- **方案**：FastAPI 服务静态文件 + API
- **启动**：`python main.py` 一条命令启动
- **端口**：8000（可配置）

## 2. 系统架构

```
stock-dividend-rank/
├── main.py                    # FastAPI 入口，API + 静态文件服务
├── requirements.txt           # Python 依赖
├── .env.example              # 环境变量示例
├── README.md                 # 项目说明
│
├── backend/
│   ├── __init__.py
│   ├── config.py             # 配置管理
│   ├── database.py           # SQLite 数据库初始化
│   ├── models.py             # 数据模型定义
│   ├── schemas.py            # Pydantic 响应模型
│   ├── services/
│   │   ├── __init__.py
│   │   ├── data_fetcher.py   # AKShare 数据抓取服务
│   │   ├── ranking.py        # 排行榜计算服务
│   │   └── stock_service.py  # 股票查询服务
│   └── routers/
│       ├── __init__.py
│       ├── ranking.py        # 排行榜 API 路由
│       ├── stock.py          # 股票详情 API 路由
│       └── update.py         # 数据更新 API 路由
│
├── frontend/
│   ├── index.html            # P01 - 首页/排行榜
│   ├── detail.html           # P02 - 股票详情页
│   ├── css/
│   │   └── style.css         # 全局样式（提取自设计稿）
│   └── js/
│       ├── api.js            # API 请求封装
│       ├── home.js           # 首页逻辑
│       └── detail.js         # 详情页逻辑
│
├── data/
│   └── dividend.db           # SQLite 数据库文件（运行时生成）
│
└── tests/
    ├── __init__.py
    ├── test_ranking.py       # 排行算法测试
    ├── test_api.py           # API 接口测试
    └── conftest.py           # 测试配置
```

## 3. 数据模型

### 3.1 stocks 表（股票基本信息）

| 字段 | 类型 | 说明 |
|------|------|------|
| code | TEXT PRIMARY KEY | 股票代码（6位） |
| name | TEXT NOT NULL | 股票名称 |
| industry | TEXT | 所属行业 |
| current_price | REAL | 当前股价 |
| updated_at | TEXT | 最后更新时间 |

### 3.2 dividends 表（分红记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增ID |
| stock_code | TEXT NOT NULL | 股票代码（FK） |
| year | INTEGER NOT NULL | 分红年度 |
| plan | TEXT | 分红方案描述 |
| dps | REAL | 每股分红（元） |
| ex_date | TEXT | 除权除息日 |
| total_amount | REAL | 分红总额（亿元） |
| UNIQUE(stock_code, year) | | 唯一约束 |

### 3.3 ranking_cache 表（排行榜缓存）

| 字段 | 类型 | 说明 |
|------|------|------|
| stock_code | TEXT PRIMARY KEY | 股票代码 |
| consecutive_years | INTEGER | 连续分红年数 |
| latest_dps | REAL | 最近年度每股分红 |
| latest_yield | REAL | 最近年度股息率(%) |
| avg_yield_3y | REAL | 近3年平均股息率(%) |
| total_dividend | REAL | 累计分红总额（亿元） |
| composite_score | REAL | 综合评分（0-100） |
| updated_at | TEXT | 计算时间 |

### 3.4 update_log 表（更新日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增ID |
| started_at | TEXT | 开始时间 |
| finished_at | TEXT | 结束时间 |
| status | TEXT | success/failed |
| stock_count | INTEGER | 处理股票数 |
| error_message | TEXT | 错误信息 |

## 4. API 设计

### 4.1 GET /api/ranking/{tab_type}

获取排行榜数据。

**路径参数**：
- `tab_type`: `comprehensive` | `stable` | `highest`

**查询参数**：
- `page`: int, 默认 1
- `page_size`: int, 默认 50
- `search`: string, 可选，模糊搜索股票代码/名称

**响应**（200）：
```json
{
  "items": [
    {
      "rank": 1,
      "code": "600519",
      "name": "贵州茅台",
      "industry": "白酒",
      "score": 95.2,
      "consecutive_years": 27,
      "dividend_yield": 3.85,
      "avg_yield_3y": 3.52,
      "dps": 25.98,
      "total_dividend": 2365.12
    }
  ],
  "total": 856,
  "page": 1,
  "page_size": 50,
  "total_pages": 18
}
```

### 4.2 GET /api/stock/{code}

获取股票详情（含历年分红记录）。

**路径参数**：
- `code`: 6位股票代码

**响应**（200）：
```json
{
  "code": "600519",
  "name": "贵州茅台",
  "industry": "白酒",
  "score": 95.2,
  "comprehensive_rank": 1,
  "consecutive_years": 27,
  "dividend_yield": 3.85,
  "avg_yield_3y": 3.52,
  "total_dividend": 2365.12,
  "history": [
    {
      "year": 2024,
      "plan": "每10股派259.80元",
      "dps": 25.98,
      "yield": 3.85,
      "ex_date": "2024-07-12",
      "total_amount": 326.52
    }
  ]
}
```

**响应**（404）：
```json
{"detail": "Stock not found"}
```

### 4.3 POST /api/update

触发数据更新。

**响应**（200）：
```json
{
  "status": "success",
  "stock_count": 856,
  "updated_at": "2026-03-24 15:30",
  "duration_seconds": 45
}
```

**响应**（429）：
```json
{"detail": "更新冷却中，请5分钟后再试"}
```

### 4.4 GET /api/stats

获取统计概览数据。

**响应**（200）：
```json
{
  "total_stocks": 856,
  "avg_dividend_yield": 3.28,
  "max_consecutive_years": 27,
  "max_consecutive_stock": "贵州茅台",
  "last_updated": "2026-03-24 15:30"
}
```

## 5. 排行算法

### 5.1 综合评分公式

```
综合评分 = 稳定性得分 * 0.4 + 股息率得分 * 0.35 + 分红规模得分 * 0.25

其中：
- 稳定性得分 = normalize(连续分红年数) * 100
- 股息率得分 = normalize(近3年平均股息率) * 100
- 分红规模得分 = normalize(累计分红总额) * 100

normalize(x) = (x - min) / (max - min)
```

### 5.2 排序规则

| Tab | 主排序 | 次排序 |
|-----|--------|--------|
| 综合排行 | 综合评分 降序 | -- |
| 稳定分红 | 连续分红年数 降序 | 股息率 降序 |
| 分红最多 | 最近年度股息率 降序 | -- |

### 5.3 数据过滤

- 排除 ST 股（名称包含 ST）
- 排除连续分红年数 < 1 年的股票
- 排除停牌股票

## 6. 数据抓取流程

```
POST /api/update 触发
    |
    v
1. 获取 A 股全部股票列表（akshare: stock_zh_a_spot_em）
    |
    v
2. 获取分红数据（akshare: stock_dividend_cninfo / stock_history_dividend）
    |
    v
3. 获取当前股价（已在步骤1中包含）
    |
    v
4. 数据清洗（排除 ST、格式化）
    |
    v
5. 计算排行指标（连续年数、股息率、综合评分）
    |
    v
6. 写入 SQLite
    |
    v
7. 返回结果
```

## 7. 前端架构

### 7.1 页面路由

- `/` -> `index.html`（首页排行榜）
- `/detail.html?code=XXXXXX` -> `detail.html`（详情页）

### 7.2 组件复用

直接从设计稿提取以下组件样式到 `style.css`：
- Header（G01）
- Footer（G02）
- Tab Bar（G03）
- Data Table（G04）
- Stat Cards
- Pagination
- Search Box
- Skeleton Loading
- Empty State
- Error Toast

### 7.3 API 交互

`api.js` 封装所有后端请求：
- `fetchRanking(tabType, page, search)` -> GET /api/ranking/{tabType}
- `fetchStockDetail(code)` -> GET /api/stock/{code}
- `triggerUpdate()` -> POST /api/update
- `fetchStats()` -> GET /api/stats
