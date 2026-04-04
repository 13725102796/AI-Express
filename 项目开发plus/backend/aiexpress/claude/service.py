"""
Claude Code CLI 封装服务

通过 subprocess 调用 claude CLI，支持同步和流式两种模式。
参考：repair_agent/agent/claude_service.py

关键注意事项（实测验证）：
- 必须 unset CLAUDECODE 环境变量，否则嵌套调用报错
- --output-format stream-json 必须搭配 --verbose
- Hook 事件（type=system, subtype=hook_*）需要过滤
- 速率限制（rate_limit_event）需要检查并等待
"""
import json
import os
import subprocess
import time
from dataclasses import dataclass, field
from typing import Generator

from loguru import logger

from ..config import config as app_config


@dataclass
class ClaudeEvent:
    """单个 CLI 流式事件"""
    type: str               # system | assistant | result | rate_limit_event
    subtype: str | None = None
    data: dict = field(default_factory=dict)
    raw: str = ""


@dataclass
class ClaudeResult:
    """CLI 执行完整结果"""
    success: bool
    output: str                     # 最终文本输出
    events: list[dict] = field(default_factory=list)
    session_id: str | None = None
    cost_usd: float = 0.0
    duration_ms: int = 0
    usage: dict = field(default_factory=dict)


class ClaudeService:
    """通过 CLI 调用 Claude Code"""

    def __init__(
        self,
        cli_path: str | None = None,
        model: str | None = None,
        effort: str | None = None,
        timeout: int | None = None,
    ):
        self.cli_path = cli_path or app_config.claude.cli_path
        self.model = model or app_config.claude.model
        self.effort = effort or app_config.claude.effort
        self.timeout = timeout or app_config.claude.timeout

    def _build_cmd(
        self,
        prompt: str,
        system_prompt: str | None = None,
        allowed_tools: str | None = None,
        stream: bool = True,
    ) -> list[str]:
        cmd = [
            self.cli_path,
            "-p", prompt,
            "--model", self.model,
            "--effort", self.effort,
            "--dangerously-skip-permissions",
        ]
        if stream:
            cmd.extend(["--output-format", "stream-json", "--verbose"])
        if system_prompt:
            cmd.extend(["--system-prompt", system_prompt])
        if allowed_tools:
            cmd.extend(["--allowedTools", allowed_tools])
        return cmd

    def _clean_env(self) -> dict:
        """构建干净的环境变量（移除 CLAUDECODE 防止嵌套错误）"""
        env = os.environ.copy()
        env.pop("CLAUDECODE", None)
        return env

    def execute(
        self,
        prompt: str,
        cwd: str,
        system_prompt: str | None = None,
        allowed_tools: str | None = None,
    ) -> ClaudeResult:
        """同步执行：等待 CLI 完成，返回全部结果"""
        cmd = self._build_cmd(prompt, system_prompt, allowed_tools, stream=True)
        logger.info(f"Claude CLI 执行 (cwd={cwd}, prompt长度={len(prompt)})")

        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                env=self._clean_env(),
            )

            events = []
            output_text = ""
            session_id = None
            cost_usd = 0.0
            duration_ms = 0
            usage = {}

            for line in result.stdout.strip().split("\n"):
                if not line.strip():
                    continue
                try:
                    event = json.loads(line)
                    events.append(event)

                    etype = event.get("type", "")
                    esubtype = event.get("subtype", "")

                    if etype == "system" and esubtype == "init":
                        session_id = event.get("session_id")

                    elif etype == "assistant":
                        msg = event.get("message", {})
                        for block in msg.get("content", []):
                            if block.get("type") == "text":
                                output_text = block.get("text", "")

                    elif etype == "result":
                        output_text = event.get("result", output_text)
                        cost_usd = event.get("total_cost_usd", 0.0)
                        duration_ms = event.get("duration_ms", 0)
                        usage = event.get("usage", {})

                except json.JSONDecodeError:
                    pass

            success = result.returncode == 0
            if not success:
                logger.error(f"Claude CLI 失败 (code={result.returncode})")
                if not output_text:
                    output_text = result.stderr or "未知错误"

            return ClaudeResult(
                success=success,
                output=output_text,
                events=events,
                session_id=session_id,
                cost_usd=cost_usd,
                duration_ms=duration_ms,
                usage=usage,
            )

        except subprocess.TimeoutExpired:
            logger.error(f"Claude CLI 超时 ({self.timeout}s)")
            return ClaudeResult(success=False, output="执行超时")
        except FileNotFoundError:
            logger.error(f"Claude CLI 未找到: {self.cli_path}")
            return ClaudeResult(success=False, output="Claude CLI 未安装")
        except Exception as e:
            logger.error(f"Claude CLI 异常: {e}")
            return ClaudeResult(success=False, output=str(e))

    def stream(
        self,
        prompt: str,
        cwd: str,
        system_prompt: str | None = None,
        allowed_tools: str | None = None,
    ) -> Generator[ClaudeEvent, None, None]:
        """流式执行：逐行 yield 事件，用于驱动前端实时更新"""
        cmd = self._build_cmd(prompt, system_prompt, allowed_tools, stream=True)
        logger.info(f"Claude CLI 流式执行 (cwd={cwd})")

        process = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=self._clean_env(),
        )

        try:
            for line in process.stdout:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    etype = data.get("type", "")
                    esubtype = data.get("subtype", "")

                    # 过滤 hook 噪音
                    if etype == "system" and esubtype.startswith("hook_"):
                        continue

                    # 检查速率限制
                    if etype == "rate_limit_event":
                        info = data.get("rate_limit_info", {})
                        if info.get("status") != "allowed":
                            resets_at = info.get("resetsAt", 0)
                            wait = min(max(0, resets_at - time.time()), 300)  # 最多等 5 分钟
                            logger.warning(f"速率限制，等待 {wait:.0f}s")
                            yield ClaudeEvent(type=etype, data=data, raw=line)
                            if wait > 0:
                                time.sleep(wait)  # 真正等待
                            continue

                    yield ClaudeEvent(
                        type=etype,
                        subtype=esubtype if esubtype else None,
                        data=data,
                        raw=line,
                    )

                except json.JSONDecodeError:
                    continue

            process.wait(timeout=self.timeout)

        except Exception:
            process.kill()
            raise
        finally:
            if process.poll() is None:
                process.kill()


# 全局单例
claude_service = ClaudeService()
