"""
M3: LLM 调用服务 — 本地 Claude CLI 模式 + API 模式双轨

优先使用本地 claude 命令行工具（无需 API key），
如果 CLI 不可用则 fallback 到 OpenAI 兼容 API。

参考: agent-auto/src/agent-cli.ts 的 spawn claude 子进程模式
"""
import json
import asyncio
import shutil
import subprocess
from typing import AsyncGenerator
from loguru import logger

from app.config import get_settings

settings = get_settings()

# 检测本地 claude CLI 是否可用
CLAUDE_CLI_PATH = (
    settings.CLAUDE_CLI_PATH
    if hasattr(settings, "CLAUDE_CLI_PATH") and settings.CLAUDE_CLI_PATH
    else shutil.which("claude")
    or "/Users/maidong/.local/bin/claude"
)


def _cli_available() -> bool:
    """检查 claude CLI 是否可执行"""
    try:
        result = subprocess.run(
            [CLAUDE_CLI_PATH, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except Exception:
        return False


USE_CLI = _cli_available()
logger.info(f"LLM 模式: {'本地 Claude CLI ({CLAUDE_CLI_PATH})' if USE_CLI else 'OpenAI 兼容 API'}")


class LLMService:
    """LLM 服务 — 本地 CLI 优先，API fallback"""

    def __init__(self):
        self.use_cli = USE_CLI
        self.cli_path = CLAUDE_CLI_PATH

        # API fallback（如果配置了 API key）
        if not self.use_cli:
            try:
                from openai import AsyncOpenAI
                self.client = AsyncOpenAI(
                    api_key=settings.OPENAI_API_KEY,
                    base_url=settings.OPENAI_BASE_URL,
                )
                self.model = settings.LLM_MODEL
            except Exception:
                self.client = None
                logger.warning("OpenAI client 初始化失败，LLM 服务不可用")

    # ========== 同步调用 ==========

    async def chat_completion(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> dict:
        """
        非流式 LLM 调用。
        返回: {"content": str, "usage": {"prompt_tokens": int, "completion_tokens": int}}
        """
        if self.use_cli:
            return await self._cli_chat(messages)
        else:
            return await self._api_chat(messages, temperature, max_tokens)

    async def _cli_chat(self, messages: list[dict]) -> dict:
        """通过 claude CLI 子进程调用"""
        prompt = self._messages_to_prompt(messages)

        try:
            process = await asyncio.create_subprocess_exec(
                self.cli_path,
                "-p", prompt,
                "--output-format", "json",
                "--max-turns", "1",
                "--model", "haiku",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={
                    **dict(__import__("os").environ),
                    "CLAUDECODE": "",
                },
            )

            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=120,
            )

            stdout_text = stdout.decode("utf-8").strip()

            if not stdout_text:
                raise Exception(f"Claude CLI 无输出, stderr: {stderr.decode()[:500]}")

            # 解析 JSON 输出
            try:
                result_json = json.loads(stdout_text)
                content = result_json.get("result", stdout_text)
                cost = result_json.get("cost_usd", 0)
            except json.JSONDecodeError:
                # 非 JSON 输出，直接用原文
                content = stdout_text
                cost = 0

            logger.info(f"Claude CLI 调用完成 (cost=${cost:.4f})")

            return {
                "content": content,
                "usage": {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "cost_usd": cost,
                },
            }

        except asyncio.TimeoutError:
            logger.error("Claude CLI 调用超时 (120s)")
            raise Exception("LLM 调用超时")
        except Exception as e:
            logger.error(f"Claude CLI 调用失败: {e}")
            raise

    async def _api_chat(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
    ) -> dict:
        """通过 OpenAI 兼容 API 调用（fallback）"""
        if not self.client:
            raise Exception("LLM 服务不可用: 无 CLI 且无 API key")

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return {
            "content": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            },
        }

    # ========== 流式调用 ==========

    async def chat_completion_stream(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> AsyncGenerator[str, None]:
        """
        流式 LLM 调用，逐 chunk 生成。
        Yield SSE 格式字符串。
        """
        if self.use_cli:
            async for chunk in self._cli_stream(messages):
                yield chunk
        else:
            async for chunk in self._api_stream(messages, temperature, max_tokens):
                yield chunk

    async def _cli_stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """
        Claude CLI 流式输出。

        claude CLI 本身不支持 SSE 流式，但我们可以：
        1. 先用 --output-format stream-json 获取流式输出（如果支持）
        2. 或者用非流式调用，但把结果按句子拆分模拟流式
        """
        prompt = self._messages_to_prompt(messages)

        try:
            # 尝试使用 stream-json 模式
            process = await asyncio.create_subprocess_exec(
                self.cli_path,
                "-p", prompt,
                "--output-format", "stream-json",
                "--max-turns", "1",
                "--model", "haiku",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={
                    **dict(__import__("os").environ),
                    "CLAUDECODE": "",
                },
            )

            full_content = ""

            # 逐行读取 stdout，每行是一个 JSON 事件
            async for line_bytes in process.stdout:
                line = line_bytes.decode("utf-8").strip()
                if not line:
                    continue

                try:
                    event = json.loads(line)
                    event_type = event.get("type", "")

                    if event_type == "assistant" and "message" in event:
                        # 消息开始
                        pass
                    elif event_type == "content_block_delta":
                        delta = event.get("delta", {}).get("text", "")
                        if delta:
                            full_content += delta
                            yield f"event: text_delta\ndata: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"
                    elif event_type == "result":
                        # 最终结果
                        result_text = event.get("result", "")
                        if result_text and not full_content:
                            full_content = result_text
                            # 按句子拆分模拟流式
                            for sentence in self._split_sentences(result_text):
                                yield f"event: text_delta\ndata: {json.dumps({'delta': sentence}, ensure_ascii=False)}\n\n"
                                await asyncio.sleep(0.02)
                except json.JSONDecodeError:
                    # 非 JSON 行，可能是普通文本
                    if line:
                        full_content += line
                        yield f"event: text_delta\ndata: {json.dumps({'delta': line}, ensure_ascii=False)}\n\n"

            await process.wait()

            # 如果 stream-json 没有产出 content_block_delta，用 result
            if not full_content:
                # Fallback: 用非流式模式调用
                result = await self._cli_chat(messages)
                full_content = result["content"]
                for sentence in self._split_sentences(full_content):
                    yield f"event: text_delta\ndata: {json.dumps({'delta': sentence}, ensure_ascii=False)}\n\n"
                    await asyncio.sleep(0.02)

            yield f"event: message_end\ndata: {json.dumps({'content': full_content}, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"Claude CLI 流式调用失败: {e}")
            yield f"event: error\ndata: {json.dumps({'error': 'LLM_ERROR', 'message': str(e)})}\n\n"

    async def _api_stream(
        self,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """OpenAI 兼容 API 流式调用（fallback）"""
        if not self.client:
            yield f"event: error\ndata: {json.dumps({'error': 'LLM_UNAVAILABLE', 'message': 'LLM 服务不可用'})}\n\n"
            return

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            full_content = ""
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    delta = chunk.choices[0].delta.content
                    full_content += delta
                    yield f"event: text_delta\ndata: {json.dumps({'delta': delta}, ensure_ascii=False)}\n\n"

            yield f"event: message_end\ndata: {json.dumps({'content': full_content}, ensure_ascii=False)}\n\n"

        except Exception as e:
            logger.error(f"LLM API 流式调用失败: {e}")
            yield f"event: error\ndata: {json.dumps({'error': 'LLM_ERROR', 'message': str(e)})}\n\n"

    # ========== 工具方法 ==========

    def _messages_to_prompt(self, messages: list[dict]) -> str:
        """将 messages 数组转为单个 prompt 字符串（给 claude CLI 用）"""
        parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                parts.append(f"<system>\n{content}\n</system>\n")
            elif role == "assistant":
                parts.append(f"<assistant>\n{content}\n</assistant>\n")
            else:
                parts.append(content)
        return "\n".join(parts)

    def _split_sentences(self, text: str) -> list[str]:
        """按句子/段落拆分文本，用于模拟流式输出"""
        import re
        # 按句号、换行符、分号等拆分
        sentences = re.split(r'([。！？\n；;])', text)
        result = []
        for i in range(0, len(sentences) - 1, 2):
            result.append(sentences[i] + (sentences[i + 1] if i + 1 < len(sentences) else ""))
        if len(sentences) % 2 == 1 and sentences[-1]:
            result.append(sentences[-1])
        return [s for s in result if s.strip()]


# 单例
llm_service = LLMService()
