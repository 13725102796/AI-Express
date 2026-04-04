# K3s 生产环境部署与排错

## 一、cert-manager HTTPS 证书签发失败

### 问题描述

K3s + Traefik + cert-manager 部署后，Let's Encrypt 证书签发失败：
- 一个域名验证通过（valid），另一个失败（errored）
- 错误信息：`Waiting for HTTP-01 challenge propagation: did not get expected response when querying endpoint`
- 验证请求返回了网页 HTML 而不是 ACME challenge token

### 根因分析

cert-manager 创建的 HTTP-01 solver Ingress 没有 `kubernetes.io/ingress.class: traefik` 注解，导致 Traefik 不识别它。所有请求都被 `log-center-ingress`（`pathType: Prefix`，`path: /`）吃掉，包括 `/.well-known/acme-challenge/` 路径。

### 解决方案

给 cert-manager 自动创建的 solver ingress 手动加上 traefik class：

```bash
# 查看 solver ingress
kubectl get ingress -A

# 加上 traefik class
kubectl annotate ingress cm-acme-http-solver-xxxxx kubernetes.io/ingress.class=traefik --overwrite
```

之后 challenge 立即变为 valid，证书签发成功。

### 根本解决（避免每次都手动）

在 ClusterIssuer 中指定 solver 的 ingress class：

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@airlabs.art
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: traefik    # 这一行确保 solver ingress 带上 traefik class
```

### 适用场景

- K3s + Traefik + cert-manager 组合
- 多个 Ingress 规则时 cert-manager HTTP-01 验证失败
- 证书 challenge 状态为 `errored` 且报 `unexpected response`

---

## 二、Kubeconfig Secret 格式损坏

### 问题描述

CI/CD Deploy to K3s 步骤报错：
```
error: tls: failed to find any PEM data in key input
```

### 根因分析

Gitea Secret 粘贴 kubeconfig 时格式被破坏（多了空格、换行被吞等）。

### 解决方案

1. 从服务器重新获取 kubeconfig：
```bash
cat /etc/rancher/k3s/k3s.yaml | sed "s|127.0.0.1|内网IP|g"
```
2. 删掉 Gitea Secret，重新添加，确保完整粘贴无多余空格

---

## 三、PostgreSQL 迁移到 MySQL

### 问题描述

项目原来用阿里云 PostgreSQL，迁移到火山引擎后改用 MySQL。

### 改动量（使用 SQLModel/SQLAlchemy ORM 的项目）

| 文件 | 改动 |
|------|------|
| `requirements.txt` | `asyncpg`/`psycopg2-binary` → `aiomysql`/`pymysql` |
| `database.py` | 连接字符串 `postgresql+asyncpg://` → `mysql+aiomysql://...?charset=utf8mb4` |
| `database.py` | 默认端口 `5432` → `3306` |
| `database.py` | Migration SQL 语法（`ALTER COLUMN ... DROP NOT NULL` → `MODIFY COLUMN ... NULL`） |
| `main.py` | JSONB 查询 `@> '...'::jsonb` → `JSON_CONTAINS(...)` |

### 数据迁移步骤

```bash
# 1. PostgreSQL 导出 CSV
psql -h old-host -U user -d db -c "\copy (SELECT * FROM table) TO '/tmp/table.csv' WITH CSV HEADER"

# 2. Python 脚本导入 MySQL
# 注意：TEXT 字段数据太大时需改为 LONGTEXT
# 注意：boolean 字段 PostgreSQL 用 't'/'f'，需转换
```

### 踩坑

- PostgreSQL `TEXT` 默认无限长，MySQL `TEXT` 有 64KB 限制，大字段需要用 `LONGTEXT`
- PostgreSQL boolean 导出为 `t`/`f`，导入 MySQL 时需要 `row['field'] == 't'`
- MySQL 导入时必须指定 `--default-character-set=utf8mb4` 否则中文乱码

---

## 四、镜像版本标签规范

### 企业级做法

```
环境-日期-commitHash
```

示例：
```
dev-20260402-8920dad    ← 测试环境
prod-20260402-8920dad   ← 生产环境
latest                  ← 始终指向最新
```

### Workflow 实现

```yaml
- name: Set environment
  run: |
    SHORT_SHA=$(echo "${{ github.sha }}" | cut -c1-7)
    BUILD_DATE=$(date +%Y%m%d)
    echo "IMAGE_TAG=dev-${BUILD_DATE}-${SHORT_SHA}" >> $GITHUB_ENV

- name: Build and Push
  run: |
    docker build \
      --tag registry/org/app:${{ env.IMAGE_TAG }} \
      --tag registry/org/app:latest .
    docker push registry/org/app:${{ env.IMAGE_TAG }}
    docker push registry/org/app:latest
```

### K8s 部署用版本标签

```yaml
# sed 替换时用版本标签而非 latest
sed -i "s|placeholder|registry/org/app:${{ env.IMAGE_TAG }}|g" k8s/deployment.yaml
```

### 紧急回滚

```bash
kubectl set image deployment/app container=registry/org/app:dev-20260401-abc1234
```

---

## 五、泛域名 DNS 解析

### 需求

测试环境域名不想每个都配 DNS。

### DNS 通配符限制

- `*.airlabs.art` ✅ — 匹配所有二级域名
- `*.test.airlabs.art` ✅ — 匹配所有三级域名
- `*-test.airlabs.art` ❌ — DNS 不支持通配符在中间

### 推荐方案

| DNS 记录 | 指向 | 说明 |
|---------|------|------|
| `*.test` → 测试服 IP | 泛解析 | 所有测试域名自动生效 |
| 精确记录 → 生产服 IP | 单独配 | 生产域名优先匹配 |

域名规划：
- 测试：`xxx.test.airlabs.art`（自动解析，不用配 DNS）
- 生产：`xxx.airlabs.art`（单独配）

---

## 六、火山引擎 CR 小微版限制

| 功能 | 支持情况 |
|------|---------|
| Docker push/pull | ✅ |
| 命名空间 | 5 个 |
| 镜像仓库 | 300 个 |
| 每仓库版本数 | 100 个 |
| Registry API 删除镜像 | ❌ 不支持 |
| Harbor 管理 API | ❌ 不开放 |
| skopeo delete | ❌ 认证失败 |
| 控制台手动删除 | ✅ |
| 自动清理策略 | ❌ 需升级标准版 |
| 火山引擎 OpenAPI 删除 | ✅ 需 AK/SK 签名认证 |

如果需要自动清理旧镜像，要么升级标准版，要么用火山引擎 OpenAPI（需要 Access Key）。

---

## 七、服务器总览

| 服务器 | 公网 IP | 私网 IP | 角色 | 配置 |
|--------|---------|---------|------|------|
| 构建服务器 | 14.103.40.129 | 192.168.0.128 | Gitea + CI/CD | 4核8G |
| 测试服务器 | 14.103.63.199 | 192.168.0.129 | K3s 测试环境 | 4核16G |
| 生产服务器 | 118.196.0.100 | 192.168.0.130 | K3s 生产环境 | 4核8G |
| 测试数据库 | - | 192.168.0.131 | MySQL 8 (RDS) | 1核2G |

## 相关项目

- log_center (全栈迁移：阿里云 → 火山引擎)
- Gitea Actions CI/CD 流水线

---
*最后更新: 2026-04-02*
