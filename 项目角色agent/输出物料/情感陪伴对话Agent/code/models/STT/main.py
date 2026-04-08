import os
import time
import tempfile
from contextlib import asynccontextmanager

import mlx.core as mx
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydub import AudioSegment

# ── 补丁：mlx-community 版本已是 MLX 格式，lm_head.weight 通过 weight-tying
# 共享 embed_tokens.weight，不单独存储。remap_weights 需手动补上。──
import mlx_qwen3_asr.load_models as _loader
import mlx_qwen3_asr.convert as _convert
_orig_remap = _convert.remap_weights

def _patched_remap(weights):
    remapped = _orig_remap(weights)
    # mlx-community 版本已是 MLX 格式，lm_head.weight 与 embed_tokens.weight weight-tied
    if "lm_head.weight" not in remapped and "model.embed_tokens.weight" in remapped:
        remapped["lm_head.weight"] = remapped["model.embed_tokens.weight"]
    return remapped

# 需打在 load_models 的本地引用上（from .convert import remap_weights 产生的副本）
_loader.remap_weights = _patched_remap

MODEL_PATH = os.path.dirname(os.path.abspath(__file__))  # 模型文件与 main.py 同目录

# ─────────────────────────────────────────────
# 全局模型对象（常驻内存，无需每次请求重载）
# ─────────────────────────────────────────────
asr_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global asr_model
    print(f"[STT] 加载模型 {MODEL_PATH} ...")

    from mlx_qwen3_asr import transcribe as _transcribe

    # 预热：首次 transcribe 会自动加载模型进 _ModelHolder 内部 cache，
    # 后续所有请求复用同一份，不会重复加载。
    print("[STT] 预热中（约 10-15 秒）...")
    warmup_path = _create_silent_wav(duration_ms=500)
    try:
        _transcribe(warmup_path, model=MODEL_PATH, language="zh")
    finally:
        os.unlink(warmup_path)

    # 释放加载过程中的临时缓存（bf16→fp16 转换残留）
    import gc
    gc.collect()
    mx.metal.clear_cache()

    asr_model = True  # 标记就绪
    print("[STT] 就绪，端口 8001")

    yield

    asr_model = None
    print("[STT] 服务已关闭")


app = FastAPI(title="留白 STT 服务", lifespan=lifespan)


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if asr_model is None:
        raise HTTPException(status_code=503, detail="模型未就绪")

    from mlx_qwen3_asr import transcribe as _transcribe

    t0 = time.time()
    audio_bytes = await file.read()
    fmt = _guess_format(file.filename or "", file.content_type or "")

    # webm/ogg 等浏览器格式需转 wav，其他格式直接传给模型（内部自动处理）
    if fmt in ("webm", "ogg"):
        wav_path = _convert_to_wav(audio_bytes, fmt)
    else:
        with tempfile.NamedTemporaryFile(suffix=f".{fmt}", delete=False) as f:
            f.write(audio_bytes)
            wav_path = f.name

    try:
        result = _transcribe(wav_path, model=MODEL_PATH, language="zh")
        elapsed = round((time.time() - t0) * 1000)
        print(f"[STT] {elapsed}ms  →  {result.text[:50]}")
        return {"text": result.text, "duration_ms": elapsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(wav_path):
            os.unlink(wav_path)


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_PATH}


# ─────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────
def _convert_to_wav(audio_bytes: bytes, fmt: str) -> str:
    with tempfile.NamedTemporaryFile(suffix=f".{fmt}", delete=False) as f:
        f.write(audio_bytes)
        src_path = f.name

    dst_path = None
    try:
        audio = AudioSegment.from_file(src_path, format=fmt)
        audio = audio.set_frame_rate(16000).set_channels(1)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            dst_path = f.name
        audio.export(dst_path, format="wav")
        return dst_path
    finally:
        if os.path.exists(src_path):
            os.unlink(src_path)


def _guess_format(filename: str, content_type: str) -> str:
    if "webm" in content_type or filename.endswith(".webm"):
        return "webm"
    if "mp4" in content_type or filename.endswith(".m4a"):
        return "mp4"
    if "mpeg" in content_type or filename.endswith(".mp3"):
        return "mp3"
    if "ogg" in content_type or filename.endswith(".ogg"):
        return "ogg"
    return "wav"


def _create_silent_wav(duration_ms: int = 500) -> str:
    silent = AudioSegment.silent(duration=duration_ms, frame_rate=16000)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        path = f.name
    silent.export(path, format="wav")
    return path
