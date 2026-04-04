.PHONY: install dev backend frontend clean

# 安装依赖
install:
	cd backend && pip install -e .
	cd frontend && pnpm install

# 开发模式启动（后端 + 前端）
dev:
	@echo "启动后端 Gateway (http://localhost:8001)..."
	@cd backend && uvicorn app.gateway.main:app --reload --port 8001 &
	@echo "启动前端 (http://localhost:3000)..."
	@cd frontend && pnpm dev &
	@echo "全部启动完成。访问 http://localhost:3000"
	@wait

# 仅启动后端
backend:
	cd backend && uvicorn app.gateway.main:app --reload --port 8001

# 仅启动前端
frontend:
	cd frontend && pnpm dev

# 清理
clean:
	rm -rf backend/__pycache__ backend/*.egg-info
	rm -rf frontend/.next frontend/node_modules
