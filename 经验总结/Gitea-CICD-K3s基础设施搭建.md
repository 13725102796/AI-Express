# Gitea + CI/CD + K3s 企业级基础设施搭建

## 一、整体架构

```
开发者 git push (HTTPS)
    │
    ▼
Gitea (构建服务器 - Nginx反代 + HTTPS)
    │
    ▼ Gitea Actions Runner
构建 Docker 镜像
    │
    ▼ docker push
云镜像仓库 (火山引擎 CR)
    │
    ▼ kubectl apply
K3s 集群 (部署服务器)
```

## 二、Gitea 私有仓库部署

### 问题与方案

| 问题 | 解决方案 |
|------|----------|
| Docker Hub 国内不通 | 使用阿里云镜像源安装 Docker，配置 registry-mirrors |
| Gitea latest 镜像拉不下来 | 指定具体版本 `gitea/gitea:1.23-rootless` |
| 直接暴露 3000 端口不安全 | Nginx 反向代理 + Let's Encrypt HTTPS |
| Git SSH 需要额外端口 | 企业级做法：禁用 SSH，全部走 HTTPS 推拉代码 |

### 关键配置

**Docker Compose (Gitea + MySQL + Runner)**
```yaml
services:
  gitea_db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=xxx
      - MYSQL_USER=gitea
      - MYSQL_PASSWORD=xxx
      - MYSQL_DATABASE=gitea
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  gitea:
    image: gitea/gitea:1.23-rootless
    depends_on:
      - gitea_db
    environment:
      - GITEA__database__DB_TYPE=mysql
      - GITEA__database__HOST=gitea_db:3306
      - GITEA__server__ROOT_URL=https://域名/
      - GITEA__server__DISABLE_SSH=true
      - GITEA__actions__ENABLED=true
    volumes:
      - ./gitea-data:/var/lib/gitea
      - ./gitea-config:/etc/gitea
    ports:
      - "3000:3000"

  act_runner:
    image: gitea/act_runner:latest
    environment:
      - GITEA_INSTANCE_URL=http://gitea:3000
      - GITEA_RUNNER_REGISTRATION_TOKEN=xxx
      - CONFIG_FILE=/data/config.yaml
    volumes:
      - ./runner-data:/data
      - /var/run/docker.sock:/var/run/docker.sock
```

**Runner 并发配置 (runner-data/config.yaml)**
```yaml
runner:
  capacity: 3      # 4核8G可以跑3个并发构建
  timeout: 3h
```

**Nginx 反代 + HTTPS**
```bash
# 安装 certbot
apt-get install -y nginx certbot python3-certbot-nginx

# 申请证书（自动配置 Nginx）
certbot --nginx -d gitea.domain.com --non-interactive --agree-tos --email admin@domain.com --redirect
```

### 企业级做法要点

- Git 推拉全走 HTTPS，不开 SSH 端口，只暴露 80/443
- 用 Access Token 认证，方便 CI/CD 集成和权限轮换
- Nginx 反向代理，支持 WebSocket（Gitea 实时更新需要）
- `client_max_body_size 512M` 支持大文件上传

## 三、Gitea 数据迁移

### 问题描述

从旧服务器（阿里云）迁移 Gitea 到新服务器（火山引擎），需要 100% 完整迁移用户、仓库、Issue 等。

### 迁移步骤

```bash
# 旧服务器：执行全量备份
docker exec -u git gitea bash -c "gitea dump -c /etc/gitea/app.ini --type tar.gz"

# 找到 dump 文件
docker exec gitea find / -name "gitea-dump-*" 2>/dev/null

# 拷贝并传输
docker cp gitea:/path/gitea-dump-xxx.tar.gz /root/gitea-dump.tar.gz
scp /root/gitea-dump.tar.gz root@新服务器:/opt/gitea/
```

### 关键踩坑

**1. MySQL 导入中文乱码**
- 根因：MySQL 客户端默认连接字符集为 `latin1`，而数据是 `utf8mb4`
- 解决：导入时必须指定字符集
```bash
# 错误做法（会乱码）
mysql gitea < gitea-db.sql

# 正确做法
mysql --default-character-set=utf8mb4 gitea < gitea-db.sql
```

**2. 头像文件路径嵌套**
- dump 解压后 data 目录结构 `data/avatars/`，拷贝到 `gitea-data/data/` 后变成了 `gitea-data/data/data/avatars/`（多嵌套一层）
- 解决：`cp -a gitea-data/data/data/* gitea-data/data/`

**3. 版本兼容性**
- 高版本 Gitea dump 不能还原到低版本
- 迁移前先把新服务器 Gitea 升级到 >= 旧版本

**4. rootless 版本用户名**
- `gitea:1.23-rootless` 容器内用户是 `git`，不是 `gitea`
- `docker exec -u git gitea ...`

**5. admin 是保留用户名**
- Gitea 不允许创建名为 `admin` 的用户，换用 `gitadmin` 等

## 四、镜像仓库选择

### 企业级做法对比

| 方式 | 适用场景 |
|------|----------|
| 云镜像仓库（推荐） | 版本管理、审计、多服务器拉取 |
| 私有 Registry（registry:2） | 省钱但缺少 UI 和审计 |
| 内网直传（docker save/scp） | 临时用，不推荐 |

### 火山引擎 CR 说明

- 小微版按量计费够用：5 命名空间、300 仓库
- 命名空间是分组（如 dev/prod），不是镜像数量限制
- 同地域 ECS 走内网拉取，免流量费

## 五、K3s 部署服务器

### 安装（国内镜像）

```bash
curl -sfL https://rancher-mirror.rancher.cn/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -
```

### 配置私有镜像仓库 + Docker Hub 加速

```yaml
# /etc/rancher/k3s/registries.yaml
mirrors:
  docker.io:
    endpoint:
      - "https://hub.rat.dev"
      - "https://docker.1ms.run"
  gitea-cn-shanghai.cr.volces.com:
    endpoint:
      - "https://gitea-cn-shanghai.cr.volces.com"
configs:
  "gitea-cn-shanghai.cr.volces.com":
    auth:
      username: "用户名"
      password: "密码"
```

修改后需 `systemctl restart k3s` 生效。

### 踩坑：K3s 系统组件卡在 ContainerCreating

- 根因：国内无法访问 Docker Hub，拉不到 `rancher/mirrored-pause:3.6` 等系统镜像
- 解决：在 `registries.yaml` 中配置 `docker.io` 的国内镜像加速

## 六、服务器角色规划

| 服务器 | 角色 | 配置 | 部署内容 |
|--------|------|------|----------|
| 构建服务器 | Git + CI/CD | 4核8G | Gitea、MySQL、Actions Runner、Nginx |
| 部署服务器 | 业务运行 | 4核16G | K3s、应用服务 |

构建和运行分离的好处：
- 构建不占用业务服务器资源
- 业务服务器挂了不影响代码和 CI/CD
- 代码仓库挂了不影响线上服务

## 七、Docker 国内镜像源配置

```json
// /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://hub.rat.dev",
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
```

注意：镜像源有限流（429 Too Many Requests），多配几个做 fallback。

---
*最后更新: 2026-04-02*
