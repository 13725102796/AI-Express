import io
import os
import time
import tempfile
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ─────────────────────────────────────────────
# 配置（所有文件都在 code/models/TTS/ 下）
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKPOINTS_DIR = os.path.join(BASE_DIR, "index-tts", "checkpoints")
CONFIG_PATH = os.path.join(CHECKPOINTS_DIR, "config.yaml")
VOICE_REF_PATH = os.path.join(BASE_DIR, "voice", "reference.wav")

tts_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_model

    if not os.path.exists(CONFIG_PATH):
        raise RuntimeError(f"模型文件不存在：{CONFIG_PATH}\n请先执行 git lfs pull。")
    if not os.path.exists(VOICE_REF_PATH):
        print(f"[TTS] ⚠ 参考音频不存在：{VOICE_REF_PATH}，首次需准备参考音频。")

    print("[TTS] 加载 IndexTTS-2 模型...")
    from indextts.infer_v2 import IndexTTS2

    tts_model = IndexTTS2(
        cfg_path=CONFIG_PATH,
        model_dir=CHECKPOINTS_DIR,
        use_fp16=False,  # MPS 不支持 fp16
    )

    # 预热
    print("[TTS] 预热中（约 10-20 秒）...")
    try:
        _warmup()
    except Exception as e:
        print(f"[TTS] 预热跳过（参考音频可能未准备）：{e}")
    print("[TTS] 就绪，端口 8002")

    yield

    del tts_model
    print("[TTS] 服务已关闭")


app = FastAPI(title="留白 TTS 服务", lifespan=lifespan)


class SynthesizeRequest(BaseModel):
    text: str
    emotion: Optional[str] = ""


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    if tts_model is None:
        raise HTTPException(status_code=503, detail="模型未就绪")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")
    if not os.path.exists(VOICE_REF_PATH):
        raise HTTPException(status_code=400, detail="参考音频不存在，请先准备 voice/reference.wav")

    t0 = time.time()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        output_path = f.name

    try:
        kwargs = dict(
            spk_audio_prompt=VOICE_REF_PATH,
            text=req.text,
            output_path=output_path,
        )
        # IndexTTS-2 用 emo_text 做文字情感描述
        if req.emotion:
            kwargs["emo_text"] = req.emotion

        tts_model.infer(**kwargs)

        with open(output_path, "rb") as f:
            audio_bytes = f.read()

        elapsed = round((time.time() - t0) * 1000)
        print(f"[TTS] {elapsed}ms  ←  {req.text[:40]}")

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={"X-Synthesis-Time": str(elapsed)},
        )
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


@app.get("/health")
async def health():
    return {"status": "ok", "model": "IndexTTS-2"}


def _warmup():
    if not os.path.exists(VOICE_REF_PATH):
        return
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        path = f.name
    try:
        tts_model.infer(
            spk_audio_prompt=VOICE_REF_PATH,
            text="好的",
            output_path=path,
        )
    finally:
        if os.path.exists(path):
            os.unlink(path)
