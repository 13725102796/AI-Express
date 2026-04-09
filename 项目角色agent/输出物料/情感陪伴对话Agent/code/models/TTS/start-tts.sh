#!/bin/bash
# 留白 TTS 服务启动脚本（CosyVoice3）
export PATH="/opt/homebrew/bin:$PATH"

eval "$(/opt/anaconda3/bin/conda shell.bash hook)"
conda activate liminal-tts

TTS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================================"
echo " 留白 TTS 服务启动中"
echo " 模型：CosyVoice3-0.5B (CPU/MPS)"
echo " 端口：8002"
echo "================================================"

cd "$TTS_DIR"
export PYTHONPATH="$TTS_DIR/cosyvoice-src:$TTS_DIR/cosyvoice-src/third_party/Matcha-TTS"
# float64 操作自动 fallback 到 CPU，其余走 MPS GPU 加速
export PYTORCH_ENABLE_MPS_FALLBACK=1
uvicorn main:app \
  --host 0.0.0.0 \
  --port 8002 \
  --workers 1 \
  --log-level info
