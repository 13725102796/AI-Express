# 电脑2 · TTS 语音合成服务部署手册

> 服务：IndexTTS-2（Bilibili Index 团队，2025年9月）
> 设备：Mac Studio M1 Max / 32GB 统一内存
> 端口：8002
> 预计耗时：45 分钟（含模型下载 ~6GB）

---

## 一、原理说明（可跳过）

```
LLM 生成文字 + 情绪标签
  → POST :8002/synthesize
  → IndexTTS-2 根据参考音频（音色）+ 情绪描述（情感）合成语音
  → 流式返回 WAV 音频
  → 前端播放
```

**IndexTTS-2 的核心优势**

| 能力 | 说明 |
|------|------|
| 纯文字情感控制 | 不需要录制不同情绪的参考音频，用一段参考音频 + 文字描述情绪即可 |
| 音色与情感解耦 | 音色（谁的声音）和情感（什么心情）独立控制 |
| 中文优化 | 5.5 万小时训练数据（3 万小时中文），汉字拼音混合建模 |

**情感控制示例（与留白情绪体系对应）：**

```python
# 用户情绪 lonely → TTS 语气轻柔低沉
synthesize(text="嗯，我在。", emotion="用轻柔低沉的声音，带一点心疼")

# 用户情绪 calm → TTS 语气平稳温和
synthesize(text="是啊，确实挺久了。", emotion="平静温和，像深夜里老朋友说话")
```

---

## 二、环境准备

### 第一步：创建虚拟环境

```bash
conda create -n liminal-tts python=3.11 -y
conda activate liminal-tts
```

### 第二步：安装 PyTorch（MPS 版本）

```bash
# 安装支持 Apple MPS 的 PyTorch
pip install torch torchvision torchaudio
```

### 第三步：安装 IndexTTS-2

```bash
# 方式一：直接 pip 安装（推荐）
pip install indextts

# 方式二：从源码安装（如需最新版本）
git clone https://github.com/index-tts/index-tts.git ~/liminal/index-tts-src
cd ~/liminal/index-tts-src
pip install -e .
```

### 第四步：安装服务框架

```bash
pip install fastapi uvicorn[standard] pydantic
```

---

## 三、下载模型

```bash
pip install huggingface_hub

# 国内网络建议先设置镜像
export HF_ENDPOINT=https://hf-mirror.com

# 下载模型（约 6GB）
huggingface-cli download IndexTeam/IndexTTS-2 \
  --local-dir ~/liminal/tts/checkpoints
```

下载完成后，`~/liminal/tts/checkpoints/` 目录应包含：

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

## 四、准备参考音频（重要）

IndexTTS-2 需要一段 **2-10 秒** 的参考音频来确定「留白」的音色。

### 要求

- 时长：2-10 秒
- 格式：WAV，16kHz，单声道（工具会自动转换）
- 内容：朗读任意中文句子，发音清晰，背景安静
- 建议：多录几版，选一个最自然、声音最稳定的

### 存放位置

```bash
mkdir -p ~/liminal/tts/voice
# 将你录制的参考音频复制到：
cp /path/to/your/reference.wav ~/liminal/tts/voice/reference.wav
```

> **后续可随时更换参考音频**，重启服务即生效。

---

## 五、创建服务目录和代码

```bash
mkdir -p ~/liminal/tts
cd ~/liminal/tts
```

新建文件 `~/liminal/tts/main.py`：

```python
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
# 配置
# ─────────────────────────────────────────────
CHECKPOINTS_DIR = os.path.expanduser("~/liminal/tts/checkpoints")
VOICE_REF_PATH  = os.path.expanduser("~/liminal/tts/voice/reference.wav")
CONFIG_PATH     = os.path.join(CHECKPOINTS_DIR, "config.yaml")

# ─────────────────────────────────────────────
# 全局模型对象（常驻内存，无需每次请求重载）
# ─────────────────────────────────────────────
tts_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """服务启动时加载模型并预热，关闭时释放。"""
    global tts_model

    if not os.path.exists(CONFIG_PATH):
        raise RuntimeError(f"模型文件不存在：{CONFIG_PATH}\n请先执行模型下载步骤。")
    if not os.path.exists(VOICE_REF_PATH):
        raise RuntimeError(f"参考音频不存在：{VOICE_REF_PATH}\n请先准备参考音频。")

    print(f"[TTS] 加载 IndexTTS-2 模型...")
    from indextts import IndexTTS2

    tts_model = IndexTTS2(
        cfg_path=CONFIG_PATH,
        model_dir=CHECKPOINTS_DIR,
        device=None,  # 自动选择：优先 MPS，无则 CPU
    )

    # ── 预热（首次推理需要初始化，提前做掉）──
    print("[TTS] 预热中（约 5-10 秒）...")
    _warmup()
    print("[TTS] 就绪，端口 8002")

    yield  # 服务运行中

    del tts_model
    print("[TTS] 服务已关闭")


app = FastAPI(title="留白 TTS 服务", lifespan=lifespan)


# ─────────────────────────────────────────────
# 接口：POST /synthesize
# ─────────────────────────────────────────────
class SynthesizeRequest(BaseModel):
    text: str
    emotion: Optional[str] = ""  # 情绪描述，如 "用轻柔低沉的声音，带一点心疼"


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    if tts_model is None:
        raise HTTPException(status_code=503, detail="模型未就绪")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")

    t0 = time.time()

    # 长文本分句处理（避免单次合成时间过长）
    sentences = _split_sentences(req.text)
    audio_segments = []

    for sentence in sentences:
        if not sentence.strip():
            continue
        seg_audio = _synthesize_one(sentence, req.emotion)
        audio_segments.append(seg_audio)

    # 拼接所有分句音频
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
    return {"status": "ok", "model": "IndexTTS-2"}


# ─────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────
def _synthesize_one(text: str, emotion: str) -> bytes:
    """合成单句文字，返回 WAV bytes。"""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        output_path = f.name
    try:
        kwargs = dict(
            spk_audio_prompt=VOICE_REF_PATH,
            text=text,
            output_path=output_path,
        )
        if emotion:
            kwargs["emotion_description"] = emotion
        tts_model.infer(**kwargs)
        with open(output_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)


def _split_sentences(text: str) -> list[str]:
    """按中文标点分句。保持每句完整语气，避免单次合成文字太长导致延迟高。"""
    import re
    # 在句末标点后切分，保留标点
    parts = re.split(r"(?<=[。！？…，、；])", text)
    # 把过短的碎片合并到前一句（避免气口过碎）
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
    """将多个 WAV bytes 拼接为一个 WAV。"""
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
    """用一句短文字预热模型，触发 JIT 编译。"""
    try:
        _synthesize_one("好的", "平静温和")
    except Exception as e:
        print(f"[TTS] 预热失败（不影响服务）：{e}")
```

---

## 六、创建启动脚本

新建文件 `~/liminal/tts/start-tts.sh`：

```bash
#!/bin/bash
cd ~/liminal/tts
conda activate liminal-tts

echo "================================================"
echo " 留白 TTS 服务启动中"
echo " 模型：IndexTTS-2 (MPS)"
echo " 端口：8002"
echo "================================================"

uvicorn main:app \
  --host 0.0.0.0 \
  --port 8002 \
  --workers 1 \
  --log-level info
```

赋予执行权限：

```bash
chmod +x ~/liminal/tts/start-tts.sh
```

---

## 七、启动服务

```bash
~/liminal/tts/start-tts.sh
```

看到以下日志说明服务就绪：

```
[TTS] 加载 IndexTTS-2 模型...
[TTS] 预热中（约 5-10 秒）...
[TTS] 就绪，端口 8002
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8002
```

---

## 八、验证效果

打开另一个终端，发一条合成请求：

```bash
curl -s -X POST http://localhost:8002/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "嗯，我在。不想说就不说。", "emotion": "用轻柔低沉的声音，很温柔"}' \
  --output /tmp/output.wav

# 播放测试音频
afplay /tmp/output.wav
```

检查响应头中的合成耗时：

```bash
curl -v -X POST http://localhost:8002/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "好的", "emotion": ""}' \
  --output /dev/null 2>&1 | grep "X-Synthesis-Time"
```

---

## 九、性能基准（M1 Max 估算）

| 文字长度 | 预期耗时 | 备注 |
|---------|---------|------|
| 5 字以内 | ~800ms | 短句，一次合成 |
| 10-20 字 | ~1200ms | 留白常见回复长度 |
| 30-50 字 | ~1800ms | 触发分句 |
| 50 字以上 | ~2500ms | 多句并串行合成 |

> 注意：MPS 上 IndexTTS-2 强制使用 FP32（官方限制，暂无 FP16 优化），
> 比 CUDA FP16 慢约 1.5-2 倍。这是已知局限，无法绕过。

---

## 十、情绪映射参考

以下是留白情绪体系与 TTS 情感描述的对应关系，供前端传参参考：

| 用户情绪域 | 推荐 emotion 描述 |
|-----------|------------------|
| lonely（孤独）| `"用轻柔低沉的声音，带一点心疼，语速稍慢"` |
| anxious（焦虑）| `"平稳轻柔，像在安抚，不急不躁"` |
| sad（难过）| `"温柔低沉，带一点陪伴感，不刻意安慰"` |
| calm（平静）| `"平静温和，像深夜里老朋友聊天"` |
| touched（感动）| `"温暖而克制，像微笑着说话"` |
| angry（愤怒）| `"平静，带一点理解，不对抗"` |

---

## 十一、排查清单

| 现象 | 原因 | 处理方法 |
|------|------|---------|
| `ModuleNotFoundError: indextts` | 包未安装 | `pip install indextts` |
| `RuntimeError: 模型文件不存在` | 模型未下载 | 执行第三节下载步骤 |
| `RuntimeError: 参考音频不存在` | 未放参考音频 | 准备 2-10 秒 WAV 放到 `~/liminal/tts/voice/reference.wav` |
| 音频播放卡顿 | 网络问题（本地调用不应出现）| 检查 localhost:8002 是否正常响应 |
| 声音质量差 | 参考音频质量低 | 重录参考音频，安静环境，发音清晰 |
| 首次合成超慢（30s+）| 正常，MPS 初始化 | 预热完成后后续正常 |
| MPS 报错 fallback 到 CPU | MPS 内存不足 | 关闭其他占用 GPU 的应用 |

---

## 十二、审查笔记：当前方案的已知局限

> 以下是本方案目前尚未解决的优化点，供后续迭代参考：

| 问题 | 影响 | 备注 |
|------|------|------|
| **MPS 只支持 FP32** | 比 CUDA FP16 慢 1.5-2 倍 | 官方限制，无法绕过；商业化时换 CUDA 机器可消除 |
| **无真正流式输出** | 用户等待整句合成完再播放 | IndexTTS-2 当前 `infer()` 输出完整音频文件，非 token 级流式 |
| **分句串行合成** | 多句文字延迟叠加 | 可优化为：第一句合成完立即推送，同时合成第二句（流水线）|
| **参考音频每次重读** | 轻微 I/O 开销 | 可在启动时预加载参考音频到内存缓存 |
| **emotion_description 参数未验证** | 模型是否支持该参数名需实测确认 | 部署后测试一下，若不支持按官方 API 调整 |
