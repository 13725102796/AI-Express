# 国内服务器 CI/CD 构建优化

## 问题描述

将 Gitea Actions CI/CD 从阿里云迁移到火山引擎后，构建时间从 1-2 分钟暴增到 10+ 分钟，甚至构建失败。主要表现：

1. **Set up job 卡住 1-10 分钟** — Runner 拉取 GitHub Actions 代码超时
2. **Build and Push 花 8+ 分钟** — 基础镜像和依赖下载慢
3. **Setup Kubectl 花 2+ 分钟** — kubectl 二进制下载超时
4. **构建直接失败** — GitHub 完全不可达时 `actions/checkout` 报错

## 根因分析

国内服务器（火山引擎 ECS）访问外部服务的网络状况：

| 目标 | 延迟 | 可用性 |
|------|------|--------|
| github.com | 超时（90s+） | 基本不通 |
| gitea.com | 超时（5s+） | 不通 |
| dl.k8s.io | 超时 | 时通时不通 |
| docker.io (Docker Hub) | 超时 | 不通 |
| ghfast.top (GitHub 代理) | 0.8s | 可用 |
| mirrors.aliyun.com | <0.1s | 可用 |
| 火山引擎内网 | <1ms | 可用 |

Gitea Actions 的 `uses: actions/checkout@v3` 语法会从 `https://github.com/actions/checkout` 拉取代码，在国内服务器上必然超时。

## 解决方案

### 1. 彻底去除 GitHub Actions 依赖

**核心原则：workflow 里不写任何 `uses:`，全部用 `run:` shell 命令替代。**

```yaml
# 错误做法（依赖 GitHub）
- name: Checkout
  uses: actions/checkout@v3

- name: Login
  uses: docker/login-action@v2

- name: Setup Buildx
  uses: docker/setup-buildx-action@v2

# 正确做法（纯 shell，零外部依赖）
- name: Checkout
  run: |
    git clone --depth=1 --branch=${{ github.ref_name }} https://gitea.airlabs.art/${{ github.repository }}.git .

- name: Login
  run: |
    echo "${{ secrets.CR_PASSWORD }}" | docker login --username "${{ secrets.CR_USERNAME }}" --password-stdin ${{ secrets.CR_SERVER }}

# docker buildx 也不要用（依赖 GitHub 插件），直接用 docker build
- name: Build
  run: |
    docker build --tag xxx . 
    docker push xxx
```

**替代关系表：**

| GitHub Action | 替代命令 | 说明 |
|---|---|---|
| `actions/checkout@v3` | `git clone` 从 Gitea | Gitea 在内网，秒完成 |
| `docker/login-action@v2` | `docker login` | 原生命令 |
| `docker/setup-buildx-action@v2` | 去掉，用 `docker build` | buildx 插件也要从 GitHub 拉 |
| `Azure/k8s-set-context@v3` | 手动写 kubeconfig 文件 | `echo "$KUBE_CONFIG" > ~/.kube/config` |

### 2. Gitea Actions URL 配置（备选方案）

Gitea app.ini 中 `DEFAULT_ACTIONS_URL` 只接受两个值：
- `github` — 默认，从 github.com 拉
- `self` — 从 Gitea 自身拉（需要在 Gitea 上 mirror 对应的 actions 仓库）

**不支持** 自定义代理 URL（如 `https://ghfast.top/https://github.com`），实测不生效。

### 3. Dockerfile 加国内镜像源

```dockerfile
# Python - 阿里云 PyPI
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt

# Node.js - npmmirror
RUN npm config set registry https://registry.npmmirror.com && npm install
```

### 4. kubectl 预装到构建服务器

每次构建都下载 kubectl（48MB）太慢，预装到服务器挂载进去：

```bash
# 在构建服务器上通过阿里云源安装 kubectl
curl -fsSL https://mirrors.aliyun.com/kubernetes-new/core/stable/v1.28/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://mirrors.aliyun.com/kubernetes-new/core/stable/v1.28/deb/ /' > /etc/apt/sources.list.d/kubernetes.list
apt-get update && apt-get install -y kubectl

# 复制到挂载目录
cp $(which kubectl) /opt/gitea/kubectl-bin
```

Runner config.yaml 允许挂载：
```yaml
container:
  valid_volumes:
    - /var/run/docker.sock
    - /opt/gitea/kubectl-bin
```

Workflow 里优先用本地的：
```yaml
- name: Setup Kubectl
  run: |
    cp /opt/gitea/kubectl-bin /usr/local/bin/kubectl 2>/dev/null || \
    curl -sL "https://dl.k8s.io/release/v1.28.2/bin/linux/amd64/kubectl" -o kubectl
    chmod +x kubectl && mv kubectl /usr/local/bin/
```

### 5. Runner 配置优化

```yaml
# /opt/gitea/runner-data/config.yaml
log:
  level: info

runner:
  capacity: 3          # 4核8G 可以 3 并发
  timeout: 3h

cache:
  enabled: true        # 开启构建缓存
  dir: /data/cache

container:
  force_pull: false    # 不要每次重新拉 runner 镜像（2.3GB）
  valid_volumes:
    - /var/run/docker.sock
    - /opt/gitea/kubectl-bin
```

### 6. Docker 镜像加速（构建服务器）

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

### 7. K3s 镜像加速（部署服务器）

```yaml
# /etc/rancher/k3s/registries.yaml
mirrors:
  docker.io:
    endpoint:
      - "https://hub.rat.dev"
      - "https://docker.1ms.run"
```

## 优化效果对比（实测数据）

| 步骤 | 优化前 | 优化后 |
|------|--------|--------|
| Set up job | 1-10min（超时失败） | **0s** |
| Checkout | 超时失败 | **1s** |
| Docker Login | 依赖 GitHub action | **0s** |
| Build & Push API | 8min+ | **2s**（有缓存）/ 1-2min（代码变更） |
| Build & Push Web | 3min+ | **1s**（有缓存）/ 1min（代码变更） |
| Build & Push Monitor | 2min+ | **2s**（有缓存） |
| Setup Kubectl | 2min+（超时） | **0s**（挂载） |
| Deploy to K3s | 正常 | **1s** |
| **总计** | **10-20min 或失败** | **7s（缓存命中）/ 2-3min（正常变更）** |

### 关键踩坑：Runner 的 valid_volumes vs options

`valid_volumes` 只是**允许列表**，不会自动挂载。要真正挂载到构建容器里，必须用 `options` 参数：

```yaml
# 错误理解：以为 valid_volumes 会自动挂载
container:
  valid_volumes:
    - /opt/gitea/kubectl-bin    # 只是允许，不会挂载

# 正确做法：通过 options 的 -v 参数实际挂载
container:
  options: -v /opt/gitea/kubectl-bin:/usr/local/bin/kubectl
  valid_volumes:
    - /var/run/docker.sock      # 允许 docker socket
    - /opt/gitea/kubectl-bin    # 允许 kubectl 挂载
```

### 最终 Runner 配置（验证通过）

```yaml
# /opt/gitea/runner-data/config.yaml
log:
  level: info

runner:
  capacity: 3
  timeout: 3h
  fetch_timeout: 5s
  fetch_interval: 2s

cache:
  enabled: true
  dir: /data/cache

container:
  network: ""
  privileged: false
  options: -v /opt/gitea/kubectl-bin:/usr/local/bin/kubectl
  valid_volumes:
    - /var/run/docker.sock
    - /opt/gitea/kubectl-bin
  docker_host: ""
  force_pull: false

host:
  workdir_parent:
```

### 最终 Workflow 模板（验证通过，7 秒全绿）

```yaml
steps:
  - name: Checkout
    run: |
      git clone --depth=1 --branch=${{ github.ref_name }} https://gitea.airlabs.art/${{ github.repository }}.git .

  - name: Login to CR
    run: |
      echo "${{ secrets.CR_PASSWORD }}" | docker login --username "${{ secrets.CR_USERNAME }}" --password-stdin ${{ secrets.CR_SERVER }}

  - name: Build and Push
    run: |
      docker build --tag ${{ secrets.CR_SERVER }}/${{ env.CR_ORG }}/xxx:latest .
      docker push ${{ secrets.CR_SERVER }}/${{ env.CR_ORG }}/xxx:latest

  - name: Setup Kubectl
    run: kubectl version --client   # 已通过 runner options 挂载

  - name: Set kubeconfig
    run: |
      mkdir -p $HOME/.kube
      echo "${{ secrets.KUBE_CONFIG }}" > $HOME/.kube/config
      chmod 600 $HOME/.kube/config

  - name: Deploy
    run: |
      kubectl apply -f k8s/deployment.yaml
      kubectl rollout restart deployment/xxx
```

## 适用场景

- 国内服务器（阿里云、火山引擎、腾讯云等）运行 Gitea Actions
- 任何 GitHub 不可达的内网环境
- 需要加速 CI/CD 构建的场景

## 关键教训

1. **不要假设 GitHub 可达** — 国内服务器直连 GitHub 极不稳定，CI/CD 不应该依赖 GitHub
2. **`uses:` 语法本质是 `git clone` GitHub 仓库** — 看似简单的一行配置，背后是一次 GitHub 请求
3. **`docker buildx` 也依赖 GitHub** — 它的插件从 GitHub 下载，用原生 `docker build` 更可靠
4. **`DEFAULT_ACTIONS_URL` 不支持代理 URL** — 只接受 `github` 或 `self`，不能用 `https://proxy/https://github.com`
5. **Runner 镜像 2.3GB** — `force_pull: false` 很重要，否则每次构建都重新拉
6. **预装工具比运行时下载可靠** — kubectl 等工具预装到服务器，通过 `options: -v` 挂载进构建容器
7. **`valid_volumes` ≠ 自动挂载** — 它只是允许列表，实际挂载要用 `options: -v`

## 相关项目

- log_center (Gitea Actions CI/CD 迁移到火山引擎)
- 火山引擎 ECS 构建服务器 (14.103.40.129)
- 火山引擎 ECS 测试服务器 K3s (14.103.63.199)
- 火山引擎 ECS 生产服务器 K3s (118.196.0.100)

---
*最后更新: 2026-04-02*
