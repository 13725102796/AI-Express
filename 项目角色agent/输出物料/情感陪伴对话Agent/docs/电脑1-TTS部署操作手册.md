# 电脑1 · TTS 语音合成服务部署手册

> 服务：Index-TTS 1.5（Bilibili Index 团队）
> 设备：Windows + RTX 5070 Ti 16GB + 64GB RAM
> 端口：8002
> 预计耗时：30 分钟（含模型下载 ~3GB）

---

## 重要提醒

⚠️ RTX 5070 Ti 是 Blackwell 架构（sm_120），**必须用 PyTorch nightly 版本**，稳定版不支持。本手册已处理这个问题，按步骤走即可。

---

## 第一步：确认显卡驱动

打开 PowerShell，输入：

```powershell
nvidia-smi
```

确认：
- Driver Version ≥ 572
- 能看到 RTX 5070 Ti

❌ 不满足？先按 LLM 部署手册第一步更新驱动。

---

## 第二步：安装 Git LFS

Index-TTS 的模型文件需要 Git LFS。

```powershell
# 检查是否已安装
git lfs version
```

如果报错说找不到命令，去这里下载安装：
**https://git-lfs.com/**

安装完后执行：

```powershell
git lfs install
```

---

## 第三步：安装 uv（Python 包管理器）

Index-TTS 官方用 `uv` 管理依赖（不用 conda/pip）。

```powershell
# 安装 uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

安装完**关闭 PowerShell 重新打开**，然后验证：

```powershell
uv --version
```

能看到版本号就OK。

---

## 第四步：克隆项目

```powershell
cd D:\
git clone https://github.com/index-tts/index-tts.git
cd D:\index-tts
git lfs pull
```

等待完成，确认 `D:\index-tts` 文件夹存在。

---

## 第五步：安装依赖

```powershell
cd D:\index-tts
uv sync --all-extras
```

这一步会自动创建虚拟环境并安装所有依赖，耐心等待（约5分钟）。

---

## 第六步：替换 PyTorch 为 nightly 版本（关键！）

稳定版 PyTorch 不支持 5070 Ti，必须换成 nightly：

```powershell
cd D:\index-tts
uv pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu129
```

等待安装完成（约2-3分钟）。

### 验证 GPU 是否可用

```powershell
cd D:\index-tts
uv run python -c "import torch; print('CUDA可用:', torch.cuda.is_available()); print('显卡:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else '无')"
```

✅ 应该输出：
```
CUDA可用: True
显卡: NVIDIA GeForce RTX 5070 Ti
```

❌ 如果 CUDA 不可用：
1. 确认驱动版本 ≥ 572
2. 重新执行第六步
3. 如果还不行，尝试：`uv pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128`

也可以用官方检测脚本：

```powershell
uv run python tools/gpu_check.py
```

---

## 第七步：下载模型

```powershell
cd D:\index-tts

# 安装下载工具
uv tool install "huggingface-hub[cli,hf_xet]"

# 国内网络先设镜像（可选，翻墙了就跳过）
$env:HF_ENDPOINT = "https://hf-mirror.com"

# 下载模型到 checkpoints 文件夹（约 3GB）
hf download IndexTeam/IndexTTS-1.5 --local-dir=checkpoints
```

下载完成后，`D:\index-tts\checkpoints\` 里应该有这些文件：

```
checkpoints/
├── config.yaml
├── bigvgan_discriminator.pth
├── bigvgan_generator.pth
├── bpe.model
├── dvae.pth
├── gpt.pth
└── unigram_12000.vocab
```

---

## 第八步：快速测试（用自带 WebUI）

Index-TTS 自带 Gradio 网页界面，先用这个测试：

```powershell
cd D:\index-tts
uv run webui.py --fp16
```

> `--fp16` 开启半精度推理，显存占用更少，速度更快

等待启动完成，看到类似输出：

```
Running on local URL: http://127.0.0.1:7860
```

打开浏览器访问 **http://127.0.0.1:7860**

在网页上：
1. **上传参考音频**（2-10 秒的 WAV，用来确定音色）
2. **输入要合成的文字**
3. 点击 **合成/Generate**
4. 听效果

✅ 能正常合成语音 → 模型没问题，继续下一步部署 API 服务
❌ 报错 → 看「排查清单」章节

测试完后按 `Ctrl+C` 关闭 WebUI。

---

## 第九步：准备参考音频

```powershell
mkdir D:\index-tts\voice
```

将你录制的参考音频复制到 `D:\index-tts\voice\reference.wav`

参考音频要求：
- 时长：2-10 秒
- 格式：WAV
- 内容：朗读任意中文句子，发音清晰，背景安静

---

## 第十步：创建 API 服务

用记事本新建文件 `D:\index-tts\tts_server.py`，把下面内容**完整复制进去**：

```python
"""
留白 TTS API 服务
基于 Index-TTS 1.5 + FastAPI
端口：8002
"""

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
# 配置（按实际路径修改）
# ─────────────────────────────────────────────
MODEL_DIR      = r"D:\index-tts\checkpoints"
CONFIG_PATH    = os.path.join(MODEL_DIR, "config.yaml")
VOICE_REF_PATH = r"D:\index-tts\voice\reference.wav"

# ─────────────────────────────────────────────
# 全局模型
# ─────────────────────────────────────────────
tts_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global tts_model

    if not os.path.exists(CONFIG_PATH):
        raise RuntimeError(f"模型文件不存在：{CONFIG_PATH}\n请先执行模型下载步骤。")
    if not os.path.exists(VOICE_REF_PATH):
        raise RuntimeError(f"参考音频不存在：{VOICE_REF_PATH}\n请先准备参考音频。")

    print("[TTS] 加载 Index-TTS 1.5 模型...")
    from indextts.infer import IndexTTS

    tts_model = IndexTTS(
        model_dir=MODEL_DIR,
        cfg_path=CONFIG_PATH,
    )

    # 预热
    print("[TTS] 预热中（约 10-20 秒）...")
    _warmup()
    print("[TTS] 就绪，端口 8002")

    yield

    del tts_model
    print("[TTS] 服务已关闭")


app = FastAPI(title="留白 TTS 服务", lifespan=lifespan)


# ─────────────────────────────────────────────
# 接口：POST /synthesize
# ─────────────────────────────────────────────
class SynthesizeRequest(BaseModel):
    text: str
    emotion: Optional[str] = ""


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    if tts_model is None:
        raise HTTPException(status_code=503, detail="模型未就绪")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")

    t0 = time.time()

    # 如果有情绪描述，拼到文字前面作为提示
    synth_text = req.text
    if req.emotion:
        synth_text = f"[{req.emotion}]{req.text}"

    sentences = _split_sentences(synth_text)
    audio_segments = []

    for sentence in sentences:
        if not sentence.strip():
            continue
        seg_audio = _synthesize_one(sentence)
        audio_segments.append(seg_audio)

    combined = _concat_wav_bytes(audio_segments)
    elapsed = round((time.time() - t0) * 1000)
    print(f"[TTS] {elapsed}ms  ←  {req.text[:40]}")

    return StreamingResponse(
        io.BytesIO(combined),
        media_type="audio/wav",
        headers={"X-Synthesis-Time": str(elapsed)},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": "Index-TTS-1.5", "device": "cuda"}


# ─────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────
def _synthesize_one(text: str) -> bytes:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        output_path = f.name
    try:
        tts_model.infer(
            audio_prompt=VOICE_REF_PATH,
            text=text,
            output_path=output_path,
        )
        with open(output_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


def _split_sentences(text: str) -> list[str]:
    import re
    parts = re.split(r"(?<=[。！？…，、；])", text)
    merged, buf = [], ""
    for p in parts:
        buf += p
        if len(buf) >= 10:
            merged.append(buf)
            buf = ""
    if buf:
        merged.append(buf)
    return merged if merged else [text]


def _concat_wav_bytes(segments: list[bytes]) -> bytes:
    import wave
    if len(segments) == 1:
        return segments[0]
    output_buf = io.BytesIO()
    with wave.open(output_buf, "wb") as out_wf:
        for i, seg in enumerate(segments):
            with wave.open(io.BytesIO(seg), "rb") as in_wf:
                if i == 0:
                    out_wf.setparams(in_wf.getparams())
                out_wf.writeframes(in_wf.readframes(in_wf.getnframes()))
    return output_buf.getvalue()


def _warmup():
    try:
        _synthesize_one("好的")
    except Exception as e:
        print(f"[TTS] 预热失败（不影响服务）：{e}")
```

---

## 第十一步：安装 API 服务依赖

```powershell
cd D:\index-tts
uv pip install fastapi uvicorn[standard]
```

---

## 第十二步：创建启动脚本

在 `D:\index-tts\` 文件夹里新建文件 `start-tts.bat`，内容如下：

```bat
@echo off
echo ================================================
echo  留白 TTS 服务启动中
echo  模型：Index-TTS 1.5 (CUDA FP16)
echo  端口：8002
echo ================================================

cd /d D:\index-tts
uv run uvicorn tts_server:app --host 0.0.0.0 --port 8002 --workers 1 --log-level info

pause
```

---

## 第十三步：启动服务

**双击 `D:\index-tts\start-tts.bat`**

看到以下日志说明服务就绪：

```
[TTS] 加载 Index-TTS 1.5 模型...
[TTS] 预热中（约 10-20 秒）...
[TTS] 就绪，端口 8002
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8002
```

---

## 第十四步：验证 API

打开另一个 PowerShell 窗口：

```powershell
# 合成测试
curl -X POST http://localhost:8002/synthesize `
  -H "Content-Type: application/json" `
  -d '{\"text\": \"嗯，我在。不想说就不说。\", \"emotion\": \"\"}' `
  --output C:\Users\$env:USERNAME\Desktop\test_tts.wav
```

桌面上会出现 `test_tts.wav`，双击播放听效果。

或者用浏览器访问 **http://localhost:8002/health** ，看到 `{"status":"ok"}` 就表示服务正常。

---

## 第十五步：局域网访问配置

如果 Mac（电脑2）需要调用这台电脑的 TTS 服务：

1. 查看本机 IP：
```powershell
ipconfig | findstr "IPv4"
```
记下局域网 IP，例如 `192.168.1.100`

2. Mac 上测试：
```bash
curl http://192.168.1.100:8002/health
```

3. 如果访问不通，需要开放 Windows 防火墙：
```powershell
# 以管理员身份运行 PowerShell
New-NetFirewallRule -DisplayName "TTS Service 8002" -Direction Inbound -Port 8002 -Protocol TCP -Action Allow
```

---

## 性能预估（RTX 5070 Ti + CUDA FP16）

| 文字长度 | 预期耗时 | 对比 Mac M1 Max |
|---------|---------|----------------|
| 5 字以内 | ~300ms | 快 2-3 倍 |
| 10-20 字 | ~500ms | 快 2-3 倍 |
| 30-50 字 | ~800ms | 快 2-3 倍 |
| 50 字以上 | ~1200ms | 快 2-3 倍 |

> CUDA FP16 比 MPS FP32 快很多，这是换到 5070 Ti 的核心收益。

---

## 与 LLM 服务共存说明

这台电脑同时跑 LLM（llama.cpp）和 TTS：

| 服务 | 显存占用 | 端口 |
|------|---------|------|
| LLM（Gemma 26B Q3） | ~8-10 GB | 8080 |
| TTS（Index-TTS 1.5 FP16） | ~2-3 GB | 8002 |
| **合计** | **~10-13 GB** | — |

RTX 5070 Ti 有 16GB 显存，**够用**。但如果显存不够（报 CUDA OOM），可以：
1. 先确保 LLM 服务已启动并稳定
2. 再启动 TTS 服务
3. 如果还是不够，LLM 换用更小的量化版本

---

## 排查清单

| 现象 | 原因 | 处理方法 |
|------|------|---------|
| `torch.cuda.is_available()` 返回 False | PyTorch 版本不对 | 重新执行第六步，确保用 nightly |
| `CUDA error: no kernel image` | PyTorch 不支持 sm_120 | 同上，必须用 nightly + cu129 |
| `RuntimeError: 模型文件不存在` | 模型未下载 | 执行第七步 |
| `RuntimeError: 参考音频不存在` | 未放参考音频 | 准备 WAV 放到 `D:\index-tts\voice\reference.wav` |
| `CUDA out of memory` | 显存不足 | 关闭 WebUI 再启动 API；或先停 LLM 测试 |
| 合成出来没声音 | 参考音频格式问题 | 用 Audacity 转为 16kHz 单声道 WAV |
| `uv` 命令找不到 | 未安装或未重启终端 | 重新执行第三步，重启 PowerShell |
| 防火墙拦截 | 端口未开放 | 执行第十五步的防火墙命令 |

---

## 启动顺序总结（每日操作）

每次开机后，按这个顺序启动：

```
1. 双击 D:\llama\start-llm.bat     → 等待 LLM 就绪
2. 双击 D:\index-tts\start-tts.bat  → 等待 TTS 就绪
3. 两个窗口都不要关闭
```

关机前直接关闭窗口即可，无需特殊操作。
