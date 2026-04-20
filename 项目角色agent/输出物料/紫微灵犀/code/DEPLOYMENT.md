# 紫微灵犀 — 生产部署文档

> 部署日期：2026-04-20（v1.0 PG 本地）
> 数据库迁移：2026-04-20（v1.1 MySQL 云）
> 服务器：腾讯云 Ubuntu 22.04 / 2核2G / 50GB
> IP：193.112.131.137
> 访问地址：http://193.112.131.137/

---

## 一、架构总览

```
用户浏览器
    │ HTTP (80)
    ▼
┌─────────────────────────────────────────────┐
│  Nginx 1.18 (系统原生 systemd)                │
│  ├─ /                → 静态 H5 (webapp)      │
│  ├─ /assets/*       → 前端资源（7d 缓存）     │
│  ├─ /static/*       → 前端静态               │
│  ├─ /api/*          → 反代 127.0.0.1:8000   │
│  └─ /paipan|health|docs → 反代 127.0.0.1:8000│
└─────────────────┬───────────────────────────┘
                  │
                  ▼ (loopback)
┌─────────────────────────────────────────────┐
│  FastAPI 0.136 / uvicorn (systemd)           │
│  监听 127.0.0.1:8000 · 1 worker              │
│  MemoryMax=512M · Restart=always             │
└─────────────────┬───────────────────────────┘
                  │ 公网出站 (TCP 28225)
                  ▼
┌─────────────────────────────────────────────┐
│  腾讯云 CynosDB MySQL 5.7 (独立实例 1核1GB)    │
│  gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com:28225 │
│  database: ziwei · charset: utf8mb4          │
└─────────────────────────────────────────────┘
```

**技术栈**：
- 后端：FastAPI 0.136 + SQLAlchemy 2.0 async + **asyncmy** + Alembic
- 前端：uni-app (Vue 3 + TS) 编译为 H5 静态站
- DB：**腾讯云 CynosDB MySQL 5.7.18**（公网连接，utf8mb4）
- Runtime：Python 3.12.13（deadsnakes PPA）
- 反代：Nginx 1.18（Ubuntu 官方源）
- LLM：Gemini 2.5 Pro via OpenAI 兼容中转 `api.ttk.homes`

**没用 Docker / K3s 的理由**：2核2G 下裸 systemd 内存开销最省（仅占 ~300MB vs Docker ~400MB / K3s ~1GB）。

**数据库选择说明**：2026-04-20 从本地 PostgreSQL 16 迁移至腾讯云 CynosDB MySQL 5.7 独立实例。
- 代价：models 全部改为方言无关（`sa.Uuid` / `sa.JSON`），去除 JSONB/partial index 等 PG 独家特性
- 收益：DB 与 App 解耦，自动备份、主备切换由云厂商负责
- 限制：公网连接延迟 ~10-30ms，高 QPS 场景可考虑迁至 App 同 VPC 内网

---

## 二、服务器资源使用

| 项目 | 使用 | 说明 |
|------|------|------|
| 内存 | 325MB / 2GB | Swap 2GB 作安全垫 |
| 磁盘 | 7.1GB / 50GB | 16% |
| CPU | 低负载 | uvicorn 单 worker 足够 |

**关键进程内存**：
- uvicorn：~88MB
- Nginx：~10MB
- fail2ban：~23MB
- 腾讯云 agents（YunJing/barad/tat）：~150MB（不能卸载，账户安全需要）
- （PostgreSQL 已卸载，DB 用云上 CynosDB MySQL）

---

## 三、关键路径

| 类型 | 路径 |
|------|------|
| 后端代码 | `/home/ubuntu/ziwei/` |
| 后端虚拟环境 | `/home/ubuntu/ziwei/.venv/` |
| 后端环境变量 | `/home/ubuntu/ziwei/.env` (600) |
| 前端静态文件 | `/var/www/html/` |
| Nginx 站点配置 | `/etc/nginx/sites-available/ziwei` |
| Nginx 启用链接 | `/etc/nginx/sites-enabled/ziwei` |
| systemd 服务文件 | `/etc/systemd/system/ziwei.service` |
| fail2ban 规则 | `/etc/fail2ban/jail.local` |
| SSH 密钥（本地） | `code/login.pem` |

---

## 四、凭证清单（务必妥善保管）

### 数据库（腾讯云 CynosDB MySQL 5.7）
- 实例：`cynosdbmysql-ins-ep5cz9ro`
- 主机：`gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com`
- 端口：`28225`（公网）
- 内网：`172.16.16.11:3306`（应用服务器与 DB 不同 VPC，暂无法走内网）
- 用户：`zyc`
- 密码：`Zyc188208`
- 数据库：`ziwei`（charset `utf8mb4`, collate `utf8mb4_unicode_ci`）
- 连接串：
  ```
  mysql+asyncmy://zyc:Zyc188208@gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com:28225/ziwei?charset=utf8mb4
  ```

### 管理员（后台登录）
- 用户名：`admin`
- 密码：`Z8vW4yxw0uDZgAte`

### JWT 密钥
- `JWT_SECRET_USER`：`4htiG8oNhNHykkLq-sXWGLRqsPnMH_27c1djgqSL3E0jsC41w9D393rUym3n7raS`
- `JWT_SECRET_ADMIN`：`0OVF73KMIarFWP83GGf7-bVmMmW4We-feDRjSR6NTxGY-Y2ZdJGpWVBSURoRgrUs`

### LLM（OpenAI 兼容中转）
- `GEMINI_API_KEY`：`sk-y44WkbyPGa01H0Wx7OMkbVqxhSGQVy8EBcJ1YdNKVWBGKN9g`
- `GEMINI_BASE_URL`：`https://api.ttk.homes/v1`
- `GEMINI_MODEL`：`gemini-3.1-pro-preview-cli`

### 手机号加密
- `PHONE_ENC_KEY`：`Zk7q3dWxYzFvBsLpRtN5MhKjC2EuQwH8AaG6SiUoP1c=`（不要变，变了已加密字段无法解密）

> **安全提示**：SSH 密码 `Zyc188208` 曾暴露在老 FRP 配置中，建议登录后执行 `passwd` 修改。

---

## 五、访问地址

| 地址 | 用途 |
|------|------|
| http://193.112.131.137/ | 前端 H5 webapp |
| http://193.112.131.137/health | 健康检查（返回 JSON） |
| http://193.112.131.137/docs | Swagger UI 交互式文档 |
| http://193.112.131.137/redoc | ReDoc 文档 |
| http://193.112.131.137/openapi.json | OpenAPI Schema |
| http://193.112.131.137/api/v1/* | 业务 API |
| http://193.112.131.137/paipan/* | 排盘 API（老接口兼容） |

---

## 六、运维常用命令

### SSH 连接
```bash
ssh -i code/login.pem ubuntu@193.112.131.137
```

### 服务状态
```bash
sudo systemctl status ziwei           # 后端状态
sudo systemctl status nginx           # 反代状态
sudo systemctl status fail2ban        # 防爆破状态
# DB 在云上，看腾讯云控制台：cynosdbmysql-ins-ep5cz9ro
```

### 日志
```bash
sudo journalctl -u ziwei -f                 # 后端实时日志
sudo journalctl -u ziwei -n 200 --no-pager  # 后端最近 200 行
sudo tail -f /var/log/nginx/access.log      # Nginx 访问日志
sudo tail -f /var/log/nginx/error.log       # Nginx 错误日志
# DB 日志：腾讯云控制台 → CynosDB → 日志管理
```

### 重启服务
```bash
sudo systemctl restart ziwei          # 重启后端（改代码后）
sudo systemctl reload nginx           # 重载 Nginx（改 conf 后）
# DB 重启在腾讯云控制台：CynosDB → 重启实例
```

### 数据库操作（MySQL）
```bash
# 服务器已装 mysql 客户端，直接连
mysql -h gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com -P 28225 \
  -u zyc -p'Zyc188208' ziwei

# 本地连（需先在腾讯云控制台允许你的公网 IP）
mysql -h gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com -P 28225 \
  -u zyc -p'Zyc188208' ziwei

# 备份（在任何有 mysqldump 的机器）
mysqldump -h gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com -P 28225 \
  -u zyc -p'Zyc188208' \
  --default-character-set=utf8mb4 \
  --single-transaction --quick --no-tablespaces \
  ziwei | gzip > ~/ziwei-backup-$(date +%F).sql.gz

# 恢复
gunzip -c ~/ziwei-backup-YYYY-MM-DD.sql.gz | \
  mysql -h gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com -P 28225 \
  -u zyc -p'Zyc188208' --default-character-set=utf8mb4 ziwei
```

> 腾讯云 CynosDB 自带每日备份 + 可回溯 7 天，控制台 → 备份管理。

### fail2ban 查看封禁
```bash
sudo fail2ban-client status sshd      # 查看 SSH 规则状态
sudo fail2ban-client unban IP         # 手动解封某 IP
```

---

## 七、更新部署流程

### 7.1 更新后端代码

**本地操作**：
```bash
cd /Users/maidong/Desktop/zyc/github/AI-Express/紫薇

# 上传代码（排除 venv、缓存、测试、.env）
rsync -avz -e "ssh -i /Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/code/login.pem" \
  --exclude='.venv' --exclude='.venv-py312' --exclude='.pytest_cache' \
  --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' \
  --exclude='tests' --exclude='.DS_Store' \
  ./ ubuntu@193.112.131.137:/home/ubuntu/ziwei/
```

**服务器操作**：
```bash
ssh -i code/login.pem ubuntu@193.112.131.137

cd /home/ubuntu/ziwei
source .venv/bin/activate

# 若改了 requirements.txt
pip install -r requirements.txt

# 若新增了 Alembic 迁移
alembic upgrade head

# 重启
sudo systemctl restart ziwei

# 验证
curl -s http://127.0.0.1:8000/health
```

### 7.2 更新前端代码

**本地构建**：
```bash
cd /Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/code/frontend

# 如果改了 .env.production（API 地址），确认为 http://193.112.131.137
cat .env.production

# 构建 H5
npm run build:h5
```

**上传并替换**：
```bash
KEY=/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/紫微灵犀/code/login.pem

# 先上传到临时目录
rsync -avz -e "ssh -i $KEY" \
  dist/build/h5/ ubuntu@193.112.131.137:/tmp/ziwei-web/

# 原子替换
ssh -i $KEY ubuntu@193.112.131.137 '
  sudo rm -rf /var/www/html/* &&
  sudo mv /tmp/ziwei-web/* /var/www/html/ &&
  sudo chown -R www-data:www-data /var/www/html &&
  rmdir /tmp/ziwei-web 2>/dev/null
'
```

### 7.3 修改环境变量

```bash
ssh -i code/login.pem ubuntu@193.112.131.137
sudo nano /home/ubuntu/ziwei/.env
sudo systemctl restart ziwei
```

---

## 八、systemd 服务定义

### 文件：`/etc/systemd/system/ziwei.service`
```ini
[Unit]
Description=Ziwei LingXi FastAPI service
After=network.target
Wants=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/ziwei
EnvironmentFile=/home/ubuntu/ziwei/.env
ExecStart=/home/ubuntu/ziwei/.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000 --workers 1 --log-level info
Restart=always
RestartSec=5
MemoryMax=512M
MemoryHigh=400M

[Install]
WantedBy=multi-user.target
```

> 若后续升级到 4G 内存，可调高 MemoryMax 并把 workers 从 1 调到 2。

---

## 九、Nginx 站点定义

### 文件：`/etc/nginx/sites-available/ziwei`
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /var/www/html;
    index index.html;

    client_max_body_size 20m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript;
    gzip_min_length 1024;

    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    location /static/ {
        expires 7d;
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    location ~ ^/(paipan|health|docs|openapi\.json|redoc) {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 十、安全加固清单

- ✅ fail2ban 启用（SSH 5 次失败 → 封禁 1 小时）
- ✅ 2GB swap 防 OOM
- ✅ 所有 secrets 使用强随机值
- ✅ FastAPI 监听 127.0.0.1，只能通过 Nginx 反代访问
- ✅ MySQL 在云端独立实例，有自动备份和主备切换
- ✅ `.env` 权限 600，只有 ubuntu 可读
- ✅ systemd 内存限制，防止服务失控

### ⚠️ 待办
- [ ] 执行 `passwd` 修改 SSH 密码（老密码曾暴露）
- [ ] 考虑禁用 SSH 密码登录（`/etc/ssh/sshd_config` → `PasswordAuthentication no`）
- [ ] 后续有域名后：`apt install certbot python3-certbot-nginx` 配 HTTPS
- [ ] CynosDB MySQL 密码（`Zyc188208`）与 SSH 同密码且曾暴露，建议到控制台改为强密码
- [ ] 考虑把 CynosDB 和 App Server 放到同一 VPC，改用内网连接（172.16.16.11:3306）可省 10-30ms 延迟

---

## 十一、故障排查

### 后端启动失败
```bash
sudo systemctl status ziwei
sudo journalctl -u ziwei -n 100 --no-pager
```
常见原因：
- `.env` 配置错误（特别是 `DATABASE_URL`）
- CynosDB MySQL 网络不通（`mysql -h ... -P 28225 -u zyc -p` 测试）
- CynosDB 控制台"外网访问"白名单未放通服务器 IP
- Python 依赖缺失（执行 `pip install -r requirements.txt` 补装）
- 端口 8000 被占（`sudo ss -tlnp | grep 8000`）

### 502 Bad Gateway
后端挂了。检查：
```bash
sudo systemctl status ziwei
curl http://127.0.0.1:8000/health
```

### 前端白屏
1. 检查 `/var/www/html/index.html` 是否存在
2. 检查 `.env.production` 中 `VITE_API_BASE` 是否 `http://193.112.131.137`
3. F12 Network 看 JS/CSS 是否 200

### 数据库连接失败
```bash
# 从服务器测试 CynosDB MySQL 连通性
mysql -h gz-cynosdbmysql-grp-j6v71ct5.sql.tencentcdb.com -P 28225 \
  -u zyc -p'Zyc188208' -e 'SELECT 1' ziwei

# 典型症状：
# - 连接超时 → 腾讯云控制台"外网访问" → 白名单放通服务器 IP
# - Access denied → 密码错了或账号被锁
# - greenlet_spawn → 代码用了 server_default 触发 insert 后 refresh（本次已修复为 default=_utcnow）
```

### 内存告急 / OOM
```bash
free -h
# 看谁吃内存
ps aux --sort=-%mem | head -10
# 最近是否有 OOM kill
sudo dmesg -T | grep -i 'killed process\|out of memory' | tail -20
```

---

## 十二、回滚方案

### 后端回滚（如果新版本出问题）
1. 保留每次部署前的 `/home/ubuntu/ziwei/` 目录备份（建议在部署脚本中加）
2. Alembic 迁移回滚：`alembic downgrade -1`

### 前端回滚
1. 每次部署前把 `/var/www/html/` 打包到 `~/backups/web-YYYYMMDD.tar.gz`
2. 出问题直接解压覆盖

---

## 十三、扩容方向

当前 2核2G 上限估算：
- 并发：~50-100 QPS（FastAPI 单 worker）
- AI 流式调用：受 Gemini 中转速率限制

**何时需要升级**：
- 并发 > 100 QPS → 升 4核4G，workers 调到 2-4
- 用户 > 5000 → 数据库单独服务器（RDS 或独立云主机）
- AI 调用成本高 → 接入缓存层（Redis）
- 需要 HTTPS → 买域名 + Let's Encrypt

---

## 附录 A：从零重建部署

如服务器崩溃需完全重建，按以下顺序执行：

1. **系统层**：`apt update && apt install -y nginx fail2ban mysql-client`
2. **Python 3.12**：加 deadsnakes PPA，`apt install python3.12 python3.12-venv python3.12-dev build-essential libffi-dev libssl-dev`
3. **CynosDB 准备**：
   - 腾讯云控制台 → CynosDB MySQL → 确认"外网访问"已开启
   - 添加服务器公网 IP 到安全组白名单
   - 创建 `ziwei` 数据库（utf8mb4）：
     `CREATE DATABASE ziwei CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
4. **代码部署**：参考第七章上传
5. **venv**：`python3.12 -m venv .venv && pip install -r requirements.txt`
6. **迁移**：`alembic upgrade head && python -m ziwei_app.seeds.init_seeds`
7. **systemd**：写 `ziwei.service` 并 `enable --now`
8. **前端**：`npm run build:h5` 后 rsync 到 `/var/www/html/`
9. **Nginx**：写 site conf，ln 到 sites-enabled，reload
10. **安全**：`systemctl enable --now fail2ban`，加 swap

---

## 附录 B：MySQL 迁移技术要点

本次从本地 PG 迁移到 CynosDB MySQL 的几个坑与解法：

### 1. 方言无关类型
```diff
- from sqlalchemy.dialects.postgresql import UUID, JSONB
+ from sqlalchemy import Uuid, JSON
- UUID(as_uuid=True)
+ Uuid(as_uuid=True)   # PG 走 native UUID，MySQL 走 CHAR(32)
- JSONB
+ JSON                  # PG 走 JSON，MySQL 5.7+ 走 JSON（无 JSONB 优化）
```

### 2. 移除 PG 独家特性
- **Partial index**：`postgresql_where="col IS NOT NULL"` → 删除即可，MySQL 的 UNIQUE 默认允许多个 NULL
- **索引列方向** `sa.text("created_at DESC")` → 改成 `"created_at"`，查询时 ORDER BY DESC 依然生效
- **JSON 列 server_default**：MySQL 5.7 JSON 不支持默认值，改用 ORM `default=list`

### 3. 驱动选择（重要）
```
aiomysql 0.3.x + SA 2.0 → ❌ MissingGreenlet 错误
aiomysql 0.2.0 + SA 2.0 → ⚠️ 可能可用但较旧
asyncmy 0.2.9+ + SA 2.0 → ✅ 官方推荐，C 扩展更快
```
连接串：`mysql+asyncmy://user:pass@host:port/db?charset=utf8mb4`

### 4. MissingGreenlet 根因与修复
症状：ORM insert 后访问 `obj.created_at` 抛 `sqlalchemy.exc.MissingGreenlet`。

根因：SA 对 `server_default=func.now()` 的列，在 insert 后需要再次 SELECT 回填值。PG 用 RETURNING 一次性拿到；MySQL 必须独立 SELECT，但这 SELECT 脱离了 greenlet 上下文。

修复：所有时间戳列改为 Python 侧默认
```diff
- created_at = mapped_column(DateTime(timezone=True), server_default=func.now())
+ created_at = mapped_column(DateTime(timezone=True), default=_utcnow)

  def _utcnow():
      return datetime.now(timezone.utc)
```
ORM 在 INSERT 时就知道值，无需回读。

### 5. requirements.txt 变化
```diff
- asyncpg>=0.30.0
+ asyncmy>=0.2.9
+ pymysql>=1.1.0   # alembic 同步场景备用
```

---

## 附录 C：部署时间线

| 版本 | 操作 | 耗时 |
|------|------|------|
| v1.0 | 本地 PG 初次部署 | ~10 min |
| v1.1 | MySQL 迁移（含 5 处 bug 修复） | ~30 min |

---

*本文档由部署执行过程中自动整理，如有变更请同步更新。*
