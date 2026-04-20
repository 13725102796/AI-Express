#!/bin/bash
# 紫微灵犀 一键部署脚本
# 用法：
#   ./deploy.sh          # 前后端全部更新
#   ./deploy.sh web      # 只更新前端
#   ./deploy.sh api      # 只更新后端
#   ./deploy.sh api --migrate   # 后端 + 跑 alembic 迁移

set -e

# ===== 配置 =====
SERVER_USER="ubuntu"
SERVER_IP="193.112.131.137"
KEY_PATH="$(cd "$(dirname "$0")" && pwd)/login.pem"
SSH_OPTS="-i $KEY_PATH -o StrictHostKeyChecking=no"

BACKEND_SRC="$(cd "$(dirname "$0")/../../../../紫薇" && pwd)"
FRONTEND_SRC="$(cd "$(dirname "$0")/frontend" && pwd)"

# ===== 颜色输出 =====
C_G='\033[0;32m'; C_Y='\033[1;33m'; C_R='\033[0;31m'; C_N='\033[0m'
info()  { echo -e "${C_G}▸${C_N} $*"; }
warn()  { echo -e "${C_Y}⚠${C_N} $*"; }
die()   { echo -e "${C_R}✗${C_N} $*"; exit 1; }

[ -f "$KEY_PATH" ] || die "SSH 密钥不存在：$KEY_PATH"

TARGET="${1:-all}"
MIGRATE=false
[[ "$*" == *"--migrate"* ]] && MIGRATE=true

# ===== 前端 =====
deploy_web() {
  info "[1/3] 构建 H5"
  cd "$FRONTEND_SRC"
  npm run build:h5 2>&1 | tail -5
  [ -f "dist/build/h5/index.html" ] || die "构建失败：dist/build/h5/index.html 不存在"

  info "[2/3] 上传到服务器 /tmp/ziwei-web-new/"
  rsync -az --delete -e "ssh $SSH_OPTS" \
    dist/build/h5/ "$SERVER_USER@$SERVER_IP:/tmp/ziwei-web-new/"

  info "[3/3] 原子切换 /var/www/html"
  ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" '
    set -e
    sudo rm -rf /var/www/html.old
    sudo mv /var/www/html /var/www/html.old 2>/dev/null || true
    sudo mv /tmp/ziwei-web-new /var/www/html
    sudo chown -R www-data:www-data /var/www/html
  '
  info "前端部署完成 ✓"
}

# ===== 后端 =====
deploy_api() {
  info "[1/4] 上传后端代码"
  rsync -az -e "ssh $SSH_OPTS" \
    --exclude='.venv' --exclude='.venv-py312' --exclude='.pytest_cache' \
    --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' \
    --exclude='tests' --exclude='.DS_Store' \
    "$BACKEND_SRC/" "$SERVER_USER@$SERVER_IP:/home/ubuntu/ziwei/"

  info "[2/4] 安装依赖（如 requirements.txt 变化）"
  ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" '
    cd /home/ubuntu/ziwei
    source .venv/bin/activate
    pip install -q -r requirements.txt 2>&1 | tail -3
  '

  if [ "$MIGRATE" = true ]; then
    info "[3/4] 运行 Alembic 迁移"
    ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" '
      cd /home/ubuntu/ziwei
      source .venv/bin/activate
      alembic upgrade head 2>&1 | tail -5
    '
  else
    info "[3/4] 跳过迁移（加 --migrate 可运行）"
  fi

  info "[4/4] 重启 ziwei 服务"
  ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" '
    sudo systemctl restart ziwei
    sleep 2
    echo -n "服务状态: "
    sudo systemctl is-active ziwei
    echo -n "健康检查: "
    curl -s http://127.0.0.1:8000/health
    echo
  '
  info "后端部署完成 ✓"
}

# ===== 执行 =====
case "$TARGET" in
  web)  deploy_web ;;
  api)  deploy_api ;;
  all)  deploy_web; echo; deploy_api ;;
  *)    die "未知目标：$TARGET（支持 all / web / api）" ;;
esac

echo
info "🎉 部署全部完成，访问 http://$SERVER_IP/"
