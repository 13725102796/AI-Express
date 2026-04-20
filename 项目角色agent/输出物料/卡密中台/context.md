# 卡密中台（CardKey Hub）— 项目上下文

> 跨 Phase 累积的核心决策记录，所有 agent 在启动时必须读取此文件。
> 最后更新：2026-04-20（Phase 0 Step 0）

---

## 一、产品定位

**一个独立部署的卡密中台 SaaS**，对外提供"生成 / 核销"能力，支持多个业务应用接入。
类比：支付宝之于商户——中台只做卡密，业务逻辑（积分、服务）归业务方。

### 目标用户
- **管理员角色**：在小红书/闲鱼等平台售卖卡密的中小运营者
- **业务方角色**：接入中台的 C 端 App（首批接入方：紫微灵犀命理产品；后续：情感陪伴 App、算命 App 等）
- **终端用户**：从管理员手里购买卡密，到业务方 App 内输入兑换权益

### 使用场景
1. 管理员后台登录 → 注册业务应用（拿到 app_key/app_secret）
2. 管理员为应用批量生成卡密 → 一次性下载 CSV 明文
3. 管理员在小红书/闲鱼售卖卡密
4. 终端用户购买卡密 → 到业务方 App 输入
5. 业务方 App 后端用 HMAC-SHA256 签名调用 `/api/v1/cards/redeem` → 核销成功 → 加积分/权益

---

## 二、已确认的 MVP 功能范围（不再挖掘）

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 管理员登录（账号密码 + JWT） | P0 | 参考紫微灵犀鉴权方案 |
| 业务应用注册（分配 app_key/app_secret） | P0 | 管理员后台操作 |
| 卡密批量生成 + CSV 一次性下载 | P0 | 下载链接 15 分钟有效 |
| 业务方核销 API（HMAC 签名） | P0 | 核心接口 |
| 批次管理（查看/召回/作废） | P1 | 运营视角需补充 |
| 核销查询 + 数据大盘 | P1 | 运营视角需补充 |
| 审计日志 | P1 | 核销日志全量记录 |

---

## 三、已确认的技术决策（架构师可细化，不可推翻）

### 数据库
- **MySQL**（腾讯云 CynosDB MySQL 5.7.18）
- 数据库名 `cardkey_hub` 已创建（utf8mb4, utf8mb4_unicode_ci）
- 连接串示例：`mysql+asyncmy://zyc:xxx@gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com:28225/cardkey_hub?charset=utf8mb4`
- 连接信息放入 `.env`（不提交 Git）

### 后端技术栈（与紫微灵犀同栈）
- FastAPI + uvicorn
- SQLAlchemy 2.0 async + asyncmy
- Alembic（迁移）
- Pydantic v2

### 前端技术栈
- React + Vite + Tailwind（B 端管理后台 SPA）
- 轻量优先，支持深色/浅色双主题

### 部署
- **不用 Docker**，裸 systemd + Nginx（2核2G 腾讯云主机）
- 后端：systemd service + uvicorn 监听 127.0.0.1
- 前端：Nginx 静态托管 + 反代 `/api/* → 127.0.0.1:<port>`
- 目标机：可与紫微灵犀共用 `193.112.131.137`（Ubuntu 22.04）或新开一台

---

## 四、已确认的核心数据模型

### apps（应用表）
- `id` PK
- `name` 应用名
- `app_key` VARCHAR(32) UNIQUE 公开 ID
- `app_secret` VARCHAR(64) 私密签名密钥（加密存储）
- `card_prefix` 卡密前缀（如 `ZWLX-`）
- `status` 启用/禁用
- `created_at`, `updated_at`

### cards（卡密表）
- `id` PK
- `app_id` FK → apps.id
- `code_hash` VARCHAR(64) SHA256+pepper 哈希（UNIQUE INDEX）
- `payload` JSON 业务自定义（如 `{"points":10}`）
- `status` TINYINT (0:未使用 1:已使用 2:已作废 3:已冻结)
- `batch_no` VARCHAR(32) 批次号
- `expires_at` DATETIME 过期时间（≤ 3 年）
- `face_value` DECIMAL(10,2) 面额（≤ 1000 元）
- `redeemed_at` DATETIME
- `redeemed_user` VARCHAR(64) 业务方传入的用户标识
- `redeemed_ip` VARCHAR(45)
- `created_at`, `updated_at`

### redemption_logs（核销日志表）
- `id` PK
- `app_id` FK
- `code_hash` VARCHAR(64)
- `user_id` VARCHAR(64) 业务方 user_id
- `ip` VARCHAR(45)
- `result` ENUM('success','invalid','used','expired','frozen','signature_failed')
- `error_msg` TEXT
- `created_at`

### admin_users（管理员表）
- `id` PK
- `username` UNIQUE
- `password_hash` bcrypt
- `role` ENUM('admin','operator')
- `last_login_at`
- `created_at`, `updated_at`

---

## 五、已确认的核心 API

| 方法 | 路径 | 用途 | 鉴权 |
|------|------|------|------|
| POST | `/admin/auth/login` | 管理员登录 | 账号密码 → JWT |
| POST | `/admin/apps` | 创建业务应用 | JWT |
| GET | `/admin/apps` | 应用列表 | JWT |
| POST | `/admin/apps/{app_id}/cards/generate` | 批量生成卡密 | JWT（返回一次性 CSV 下载 token） |
| GET | `/admin/cards/download/{token}` | 一次性 CSV 下载 | token（15 分钟有效） |
| GET | `/admin/cards` | 卡密列表/筛选/核销查询 | JWT |
| POST | `/admin/cards/batch/{batch_no}/revoke` | 批次作废 | JWT |
| **POST** | **`/api/v1/cards/redeem`** | **业务方核销（核心）** | **HMAC-SHA256 签名** |

---

## 六、鉴权机制

### 管理员后台
- 账号密码 + JWT（Access 2h + Refresh 7d，参考紫微灵犀）

### 业务方 API（HMAC-SHA256 签名）
- 请求头：`X-App-Key`、`X-Timestamp`、`X-Nonce`、`X-Signature`
- 签名算法：`HMAC-SHA256(app_secret, timestamp + nonce + method + path + body_sha256)`
- 时间窗口：5 分钟（防重放）
- Nonce：Redis 黑名单 5 分钟去重
- 返回：标准 `{ code, data, message }` 格式

---

## 七、安全与合规红线（不可逾越）

### 安全
- 卡密明文**永不入库**，只存 SHA256(code + pepper) 哈希
- pepper 从环境变量全局读取（`CARDKEY_PEPPER`）
- CSV 下载链接**一次性有效**（15 分钟）+ 下载后立即作废 token
- 核销并发保护：Redis 分布式锁 + DB 乐观锁双保险
  - SQL：`UPDATE cards SET status=1, redeemed_at=NOW() WHERE id=? AND status=0`
  - 影响行数 = 0 → 判定"已被他人核销"
- 所有管理员操作记录审计日志

### 合规
- 卡密是"**服务兑换凭证**"，不是货币、不可提现、不可转让
- 单张面额 ≤ 1000 元（预付卡监管线）
- 卡密有效期 ≤ 3 年
- 禁止分销/拉新返利（传销红线）
- 禁止"充多少送多少"活动（预付卡监管）
- 用户协议、免责声明在管理员后台必须显眼

---

## 八、非功能需求

| 指标 | 目标 |
|------|------|
| 核销接口 QPS | 1000（单机起步，可扩展） |
| P99 延迟 | < 100ms |
| 日志保留 | 90 天 |
| 数据库备份 | 腾讯云 CynosDB 自带每日 |
| 高可用 | MVP 单实例，后续可扩展到多实例 |

---

## 九、参考资料

- 紫微灵犀部署文档：`/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/code/DEPLOYMENT.md`
- 紫微灵犀 PRD：`/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/PRD.md`
- 紫微灵犀 demo：`/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/demo.html`
- 使用文档：`/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/使用文档.md`

---

## 十、待 agent 在后续 Phase 决策的事项

| 事项 | 责任 agent | Phase |
|------|-----------|-------|
| 管理员后台具体页面拆解（批次管理、大盘、审计等） | product-agent | Phase 0（PRD）+ Phase 1 |
| 设计系统（配色、字体、组件）具体值 | design-agent | Phase 0 |
| Redis 版本、部署方式、key 命名空间 | tech-architect-agent | Phase 2 |
| pepper 轮换策略 | tech-architect-agent | Phase 2 |
| 初次导入的紫微灵犀接入 SDK / 示例代码 | fullstack-dev-agent | Phase 2 |

---

## 变更日志

- 2026-04-20 Phase 0 Step 0：初始化 context.md，沉淀用户已确认的产品/技术/合规决策
