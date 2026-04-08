# 电脑2 · STT 语音识别服务部署手册

> 服务：Qwen3-ASR-1.7B（阿里 2026年1月，当前中文 ASR 最优）
> 设备：Mac Studio M1 Max / 32GB 统一内存
> 端口：8001
> 预计耗时：30 分钟（含模型下载）

---

## 一、原理说明（可跳过）

```
前端录音（WebM/Opus）
  → POST :8001/transcribe
  → Qwen3-ASR 通过 MLX 在 Apple GPU 上推理
  → 返回文字 + 耗时
```

**为什么用 MLX 而不是 PyTorch MPS？**

同一台 M1 Max，MLX 框架比 PyTorch MPS 快约 2 倍。
MLX 是 Apple 专为 M 系列芯片设计的机器学习框架，
原生利用统一内存，无需 VRAM/RAM 间数据搬运。

---

## 二、环境准备

### 第一步：安装 Python 环境

打开终端（Terminal），依次执行：

```bash
# 安装 miniconda（已有则跳过）
brew install miniconda

# 创建专用虚拟环境
conda create -n liminal-stt python=3.11 -y
conda activate liminal-stt
```

### 第二步：安装依赖

```bash
# 核心：社区 MLX 移植版（Apple Silicon 原生加速，比官方包快 ~2x）
# 项目地址：https://github.com/moona3k/mlx-qwen3-asr
pip install mlx-qwen3-asr

# 服务框架
pip install fastapi uvicorn[standard] python-multipart

# 音频处理工具（WebM 转 WAV 用）
brew install ffmpeg
pip install pydub
```

### 第三步：下载模型

```bash
# 安装 HuggingFace 下载工具
pip install huggingface_hub

# 下载 1.7B 模型（约 4GB，国内建议走镜像）
# 普通网络：
huggingface-cli download mlx-community/Qwen3-ASR-1.7B-bf16

# 如果下载慢，设置国内镜像后再下载：
export HF_ENDPOINT=https://hf-mirror.com
huggingface-cli download mlx-community/Qwen3-ASR-1.7B-bf16
```

> **速度备选**：如果 1.7B 推理觉得慢，可改用 0.6B 量化版（~800MB）：
> `huggingface-cli download mlx-community/Qwen3-ASR-0.6B-8bit`
> 注意：换模型后需同步修改 `main.py` 中的 `MODEL_NAME`。
>
> **官方备用方案**：如果社区包出现兼容性问题，可改用官方包：
> `pip install qwen-asr`，模型改为 `Qwen/Qwen3-ASR-1.7B`，
> 代码改为 `from qwen_asr import Qwen3ASRModel`，速度略慢但官方维护。

---

## 三、创建服务目录和代码

```bash
mkdir -p ~/liminal/stt
cd ~/liminal/stt
```

新建文件 `~/liminal/stt/main.py`，内容如下：

```python
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
    if "lm_head.weight" not in remapped and "model.embed_tokens.weight" in remapped:
        remapped["lm_head.weight"] = remapped["model.embed_tokens.weight"]
    return remapped

_loader.remap_weights = _patched_remap

# ⚠️ 修改为你的实际模型目录路径
MODEL_PATH = "/Users/maidong/Desktop/zyc/github/AI-Express/项目角色agent/输出物料/情感陪伴对话Agent/code/models"

# ─────────────────────────────────────────────
# 全局模型对象（常驻内存，无需每次请求重载）
# ─────────────────────────────────────────────
asr_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global asr_model
    print(f"[STT] 加载模型 {MODEL_PATH} ...")

    # 预加载进 _ModelHolder 内部 cache；推理时传路径字符串，
    # library 命中 cache 直接复用，tokenizer 也能正确解析本地路径。
    from mlx_qwen3_asr import load_model, transcribe as _transcribe
    asr_model, _ = load_model(MODEL_PATH, dtype=mx.float16)

    # 预热（首次推理触发 JIT 编译，提前做掉）
    print("[STT] 预热中（约 5-10 秒）...")
    warmup_path = _create_silent_wav(duration_ms=500)
    try:
        _transcribe(warmup_path, model=MODEL_PATH, language="zh")
    finally:
        os.unlink(warmup_path)
    print("[STT] 就绪，端口 8001")

    yield

    del asr_model
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
```

---

## 四、集成到项目（与前端同启同停）

STT 服务通过 `pnpm dev:all` 与 Next.js 一起启动，Ctrl+C 时一并关闭。
前端项目 `package.json` 已配置好，**无需额外操作**。

首次使用前安装 `concurrently`：

```bash
cd ~/liminal/frontend   # 进入前端项目目录
pnpm install
```

之后每次开发只需一条命令：

```bash
pnpm dev:all
```

终端会显示三路并行日志（颜色区分）：

```
[next] ▶ Next.js 开发服务器
[stt]  ▶ STT 服务加载模型 → 预热 → 就绪
[tts]  ▶ TTS 服务加载模型 → 预热 → 就绪
```

按 **Ctrl+C** 三个服务同时停止。

> 单独启动 STT（调试用）：
> ```bash
> pnpm dev:stt
> ```

---

## 五、启动验证

服务就绪后的日志：

```
[stt] [STT] 加载模型 /path/to/models ...
[stt] [STT] 预热中（约 5-10 秒）...
[stt] [STT] 就绪，端口 8001
[stt] INFO: Uvicorn running on http://0.0.0.0:8001
```

发一段音频测试：

```bash
# 录制 3 秒音频（需要 SoX，brew install sox）
rec -r 16000 -c 1 /tmp/test.wav trim 0 3

# 发送到 STT 服务
curl -s -X POST http://localhost:8001/transcribe \
  -F "file=@/tmp/test.wav" | python3 -m json.tool
```

预期输出：

```json
{
  "text": "你好，我今天有点累。",
  "duration_ms": 865
}
```

健康检查：

```bash
curl http://localhost:8001/health
```

---

## 六、性能基准（1.7B M1 Max 实测）

| 测试句 | 音频时长 | 识别耗时 | 准确率 |
|--------|---------|---------|--------|
| "算了吧" | ~1s | 435ms | 100% |
| "你好，我今天感觉有点累" | ~3s | 865ms | 100% |
| "我最近工作压力特别大，每天加班到很晚，回到家什么都不想做" | ~5s | 1245ms | 100% |

> 首次启动后需 5-10 秒预热（JIT 编译），之后保持稳定。
> 0.6B 版本速度快约 3x，但中文准确率降低 15-25%。

---

## 七、排查清单

| 现象 | 原因 | 处理方法 |
|------|------|---------|
| `ModuleNotFoundError: mlx_qwen3_asr` | 包未安装 | 激活 `liminal-stt` 环境后 `pip install mlx-qwen3-asr` |
| `conda: command not found`（dev:stt 报错）| PATH 未包含 conda | `brew install miniconda` 并重启终端 |
| 模型下载卡住 | 网络问题 | `export HF_ENDPOINT=https://hf-mirror.com` 再重试 |
| `ffmpeg not found` | 缺少 ffmpeg | `brew install ffmpeg` |
| `OSError: [Errno 28] No space left` | 磁盘空间不足 | 清理磁盘，模型需 ~3.5GB |
| 首次启动慢（10-15s）| 正常，模型加载 + JIT 预热 | 预热完成后后续请求正常 |

---

## 八、已知局限

| 问题 | 影响 | 备注 |
|------|------|------|
| **无 VAD 预处理** | 用户说话前后的静音段也送去推理，浪费时间 | 可在前端用 WebRTC VAD 截断静音后再上传 |
| **无流式 STT** | 用户说完才开始识别，而非边说边识 | Qwen3-ASR 暂不支持流式，等待官方更新 |
| **前端录音格式** | 如果前端发 PCM/WAV，体积大、传输慢 | 前端改用 WebM/Opus 录制，体积缩小 5-10 倍 |
