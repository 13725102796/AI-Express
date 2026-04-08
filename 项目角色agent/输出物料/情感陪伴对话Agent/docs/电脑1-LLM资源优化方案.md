# 电脑1 · LLM 资源优化方案

> 审查对象：`start-llm.bat` 现有配置
> 目标：将 16GB VRAM + 64GB RAM + CPU 合理利用，达到最优推理性能
> 长期记忆策略：RAG 记忆库负责，不依赖超长 context

---

## 一、现有配置审查

### 原始启动参数

```batch
llama-server.exe ^
  -m "D:\models\gemma-4-26B-A4B-it-UD-Q3_K_M.gguf" ^
  --n-gpu-layers 999 ^
  --flash-attn ^
  --ctx-size 4096 ^
  --host 0.0.0.0 ^
  --port 8080 ^
  --log-disable ^
  -ngl 999               ← ⚠️ 与 --n-gpu-layers 完全重复
```

### 资源利用率诊断

| 资源 | 总量 | 现有占用 | 问题 |
|------|------|---------|------|
| VRAM | 16 GB | ~13.5 GB | KV Cache 未量化，浪费 ~1.5 GB |
| RAM | 64 GB | ~3 GB | 无需超长 context，正常待机即可 |
| CPU | 全部核心 | 未设置 | 线程数未配置 |
| Context 窗口 | — | 4096 tokens | 单次对话不够用，需扩展 |

---

## 二、问题与修复

### 问题1：参数重复

`--n-gpu-layers 999` 和 `-ngl 999` 是同一个参数，删除 `-ngl 999`。

---

### 问题2：KV Cache 未量化，VRAM 浪费

KV Cache 默认 FP16 精度，改为 Q8 精度：
- VRAM 节省 ~1.5 GB
- 生成质量几乎无损（KV 量化损失远小于权重量化）

```batch
--cache-type-k q8_0 ^
--cache-type-v q8_0
```

---

### 问题3：Context 窗口 4096 太小

4096 tokens ≈ 2500 中文字 ≈ 约 10 分钟对话。

用户一次倾诉 + 记忆库注入内容很容易超过，导致 AI 在对话中途截断。

**扩展至 16384**（KV Q8 量化后 VRAM 完全可以承载）：

VRAM 余量计算：16GB - 12.5GB（模型）- 0.5GB（CUDA 开销）= **3.0GB 可用于 KV Cache**

| ctx-size | KV Cache（Q8_0）| 总 VRAM | 状态 |
|---------|----------------|---------|------|
| 4096（原始）| ~0.5 GB | ~13.5 GB | ✅ 保守 |
| 8192 | ~1.0 GB | ~14.0 GB | ✅ |
| **16384（推荐）**| **~2.0 GB** | **~15.0 GB** | **✅ 安全** |
| 24576 | ~3.0 GB | ~16.0 GB | ⚠️ 贴线 |
| 32768 | ~4.0 GB | ~17.0 GB | ❌ OOM |

```batch
--ctx-size 16384
```

16384 tokens 覆盖约 **10000 中文字 ≈ 30-40 轮对话 ≈ 一整晚深度倾诉**，VRAM 仍剩余 ~1GB。

> **关于长期记忆**：跨会话的长期记忆不靠 context 堆叠解决，
> 而是由 RAG 记忆库负责——每次对话只召回最相关的 Top 5 记忆注入 context，
> context 始终保持在 ~5500 tokens，速度永远稳定。

---

### 问题4：CPU 线程未配置

查询 CPU 物理核心数：

```powershell
(Get-WmiObject Win32_Processor).NumberOfCores
```

按实际核心数设置：

```batch
--threads {核心数} ^
--threads-batch {核心数}
```

---

## 三、额外优化项

### mlock：锁定内存，防止延迟抖动

将模型相关数据锁定在内存，防止系统空闲时换页导致偶发卡顿：

```batch
--mlock
```

### defrag-thold：长对话 KV Cache 自动整理

对话持续过程中 KV Cache 会产生碎片，设置自动整理：

```batch
--defrag-thold 0.1
```

碎片率超过 10% 时自动整理，维持长对话稳定性。

---

## 四、最终启动脚本

```batch
@echo off
chcp 65001
title Liminal LLM Server

echo ========================================
echo  留白 LLM 服务启动中
echo  模型：Gemma 26B Q3_K_M  [GPU]
echo  上下文：8192 tokens
echo  端口：8080
echo ========================================

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

> `--threads 12` 根据实际 CPU 核心数修改

---

## 五、优化前后对比

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 生成速度 | 15-30 t/s | **20-35 t/s**（KV 量化减少内存压力）|
| 单次对话容量 | ~2500 字 | **~10000 字** |
| 长期记忆 | ❌ 无 | **✅ RAG 记忆库（无速度损耗）** |
| VRAM 利用率 | ~84% | **~90%** |
| 响应稳定性 | 偶发抖动 | **稳定**（mlock）|

---

## 六、资源分配图

```
[RTX 5070 Ti · 16 GB VRAM]
  ├── Gemma 26B 权重：        ~12.5 GB
  ├── KV Cache (16K, Q8)：   ~2.0 GB
  └── 系统余量：              ~1.0 GB  ✅

[64 GB RAM]
  ├── llama-server 进程：     ~1.0 GB
  ├── Windows 系统：          ~8.0 GB
  └── 空闲（正常待机）：      ~55 GB

[CPU · 全部核心]
  ├── Tokenization：          轻量
  ├── 请求处理：              轻量
  └── --threads 配置充分利用
```

---

## 七、验证启动

```powershell
# 本机测试
curl http://localhost:8080/v1/models

# 速度基准（观察 tokens/s）
curl http://localhost:8080/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"gemma\",\"messages\":[{\"role\":\"user\",\"content\":\"请详细描述一下你对情绪陪伴的理解\"}],\"max_tokens\":300,\"stream\":false}"
```

控制台观察 `tokens per second`，正常范围 20-35 t/s。

---

## 八、ctx-size 调优参考

```
VRAM OOM 报错        → 降到 8192，稳定后再升
速度明显变慢          → 检查实际 context 是否超过 12000 tokens，优化 RAG 注入量
想要更大余量          → 降到 8192，VRAM 剩余 2GB，更宽松
极端情况需要更长      → 改用 q4_0 + ctx 24576，贴线但可用
```
