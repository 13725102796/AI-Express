# 电脑1 · TTS 语音合成服务部署手册（CosyVoice 3）

> 服务：CosyVoice 3（阿里 FunAudioLLM 团队，2025 年 12 月）
> 设备：Windows + RTX 5070 Ti 16GB + 64GB RAM
> 端口：8002
> 预计耗时：60 分钟（含 WSL2 安装 + 模型下载 ~9GB）

---

## 重要说明

- CosyVoice 3 **只能在 Linux 下运行**（依赖 pynini、deepspeed 等 Linux 专属包）
- 我们用 **WSL2**（Windows 内置 Linux 子系统）运行，GPU 直通无性能损失
- 本手册从零开始，包含 WSL2 安装

---

## 一、安装 WSL2

### 第一步：开启 WSL2

以**管理员身份**打开 PowerShell，执行：

```powershell
wsl --install -d Ubuntu-22.04
```

安装过程会要求你：
1. **重启电脑**（按提示重启）
2. 重启后自动弹出 Ubuntu 窗口，设置**用户名和密码**（记住！后面要用）

如果已经装过 WSL，确认版本：

```powershell
wsl --list --verbose
```

确保 `VERSION` 列显示 `2`（不是 1）。

### 第二步：验证 WSL2 能看到 GPU

打开 Ubuntu 终端（从开始菜单找 Ubuntu-22.04），执行：

```bash
nvidia-smi
```

✅ 能看到 RTX 5070 Ti → 继续
❌ 看不到 → 需要更新 Windows 到最新版本，或更新 NVIDIA 驱动（Windows 侧装驱动，WSL 会自动识别）

---

## 二、安装 Conda

在 Ubuntu 终端执行（以下所有步骤都在 Ubuntu 终端里操作）：

```bash
# 下载 Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh

# 安装（一路回车 + yes）
bash ~/miniconda.sh -b -p ~/miniconda3

# 激活
~/miniconda3/bin/conda init bash
source ~/.bashrc
```

验证：

```bash
conda --version
```

---

## 三、克隆项目

```bash
# 安装 git-lfs
sudo apt-get update && sudo apt-get install -y git-lfs sox libsox-dev ffmpeg
git lfs install

# 克隆代码
cd ~
git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git
cd ~/CosyVoice
git submodule update --init --recursive
```

---

## 四、创建环境并安装依赖

```bash
cd ~/CosyVoice

# 创建 Python 3.10 环境
conda create -n cosyvoice python=3.10 -y
conda activate cosyvoice

# ⚠️ requirements.txt 锁定了 torch==2.3.1，但 5070 Ti 需要 nightly
# 先去掉版本锁定，再安装
sed -i 's/torch==2.3.1/torch/g' requirements.txt
sed -i 's/torchaudio==2.3.1/torchaudio/g' requirements.txt

# 安装依赖
pip install -r requirements.txt

# 安装 pynini（文本正则化，只能通过 conda 装）
conda install -c conda-forge pynini==2.1.6 -y
```

这一步耗时较长（约 10-15 分钟），耐心等待。

---

## 五、替换 PyTorch 为 nightly 版本（5070 Ti 必须）

稳定版 PyTorch 不支持 5070 Ti 的 Blackwell 架构（sm_120），必须换 nightly：

```bash
conda activate cosyvoice

# 卸载旧版，安装 nightly（避免冲突）
pip uninstall torch torchaudio torchvision -y
pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu129
```

验证：

```bash
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0))"
```

✅ 输出：
```
CUDA: True
GPU: NVIDIA GeForce RTX 5070 Ti
```

---

## 六、下载模型

```bash
cd ~/CosyVoice

# 方式一：用 huggingface-hub 下载（推荐）
pip install "huggingface_hub[hf_xet]"

# 国内网络设镜像（可选）
export HF_ENDPOINT=https://hf-mirror.com

# 下载（约 9GB）
python -c "
from huggingface_hub import snapshot_download
snapshot_download('FunAudioLLM/Fun-CosyVoice3-0.5B-2512',
                  local_dir='pretrained_models/Fun-CosyVoice3-0.5B')
"

# 方式二：用 modelscope（国内更快）
# pip install modelscope
# python -c "
# from modelscope import snapshot_download
# snapshot_download('iic/Fun-CosyVoice3-0.5B-2512',
#                   local_dir='pretrained_models/Fun-CosyVoice3-0.5B')
# "
```

下载完确认：

```bash
ls -lh pretrained_models/Fun-CosyVoice3-0.5B/
```

应该看到 `llm.pt`、`flow.pt`、`hift.pt` 等文件。

---

## 七、快速测试（WebUI）

```bash
cd ~/CosyVoice
conda activate cosyvoice
python webui.py --port 7860 --model_dir pretrained_models/Fun-CosyVoice3-0.5B
```

在 Windows 浏览器打开 **http://localhost:7860**

测试步骤：
1. 选择 **3s极速复刻** 标签页
2. 上传一段 3-10 秒的参考音频（WAV 格式）
3. 填写参考音频对应的文字内容
4. 输入要合成的文字
5. 勾选 **流式推理**
6. 点击生成

✅ 能听到合成语音 → 继续
❌ 报错 → 看末尾「排查清单」

测试完 `Ctrl+C` 关闭。

---

## 八、准备参考音频

```bash
mkdir -p ~/CosyVoice/voice
```

把参考音频传到 WSL2 里。从 Windows 侧复制：

```bash
# Windows 的 D:\voice\reference.wav 在 WSL 中的路径是：
cp /mnt/d/voice/reference.wav ~/CosyVoice/voice/reference.wav
```

> 提示：WSL2 中 Windows 的 D 盘挂载在 `/mnt/d/`

参考音频要求：
- 时长：3-10 秒
- 格式：WAV，16kHz
- 内容：一段清晰的中文朗读，需要记录对应文字（后面要用）

---

## 九、创建 API 服务

```bash
cat > ~/CosyVoice/tts_server.py << 'PYEOF'
"""
留白 TTS API 服务
基于 CosyVoice 3 + FastAPI
端口：8002
流式输出，首包延迟 ~150ms
"""

import io
import os
import sys
import time
import wave
import numpy as np
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel

# ─────────────────────────────────────────────
# 配置
# ─────────────────────────────────────────────
MODEL_DIR      = os.path.expanduser("~/CosyVoice/pretrained_models/Fun-CosyVoice3-0.5B")
VOICE_REF_PATH = os.path.expanduser("~/CosyVoice/voice/reference.wav")
# 参考音频对应的文字（必须准确填写！）
VOICE_REF_TEXT = "You are a helpful assistant.<|endofprompt|>这里替换成你参考音频里说的那句话。"

# ─────────────────────────────────────────────
# 全局模型
# ─────────────────────────────────────────────
cosyvoice = None
SAMPLE_RATE = None

sys.path.append(os.path.join(os.path.dirname(__file__), 'third_party/Matcha-TTS'))


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cosyvoice, SAMPLE_RATE

    if not os.path.exists(MODEL_DIR):
        raise RuntimeError(f"模型目录不存在：{MODEL_DIR}\n请先下载模型。")
    if not os.path.exists(VOICE_REF_PATH):
        raise RuntimeError(f"参考音频不存在：{VOICE_REF_PATH}\n请先准备参考音频。")

    print("[TTS] 加载 CosyVoice 3 模型...")
    from cosyvoice.cli.cosyvoice import AutoModel

    cosyvoice = AutoModel(model_dir=MODEL_DIR)
    SAMPLE_RATE = cosyvoice.sample_rate

    # 预热
    print("[TTS] 预热中...")
    _warmup()
    print(f"[TTS] 就绪，采样率 {SAMPLE_RATE}Hz，端口 8002")

    yield

    del cosyvoice
    print("[TTS] 服务已关闭")


app = FastAPI(title="留白 TTS 服务（CosyVoice 3）", lifespan=lifespan)


# ─────────────────────────────────────────────
# 接口：POST /synthesize（流式返回音频）
# ─────────────────────────────────────────────
class SynthesizeRequest(BaseModel):
    text: str
    emotion: Optional[str] = ""  # 情绪/风格指令，如 "用温柔轻声的语气"


@app.post("/synthesize")
async def synthesize(req: SynthesizeRequest):
    if cosyvoice is None:
        raise HTTPException(status_code=503, detail="模型未就绪")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")

    t0 = time.time()

    # 根据是否有情绪指令，选择不同推理模式
    if req.emotion:
        # 指令模式：可控制情绪、语速、方言等
        # 注意：指令放在 "You are a helpful assistant." 之后、<|endofprompt|> 之前
        instruct = f"You are a helpful assistant. {req.emotion}<|endofprompt|>"
        model_output = cosyvoice.inference_instruct2(
            req.text,
            instruct,
            VOICE_REF_PATH,
            stream=True,
        )
    else:
        # 零样本克隆模式
        model_output = cosyvoice.inference_zero_shot(
            req.text,
            VOICE_REF_TEXT,
            VOICE_REF_PATH,
            stream=True,
        )

    def generate_wav_stream():
        """流式生成 WAV 数据。先发 WAV 头，再逐块发 PCM 数据。"""
        header_sent = False
        for chunk in model_output:
            audio = chunk['tts_speech'].numpy()
            pcm = (audio * 32767).astype(np.int16).tobytes()
            if not header_sent:
                # 发送 WAV 头（用一个很大的长度占位，流式写入）
                header = _make_wav_header(SAMPLE_RATE)
                yield header
                header_sent = True
                elapsed = round((time.time() - t0) * 1000)
                print(f"[TTS] 首包 {elapsed}ms ← {req.text[:30]}")
            yield pcm

    return StreamingResponse(
        generate_wav_stream(),
        media_type="audio/wav",
    )


# 非流式版本（等全部生成完再返回，兼容旧接口）
@app.post("/synthesize_full")
async def synthesize_full(req: SynthesizeRequest):
    if cosyvoice is None:
        raise HTTPException(status_code=503, detail="模型未就绪")
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text 不能为空")

    t0 = time.time()

    if req.emotion:
        instruct = f"You are a helpful assistant. {req.emotion}<|endofprompt|>"
        model_output = cosyvoice.inference_instruct2(
            req.text, instruct, VOICE_REF_PATH, stream=False, 
        )
    else:
        model_output = cosyvoice.inference_zero_shot(
            req.text, VOICE_REF_TEXT, VOICE_REF_PATH, stream=False,
        )

    # 拼接所有块
    all_audio = []
    for chunk in model_output:
        all_audio.append(chunk['tts_speech'].numpy())

    combined = np.concatenate(all_audio, axis=1)
    pcm = (combined * 32767).astype(np.int16)

    # 写完整 WAV
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm.tobytes())

    elapsed = round((time.time() - t0) * 1000)
    print(f"[TTS] 完整生成 {elapsed}ms ← {req.text[:30]}")

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="audio/wav",
        headers={"X-Synthesis-Time": str(elapsed)},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": "CosyVoice3-0.5B", "device": "cuda", "sample_rate": SAMPLE_RATE}


# ─────────────────────────────────────────────
# 工具函数
# ─────────────────────────────────────────────
def _make_wav_header(sample_rate: int, bits_per_sample: int = 16, channels: int = 1) -> bytes:
    """生成一个 WAV 文件头，数据长度设为最大值（流式写入用）。"""
    import struct
    data_size = 0x7FFFFFFF  # 占位，流式不知道总长度
    header = struct.pack('<4sI4s', b'RIFF', data_size + 36, b'WAVE')
    header += struct.pack('<4sIHHIIHH', b'fmt ', 16, 1, channels,
                          sample_rate, sample_rate * channels * bits_per_sample // 8,
                          channels * bits_per_sample // 8, bits_per_sample)
    header += struct.pack('<4sI', b'data', data_size)
    return header


def _warmup():
    try:
        for _ in cosyvoice.inference_zero_shot(
            "好的", VOICE_REF_TEXT, VOICE_REF_PATH, stream=False
        ):
            pass
    except Exception as e:
        print(f"[TTS] 预热失败（不影响服务）：{e}")
PYEOF
```

---

## 十、创建启动脚本

```bash
cat > ~/CosyVoice/start-tts.sh << 'EOF'
#!/bin/bash
cd ~/CosyVoice
source ~/miniconda3/bin/activate cosyvoice

echo "================================================"
echo " 留白 TTS 服务启动中"
echo " 模型：CosyVoice 3 (0.5B, CUDA)"
echo " 端口：8002（流式输出）"
echo "================================================"

uvicorn tts_server:app \
  --host 0.0.0.0 \
  --port 8002 \
  --workers 1 \
  --log-level info
EOF

chmod +x ~/CosyVoice/start-tts.sh
```

---

## 十一、安装 API 服务依赖

```bash
conda activate cosyvoice
pip install fastapi uvicorn[standard]
```

---

## 十二、配置参考音频文字（重要！）

打开 `~/CosyVoice/tts_server.py`，找到这一行：

```python
VOICE_REF_TEXT = "You are a helpful assistant.<|endofprompt|>这里替换成你参考音频里说的那句话。"
```

把「这里替换成你参考音频里说的那句话」改成你参考音频里**实际说的文字内容**。

例如你的参考音频说的是「今天天气真不错，我们一起出去走走吧」，就改成：

```python
VOICE_REF_TEXT = "You are a helpful assistant.<|endofprompt|>今天天气真不错，我们一起出去走走吧。"
```

> ⚠️ 这一步很关键！文字必须和音频内容一致，否则克隆效果会很差。

---

## 十三、启动服务

```bash
~/CosyVoice/start-tts.sh
```

看到以下日志说明就绪：

```
[TTS] 加载 CosyVoice 3 模型...
[TTS] 预热中...
[TTS] 就绪，采样率 24000Hz，端口 8002
INFO: Uvicorn running on http://0.0.0.0:8002
```

---

## 十四、验证

### 在 WSL2 内测试

```bash
# 健康检查
curl http://localhost:8002/health

# 合成测试（非流式，方便验证）
curl -X POST http://localhost:8002/synthesize_full \
  -H "Content-Type: application/json" \
  -d '{"text": "嗯，我在。不想说就不说。", "emotion": ""}' \
  --output ~/test.wav

# 播放（WSL2 没有音频设备，复制到 Windows 播放）
cp ~/test.wav /mnt/c/Users/$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')/Desktop/test_tts.wav
```

然后在 Windows 桌面双击 `test_tts.wav` 播放。

### 带情绪测试

```bash
curl -X POST http://localhost:8002/synthesize_full \
  -H "Content-Type: application/json" \
  -d '{"text": "嗯，我在。不想说就不说。", "emotion": "用轻柔低沉的声音，带一点心疼，语速稍慢"}' \
  --output ~/test_emotion.wav
```

### 在 Windows / Mac 上测试局域网访问

```bash
# 查看 WSL2 的 IP（注意：不是 Windows 的 IP）
hostname -I
```

> ⚠️ WSL2 的网络默认是 NAT 模式，外部设备无法直接访问。需要端口转发。

在 **Windows PowerShell（管理员）** 执行：

```powershell
# 查看 WSL2 的 IP
wsl hostname -I

# 设置端口转发（把下面的 WSL_IP 替换成上面查到的 IP）
netsh interface portproxy add v4tov4 listenport=8002 listenaddress=0.0.0.0 connectport=8002 connectaddress=WSL_IP

# 开放防火墙
New-NetFirewallRule -DisplayName "TTS Service 8002" -Direction Inbound -Port 8002 -Protocol TCP -Action Allow
```

然后 Mac 上就能用 `http://<Windows电脑的IP>:8002` 访问了。

> 注意：每次 WSL2 重启后 IP 可能变化，需要重新设置端口转发。

**自动化方案**：在 Windows 桌面新建 `setup-tts-proxy.bat`，每次开机双击即可（以管理员运行）：

```bat
@echo off
echo 正在配置 TTS 端口转发...

:: 获取 WSL2 IP
for /f "tokens=1" %%i in ('wsl hostname -I') do set WSL_IP=%%i
echo WSL2 IP: %WSL_IP%

:: 删除旧的转发规则
netsh interface portproxy delete v4tov4 listenport=8002 listenaddress=0.0.0.0 >nul 2>&1

:: 添加新的转发规则
netsh interface portproxy add v4tov4 listenport=8002 listenaddress=0.0.0.0 connectport=8002 connectaddress=%WSL_IP%

echo 端口转发已设置：0.0.0.0:8002 → %WSL_IP%:8002
pause
```

---

## 十五、测速脚本

```bash
cat > ~/CosyVoice/test_speed.py << 'PYEOF'
import sys
import time
import os
sys.path.append('third_party/Matcha-TTS')
from cosyvoice.cli.cosyvoice import AutoModel

print("加载模型中...")
cosyvoice = AutoModel(model_dir='pretrained_models/Fun-CosyVoice3-0.5B')

REF_WAV = os.path.expanduser("~/CosyVoice/voice/reference.wav")
REF_TEXT = "You are a helpful assistant.<|endofprompt|>这里替换成你参考音频里说的那句话。"

# 预热
print("预热中...")
for _ in cosyvoice.inference_zero_shot("测试", REF_TEXT, REF_WAV, stream=False):
    pass

print("\n=== 非流式（完整生成耗时） ===")
tests = [
    ("好的", "2字"),
    ("嗯，我在。", "5字"),
    ("不想说就不说，我陪你待着。", "13字"),
    ("有时候不需要什么理由，就是突然觉得很累，什么都不想做。", "26字"),
]
for text, label in tests:
    t0 = time.time()
    for _ in cosyvoice.inference_zero_shot(text, REF_TEXT, REF_WAV, stream=False):
        pass
    ms = round((time.time() - t0) * 1000)
    print(f"  {label:6s} | {ms:5d}ms | {text}")

print("\n=== 流式（首包延迟） ===")
for text, label in tests:
    t0 = time.time()
    first_chunk = True
    for chunk in cosyvoice.inference_zero_shot(text, REF_TEXT, REF_WAV, stream=True):
        if first_chunk:
            ms = round((time.time() - t0) * 1000)
            print(f"  {label:6s} | 首包 {ms:4d}ms | {text}")
            first_chunk = False

print("\n测速完成。")
PYEOF
```

运行：

```bash
cd ~/CosyVoice
conda activate cosyvoice
python test_speed.py
```

---

## 性能预期（RTX 5070 Ti）

| 指标 | 预期 |
|------|------|
| 流式首包延迟 | **150-300ms** |
| 完整生成（短句） | **500-1500ms** |
| 显存占用 | **4-6 GB** |

---

## 与情绪系统的对应关系

CosyVoice 3 用自然语言指令控制情感，传入 `emotion` 字段即可：

| 用户情绪域 | 推荐 emotion 指令 |
|-----------|------------------|
| lonely（孤独）| `"用轻柔低沉的声音，带一点心疼，语速稍慢"` |
| anxious（焦虑）| `"平稳轻柔的语气，像在安抚，不急不躁"` |
| sad（难过）| `"温柔低沉，带一点陪伴感，不刻意安慰"` |
| calm（平静）| `"平静温和，像深夜里老朋友聊天"` |
| touched（感动）| `"温暖而克制，像微笑着说话"` |
| angry（愤怒）| `"平静，带一点理解的语气，不对抗"` |

还支持更细粒度的控制：
- 语速：`"用比较快的语速说"` / `"慢慢地说"`
- 方言：`"用四川话说"` / `"用粤语说"`
- 特殊标记：`[breath]`（气息）、`[laughter]`（笑声）

---

## 排查清单

| 现象 | 原因 | 处理方法 |
|------|------|---------|
| WSL2 里 `nvidia-smi` 看不到 GPU | 驱动问题 | Windows 侧更新 NVIDIA 驱动到最新版 |
| `CUDA error: no kernel image` | PyTorch 不支持 sm_120 | 重新执行第五步，安装 nightly |
| `ModuleNotFoundError: pynini` | 未通过 conda 安装 | `conda install -c conda-forge pynini==2.1.6` |
| `No module named cosyvoice` | 没加 Matcha-TTS 路径 | 确认 `third_party/Matcha-TTS` 目录存在 |
| 克隆音色不像 | 参考文字与音频不匹配 | 仔细核对 `VOICE_REF_TEXT` 的内容 |
| Mac 访问不通 | WSL2 NAT + 防火墙 | 执行第十四步的端口转发和防火墙命令 |
| WSL2 重启后访问不通 | IP 变了 | 重新执行 `netsh interface portproxy` 命令 |
| `CUDA out of memory` | 显存不足 | 关闭其他占用 GPU 的服务（如 LLM） |
| 下载模型超时 | 网络问题 | 用 modelscope 替代方案（见第六步注释） |

---

## 每日操作

### 启动

```
1. 打开 Ubuntu 终端（开始菜单 → Ubuntu-22.04）
2. 执行：~/CosyVoice/start-tts.sh
3. 等待看到 "就绪，端口 8002"
4. 不要关闭这个窗口
```

### 关闭

在终端按 `Ctrl+C`，或直接关闭窗口。
