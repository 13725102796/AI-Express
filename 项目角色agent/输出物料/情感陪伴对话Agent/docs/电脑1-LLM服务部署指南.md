# 电脑1 · LLM 服务部署指南（Windows + RTX 5070 Ti）

> 目标：在 Windows 上运行 Gemma 26B，暴露 OpenAI 兼容 API 供局域网调用
> 预计完成时间：1-2 小时

---

## 前置检查清单

在开始前确认以下内容：

- [ ] RTX 5070 Ti 驱动已安装（版本 ≥ 572.x）
- [ ] 模型文件已下载到本地
- [ ] 局域网与 Mac Studio 同一路由器

---

## 一、确认 NVIDIA 驱动版本

打开 CMD 或 PowerShell，运行：

```powershell
nvidia-smi
```

输出示例：
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 572.xx    Driver Version: 572.xx    CUDA Version: 12.8          |
| GPU  Name            | Memory-Usage |
| RTX 5070 Ti          | 0MiB / 16384MiB |
```

**驱动版本必须 ≥ 572**，否则无法支持 RTX 50 系（Blackwell 架构）。

### 如果驱动版本过低，更新驱动：

1. 打开 [NVIDIA 驱动下载页](https://www.nvidia.com/Download/index.aspx)
2. 选择：GeForce → RTX 50 Series → RTX 5070 Ti → Windows 11 64-bit
3. 下载并安装（安装时选"自定义安装 → 全新安装"）
4. 重启电脑后再次运行 `nvidia-smi` 确认

---

## 二、下载 llama.cpp（预编译 CUDA 版）

### 下载地址

前往：https://github.com/ggerganov/llama.cpp/releases

找到最新 Release，下载文件名格式为：

```
llama-b{版本号}-bin-win-cuda-cu12.x.x-x64.zip
```

例如：`llama-b5000-bin-win-cuda-cu12.8.0-x64.zip`

> 注意：选 **cuda** 版本，不要选 vulkan 或 cpu 版本

### 解压

解压到固定目录，建议：

```
D:\llama\
  ├── llama-server.exe      ← 主程序
  ├── llama.dll
  ├── ggml.dll
  ├── cublas64_12.dll       ← CUDA 依赖
  └── ...（其他 dll）
```

---

## 三、放置模型文件

建议统一放在：

```
D:\models\
  ├── gemma-4-26B-A4B-it-UD-Q3_K_M.gguf   （~12.5 GB，文本模型）
  └── mmproj-F16.gguf                       （~1.2 GB，视觉模块，暂不用）
```

---

## 四、验证 GPU 可用性

在 `D:\llama\` 目录下打开 CMD，运行：

```cmd
llama-server.exe --list-devices
```

正常输出应包含：
```
CUDA devices:
  Device 0: NVIDIA GeForce RTX 5070 Ti, compute capability 10.0, VMM: yes
```

如果只显示 CPU 没有 CUDA 设备，说明 CUDA dll 缺失，见【常见问题】。

---

## 五、创建启动脚本

在 `D:\llama\` 目录下新建 `start-llm.bat`：

```batch
@echo off
chcp 65001
title Liminal LLM Server

echo ========================================
echo  留白 LLM 服务启动中...
echo  模型：Gemma 26B Q3_K_M
echo  端口：8080
echo ========================================

D:\llama\llama-server.exe ^
  -m "D:\models\gemma-4-26B-A4B-it-UD-Q3_K_M.gguf" ^
  --n-gpu-layers 999 ^
  --flash-attn ^
  --ctx-size 4096 ^
  --host 0.0.0.0 ^
  --port 8080 ^
  --log-disable ^
  -ngl 999

echo.
echo 服务已停止
pause
```

**参数详解：**

| 参数 | 值 | 说明 |
|------|-----|------|
| `-m` | 模型路径 | 指定 GGUF 文件 |
| `--n-gpu-layers 999` | 999（加载全部）| 所有层推到 GPU |
| `--flash-attn` | 开启 | KV Cache 节省 ~35% VRAM |
| `--ctx-size` | 4096 | 上下文长度，单用户够用 |
| `--host` | 0.0.0.0 | 允许局域网访问 |
| `--port` | 8080 | 服务端口 |
| `--log-disable` | — | 关闭详细日志，减少输出干扰 |

---

## 六、首次运行

双击 `start-llm.bat`，等待模型加载。

**正常加载过程（约 30-60 秒）：**

```
llm_load_tensors: ggml_backend_cuda_buffer_type_alloc_buffer: ...
llm_load_tensors: offloading 46 repeating layers to GPU
llm_load_tensors: offloaded 46/46 layers to GPU
llm_load_tensors: VRAM used: 13456.xx MiB
...
llama server listening at http://0.0.0.0:8080
```

关注这两行：
- `offloaded 46/46 layers to GPU` → 全部在 GPU，速度最快
- `VRAM used: ~13xxx MiB` → 正常范围（13-14GB）

---

## 七、验证服务可用

### 本机测试

打开新的 CMD 窗口：

```powershell
curl http://localhost:8080/v1/models
```

正常返回：
```json
{"object":"list","data":[{"id":"gemma-...","object":"model",...}]}
```

### 发送测试对话

```powershell
curl http://localhost:8080/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"gemma\",\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}],\"stream\":false}"
```

### 从 Mac 测试（在 Mac 终端执行）

先查到 Windows 的局域网 IP：

```powershell
# 在 Windows CMD 运行
ipconfig
# 找到 IPv4 地址，例如 192.168.1.100
```

Mac 终端：
```bash
curl http://192.168.1.100:8080/v1/models
```

---

## 八、防火墙放行（如果 Mac 访问不通）

Windows 搜索「Windows Defender 防火墙」→「高级设置」→「入站规则」→「新建规则」：

- 规则类型：端口
- 协议：TCP
- 端口：8080
- 操作：允许连接
- 规则名称：`LlamaServer`

---

## 九、开机自启（可选）

如果希望开机自动启动 LLM 服务：

1. 按 `Win + R`，输入 `shell:startup`
2. 将 `start-llm.bat` 的快捷方式放入该文件夹

或使用 Task Scheduler 设置为系统级服务（断开登录也能运行）。

---

## 十、VRAM 不足时的备用方案

如果启动时出现 `CUDA out of memory`，逐步减少 GPU 层数：

```batch
rem 尝试方案1：减少5层到内存
--n-gpu-layers 41

rem 尝试方案2：缩小 context
--ctx-size 2048

rem 尝试方案3：两者同时
--n-gpu-layers 38 --ctx-size 2048
```

64GB 内存完全能承载溢出的层，速度略降但不会崩溃。

---

## 十一、常见问题

### Q：运行后只显示 CPU，没有 CUDA 设备

检查 `D:\llama\` 目录中是否有 `cublas64_12.dll`，如果没有：
1. 下载 [CUDA Toolkit 12.8](https://developer.nvidia.com/cuda-downloads)
2. 安装后，将 `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin\` 下的 dll 复制到 `D:\llama\`

### Q：加载模型时卡住不动

- 确认模型文件完整（用文件管理器查看大小是否约 12.5GB）
- 尝试加参数 `--no-mmap`（Windows 内存映射有时不稳定）

### Q：Mac 能 ping 通 Windows 但 curl 失败

- 检查防火墙是否放行 8080 端口（见第八节）
- 检查 `--host` 是否设置为 `0.0.0.0` 而非 `127.0.0.1`

### Q：生成速度很慢（< 5 tokens/s）

- 运行 `nvidia-smi` 查看 GPU 利用率是否接近 100%
- 如果 GPU 利用率低，说明部分层在 CPU，增大 `--n-gpu-layers` 值

---

## 十二、正常运行时的资源占用参考

| 资源 | 占用 |
|------|------|
| VRAM | ~13.5 GB |
| 内存（RAM）| ~2-4 GB |
| GPU 利用率（生成时）| 85-99% |
| GPU 利用率（空闲时）| < 5% |
| 生成速度 | 15-30 tokens/s |

---

## 附：服务接口速查

服务启动后暴露标准 OpenAI 兼容 API：

| 接口 | 说明 |
|------|------|
| `GET  /v1/models` | 查看已加载模型 |
| `POST /v1/chat/completions` | 对话（支持流式 stream: true）|
| `POST /v1/completions` | 文本补全 |
| `GET  /health` | 健康检查 |

Mac 端 `.env.local` 配置：
```env
LLM_API_URL=http://192.168.x.x:8080/v1
LLM_API_KEY=sk-no-key-required
```
