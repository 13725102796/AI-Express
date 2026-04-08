#!/bin/bash
# 留白 TTS 服务启动脚本
export PATH="/opt/homebrew/bin:$PATH"

TTS_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$TTS_DIR/index-tts/.venv/bin/python"

echo "================================================"
echo " 留白 TTS 服务启动中"
echo " 模型：IndexTTS-2 (MPS)"
echo " 端口：8002"
echo "================================================"

cd "$TTS_DIR"

# 用 index-tts 的 uv venv 里的 python（含所有依赖）
"$VENV" -m uvicorn main:app \
  --host 0.0.0.0 \
  --port 8002 \
  --workers 1 \
  --log-level info
