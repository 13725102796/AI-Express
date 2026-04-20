FROM python:3.12-slim

WORKDIR /app

# 系统依赖（cryptography / asyncpg 编译）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libffi-dev libssl-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python -m ziwei_app.seeds.init_seeds && uvicorn app:app --host 0.0.0.0 --port 8000"]
