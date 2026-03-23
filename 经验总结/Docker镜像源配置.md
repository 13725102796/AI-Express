# Docker镜像源配置

## 问题描述

在 CI/CD 流水线（Gitea Actions）中构建 Docker 镜像时，`apt-get update` 和 `pip install` 命令因网络问题失败，报错：

```
E: Unable to locate package gcc
ERROR: failed to build: process "/bin/sh -c apt-get update && apt-get install -y ..." did not complete successfully: exit code: 100
```

根本原因是 CI 环境在国内网络，无法访问 Debian、PyPI、npm 官方源。

## 根因分析

- `python:3.12-slim` 基础镜像默认使用 `deb.debian.org` 作为 apt 源
- `pip install` 默认使用 `pypi.org`
- `npm ci` 默认使用 `registry.npmjs.org`
- 国内 CI 环境（如自建 Gitea Actions Runner）访问这些海外源不稳定，经常超时或连接失败

## 解决方案

### 1. 后端 Dockerfile（Python + Debian）

将 apt 源替换为阿里云镜像，pip 源替换为阿里云 PyPI 镜像：

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# System dependencies (Aliyun mirror for China)
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt
```

**注意事项：**
- `python:3.12-slim` 基于 Debian Bookworm，apt 源配置文件位于 `/etc/apt/sources.list.d/debian.sources`（不是旧版的 `/etc/apt/sources.list`）
- 如果项目不依赖 MySQL，不要安装 `default-libmysqlclient-dev` 和 `pkg-config`（SQLite 项目只需 `gcc`）

### 2. 前端 Dockerfile（Node + Alpine）

将 npm 源替换为 npmmirror：

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com && npm ci
COPY . .
RUN npm run build
```

### 3. Docker Buildx 镜像加速（CI/CD workflow）

在 CI/CD 的 `docker/setup-buildx-action` 步骤中配置 Docker Hub 镜像代理：

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v2
  with:
    config-inline: |
      [registry."docker.io"]
        mirrors = ["https://docker.m.daocloud.io", "https://docker.1panel.live", "https://hub.rat.dev"]
```

## 适用场景

- 自建 CI/CD 环境（Gitea Actions、Jenkins 等）在国内网络构建 Docker 镜像
- 任何使用 Debian/Ubuntu 基础镜像 + pip/npm 的 Dockerfile
- 阿里云、腾讯云、华为云等国内云环境中的容器构建

## 常用国内镜像源汇总

| 源类型 | 镜像地址 |
|--------|----------|
| Debian apt | `mirrors.aliyun.com` |
| PyPI pip | `https://mirrors.aliyun.com/pypi/simple/` |
| npm | `https://registry.npmmirror.com` |
| Docker Hub | `https://docker.m.daocloud.io` |

## 相关项目

- **jimeng-clone** (`视频生成平台/jimeng-clone/backend/Dockerfile`) — 首次配置阿里云镜像源的参考项目
- **AirGate** (`视频生成平台/AirGate/backend/Dockerfile`) — 因缺少镜像源配置导致 CI 构建失败，参考 jimeng-clone 修复

---
*最后更新: 2026-03-23*
