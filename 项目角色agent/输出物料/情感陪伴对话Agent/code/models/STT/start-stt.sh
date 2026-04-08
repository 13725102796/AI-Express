#!/bin/bash
# 留白 STT 服务启动脚本
export PATH="/opt/homebrew/bin:$PATH"

eval "$(/opt/anaconda3/bin/conda shell.bash hook)"
conda activate liminal-stt

echo "================================================"
echo " 留白 STT 服务启动中"
echo " 模型：Qwen3-ASR-1.7B (MLX, bf16)"
echo " 端口：8001"
echo "================================================"

cd ~/liminal/stt
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8001 \
  --workers 1 \
  --log-level info
