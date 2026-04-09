import os
import sys
import time
import numpy as np
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# MPS float64 fallback（必须在 import torch 之前设置）
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

# CosyVoice 源码路径
COSYVOICE_SRC = os.path.join(os.path.dirname(__file__), "cosyvoice-src")
sys.path.insert(0, COSYVOICE_SRC)
sys.path.insert(0, os.path.join(COSYVOICE_SRC, "third_party", "Matcha-TTS"))

MODEL_DIR = os.path.join(os.path.dirname(__file__), "cosyvoice3-model")
VOICE_REF = os.path.join(os.path.dirname(__file__), "voice", "reference.wav")

tts_model = None
sample_rate = 24000


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_model, sample_rate

    if not os.path.exists(os.path.join(MODEL_DIR, "cosyvoice3.yaml")):
        raise RuntimeError(f"模型文件不存在：{MODEL_DIR}/cosyvoice3.yaml")

    print(f"[TTS] 加载 CosyVoice3 模型 ({MODEL_DIR}) ...")
    from cosyvoice.cli.cosyvoice import CosyVoice3
    tts_model = CosyVoice3(MODEL_DIR)
    sample_rate = tts_model.sample_rate
    print(f"[TTS] 采样率: {sample_rate}, 设备: {tts_model.model.device}")

    if os.path.exists(VOICE_REF):
        # 预缓存参考音频的 embedding + speech_feat（ONNX CPU 操作，约 1s）
        t0 = time.time()
        frontend = tts_model.frontend
        _cached = {}
        _cached['speech_feat'], _cached['speech_feat_len'] = frontend._extract_speech_feat(VOICE_REF)
        _cached['embedding'] = frontend._extract_spk_embedding(VOICE_REF)
        _cached['speech_token'], _cached['speech_token_len'] = frontend._extract_speech_token(VOICE_REF)
        # cosyvoice3 要求 speech_feat 和 speech_token 对齐
        token_len = min(int(_cached['speech_feat'].shape[1] / 2), _cached['speech_token'].shape[1])
        _cached['speech_feat'] = _cached['speech_feat'][:, :2 * token_len]
        _cached['speech_feat_len'][:] = 2 * token_len
        _cached['speech_token'] = _cached['speech_token'][:, :token_len]
        _cached['speech_token_len'][:] = token_len
        app.state.ref_cache = _cached
        elapsed = round((time.time() - t0) * 1000)
        print(f"[TTS] 参考音频已缓存 ({elapsed}ms)")
    else:
        app.state.ref_cache = None
        print(f"[TTS] ⚠ 参考音频不存在: {VOICE_REF}")

    print("[TTS] 就绪，端口 8002")
    yield
    del tts_model
    print("[TTS] 服务已关闭")


app = FastAPI(title="留白 TTS 服务", lifespan=lifespan)


class SynthesizeRequest(BaseModel):
    text: str
    emotion: Optional[str] = ""


def _build_model_input(text: str, instruct: str):
    """构造模型输入，使用缓存的参考音频特征（跳过重复 ONNX 提取）"""
    frontend = tts_model.frontend
    tts_text_token, tts_text_token_len = frontend._extract_text_token(text)
    instruct_token, instruct_token_len = frontend._extract_text_token(instruct)

    cache = app.state.ref_cache
    if cache is not None:
        model_input = {
            'text': tts_text_token,
            'text_len': tts_text_token_len,
            'prompt_text': instruct_token,
            'prompt_text_len': instruct_token_len,
            'flow_prompt_speech_token': cache['speech_token'],
            'flow_prompt_speech_token_len': cache['speech_token_len'],
            'prompt_speech_feat': cache['speech_feat'],
            'prompt_speech_feat_len': cache['speech_feat_len'],
            'llm_embedding': cache['embedding'],
            'flow_embedding': cache['embedding'],
        }
    else:
        # fallback：从文件提取
        model_input = frontend.frontend_instruct2(
            text, instruct, VOICE_REF, tts_model.sample_rate, ''
        )
    return model_input


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    if tts_model is None:
        raise HTTPException(status_code=503, detail="模型未就绪")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")

    t0 = time.time()
    text = req.text.strip()

    # 构造情感指令
    if req.emotion:
        instruct = f"You are a helpful assistant. {req.emotion}<|endofprompt|>"
    else:
        instruct = "You are a helpful assistant. 用平静温和的声音说话<|endofprompt|>"

    def generate_pcm():
        chunk_count = 0
        # 直接用 text_normalize 拆句，然后手动构造 model_input
        for sentence in tts_model.frontend.text_normalize(text, split=True, text_frontend=True):
            model_input = _build_model_input(sentence, instruct)
            for chunk in tts_model.model.tts(**model_input, stream=True, speed=1.0):
                pcm_tensor = chunk["tts_speech"].squeeze()
                pcm_int16 = (pcm_tensor.cpu().numpy() * 32767).astype(np.int16)
                chunk_count += 1
                if chunk_count == 1:
                    elapsed = round((time.time() - t0) * 1000)
                    print(f"[TTS] 首块 {elapsed}ms  ←  {text[:30]}")
                yield pcm_int16.tobytes()

        elapsed = round((time.time() - t0) * 1000)
        print(f"[TTS] 完成 {elapsed}ms  {chunk_count}块  ←  {text[:30]}")

    return StreamingResponse(
        generate_pcm(),
        media_type="audio/pcm",
        headers={
            "X-Sample-Rate": str(sample_rate),
            "X-Channels": "1",
            "X-Bit-Depth": "16",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": "CosyVoice3-0.5B", "sample_rate": sample_rate}
