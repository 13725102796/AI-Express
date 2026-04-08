# 电脑1 · LLM 服务部署完整手册

> 适用：Windows + RTX 5070 Ti 16GB + 64GB RAM
> 目标：运行 Gemma 26B，暴露局域网 API
> 按顺序执行，不要跳步

---

## 第一步：确认显卡驱动

打开 PowerShell，输入：

```powershell
nvidia-smi
```

看到类似下面的输出即可继续：

```
Driver Version: 572.xx    CUDA Version: 12.8
RTX 5070 Ti    |  0MiB / 16384MiB
```

**驱动版本必须 ≥ 572**（RTX 50 系 Blackwell 架构要求）

❌ 版本不够？去 NVIDIA 官网下载最新驱动，选「自定义安装 → 全新安装」，重启后再试。

---

## 第二步：查询 CPU 核心数（记下来）

```powershell
(Get-WmiObject Win32_Processor).NumberOfCores
```

输出一个数字，例如 `12`，**记住这个数字**，第五步要用到。

---

## 第三步：下载 llama.cpp

前往：**https://github.com/ggerganov/llama.cpp/releases**

找到最新版本，下载这个格式的文件：

```
llama-b****-bin-win-cuda-cu12.x.x-x64.zip
```

> 关键：文件名必须包含 **cuda**，不要选 vulkan 或 cpu 版本

下载后解压到：

```
D:\llama\
```

解压后 `D:\llama\` 里应该能看到 `llama-server.exe`。

---

## 第四步：放置模型文件

将模型文件放到以下位置（没有这个文件夹就新建）：

```
D:\models\gemma-4-26B-A4B-it-UD-Q3_K_M.gguf
```

文件大小约 12.5 GB，确认完整。

---

## 第五步：创建启动脚本

在 `D:\llama\` 文件夹里新建一个文本文件，命名为 `start-llm.bat`。

用记事本打开，把下面内容**完整复制进去**：

```batch
@echo off
chcp 65001
title Liminal LLM Server

echo ================================================
echo  留白 LLM 服务启动中
echo  模型：Gemma 26B Q3_K_M  [GPU 全量加载]
echo  上下文：16384 tokens（约 10000 汉字）
echo  端口：8080
echo ================================================

D:\llama\llama-server.exe ^
  -m "D:\models\gemma-4-26B-A4B-it-UD-Q3_K_M.gguf" ^
  --n-gpu-layers 999 ^
  --flash-attn ^
  --cache-type-k q8_0 ^
  --cache-type-v q8_0 ^
  --ctx-size 16384 ^
  --threads 12 ^
  --threads-batch 12 ^
  --mlock ^
  --defrag-thold 0.1 ^
  --host 0.0.0.0 ^
  --port 8080

echo.
echo 服务已停止
pause
```

⚠️ **重要**：把第 14-15 行的 `12` 改成第二步查到的你的 CPU 核心数。

保存文件。

---

## 第六步：验证 GPU 可以被识别

> `llama-server.exe` 就在第三步解压出来的 `D:\llama\` 文件夹里。

在 `D:\llama\` 文件夹里，**按住 Shift 右键 → 在此处打开 PowerShell**，输入：

```powershell
.\llama-server.exe --list-devices
```

必须看到类似：

```
CUDA devices:
  Device 0: NVIDIA GeForce RTX 5070 Ti, compute capability 10.0
```

❌ 只显示 CPU 没有 CUDA？跳到文末【常见问题 A】处理。

---

## 第七步：启动服务

双击 `D:\llama\start-llm.bat`

等待约 **30-60 秒**，看到以下关键信息说明启动成功：

```
offloaded 46/46 layers to GPU        ← 全部层在 GPU ✅
VRAM used: ~15000 MiB                ← 正常（13-15GB）✅
llama server listening at http://0.0.0.0:8080  ← 服务已就绪 ✅
```

❌ 看到 `CUDA out of memory`？跳到文末【常见问题 B】。

---

## 第八步：验证服务正常

**保持第七步的窗口开着**，再开一个新的 PowerShell，输入：

```powershell
curl http://localhost:8080/v1/models
```

看到类似 `{"object":"list","data":[...]}` 的 JSON 返回即成功。

---

## 第九步：放行防火墙（让 Mac 能访问）

Windows 搜索栏搜「防火墙」→「Windows Defender 防火墙」→「高级设置」→「入站规则」→「新建规则」：

| 项目 | 填写 |
|------|------|
| 规则类型 | 端口 |
| 协议 | TCP |
| 端口号 | 8080 |
| 操作 | 允许连接 |
| 规则名称 | LlamaServer |

---

## 第十步：获取本机 IP，配置 Mac 端

在 PowerShell 运行：

```powershell
ipconfig
```

找到「以太网适配器」或「WLAN」下的 **IPv4 地址**，例如 `192.168.1.100`。

在 Mac 终端验证连通性：

```bash
curl http://192.168.1.100:8080/v1/models
```

返回 JSON = 连通成功。

Mac 项目 `.env.local` 填写：

```env
LLM_API_URL=http://192.168.1.100:8080/v1
LLM_API_KEY=sk-no-key-required
```

---

## 完成 ✅

服务正常运行时的资源占用：

| 资源 | 占用 |
|------|------|
| VRAM | ~15 GB（模型 12.5 + KV Cache 2.0）|
| 内存 | ~3 GB |
| 生成速度 | 20-35 tokens/s |
| GPU 利用率（生成中）| 85-99% |

---

## 开机自启（可选）

按 `Win + R` → 输入 `shell:startup` → 将 `start-llm.bat` 的**快捷方式**拖入该文件夹。

---

## 常见问题

### A：运行 --list-devices 只看到 CPU，没有 CUDA

`D:\llama\` 里缺少 CUDA 相关 dll，解决方法：

1. 下载安装 CUDA Toolkit 12.8：https://developer.nvidia.com/cuda-downloads
2. 安装完成后，把以下路径里的所有 dll 复制到 `D:\llama\`：
   ```
   C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin\
   ```
3. 重新运行 `--list-devices`

---

### B：启动时 CUDA out of memory

显存不够，按顺序尝试：

```batch
# 先缩小 context（改脚本里这一行）
--ctx-size 8192

# 还不行，再减少 GPU 层数（会用到内存，略慢但不崩）
--n-gpu-layers 40
```

---

### C：Mac 能 ping 通 Windows 但 curl 失败

- 确认防火墙已放行 8080（第九步）
- 确认脚本里 `--host` 是 `0.0.0.0` 不是 `127.0.0.1`

---

### D：生成速度 < 5 tokens/s

运行 `nvidia-smi`，查看 GPU 利用率是否接近 100%。

如果 GPU 利用率很低，说明模型有层落到了内存，把 `--n-gpu-layers` 改大或确认 VRAM 够用。
