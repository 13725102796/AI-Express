"""
Agent Node 通用执行器 — 流式调用 CLI 并实时推事件到前端

所有 agent node 用这个替代 claude_service.execute()，
这样 CLI 的每一步（thinking/text/tool_use）都实时推到前端。
"""
import time
from dataclasses import dataclass

from ...claude.service import claude_service, ClaudeResult
from ...event_bus import push_event


@dataclass
class NodeRunResult:
    """node 执行结果"""
    success: bool
    output: str
    cost_usd: float = 0.0
    duration_ms: int = 0


def run_agent_streaming(
    prompt: str,
    cwd: str,
    system_prompt: str,
    thread_id: str,
    agent_type: str,
) -> NodeRunResult:
    """
    流式执行 Claude CLI，同时把中间事件推到 event_bus。

    前端会收到：
    - {"type": "agent_status", "agent": "research-agent", "status": "running"}
    - {"type": "streaming", "node": "research-agent", "text": "..."}
    - {"type": "tool_use", "node": "research-agent", "tool": "WebSearch", "input": "..."}
    - {"type": "agent_status", "agent": "research-agent", "status": "completed"}
    """

    # 通知前端：agent 开始执行
    push_event(thread_id, {
        "type": "agent_status",
        "agent": agent_type,
        "status": "running",
        "message": f"{agent_type} 开始执行...",
    })

    full_text = ""
    cost_usd = 0.0
    started_at = time.time()
    success = True

    try:
        for event in claude_service.stream(prompt=prompt, cwd=cwd, system_prompt=system_prompt):

            if event.type == "system" and event.subtype == "init":
                push_event(thread_id, {
                    "type": "agent_status",
                    "agent": agent_type,
                    "status": "running",
                    "message": f"{agent_type} 已连接 Claude CLI",
                })

            elif event.type == "assistant":
                msg_data = event.data.get("message", {})
                for block in msg_data.get("content", []):
                    block_type = block.get("type", "")

                    if block_type == "text":
                        text = block.get("text", "")
                        full_text = text
                        push_event(thread_id, {
                            "type": "streaming",
                            "node": agent_type,
                            "text": text,
                        })

                    elif block_type == "thinking":
                        thinking = block.get("thinking", "")
                        if thinking:
                            push_event(thread_id, {
                                "type": "thinking",
                                "node": agent_type,
                                "text": thinking[:200],
                            })

                    elif block_type == "tool_use":
                        tool_name = block.get("name", "")
                        tool_input = block.get("input", {})
                        # 提取关键信息展示
                        input_summary = ""
                        if tool_name == "WebSearch":
                            input_summary = tool_input.get("query", "")
                        elif tool_name == "WebFetch":
                            input_summary = tool_input.get("url", "")[:80]
                        elif tool_name in ("Write", "FileWriteTool"):
                            input_summary = tool_input.get("file_path", "")
                        elif tool_name in ("Read", "FileReadTool"):
                            input_summary = tool_input.get("file_path", "")
                        elif tool_name in ("Grep", "GrepTool"):
                            input_summary = tool_input.get("pattern", "")
                        else:
                            input_summary = str(tool_input)[:100]

                        push_event(thread_id, {
                            "type": "tool_use",
                            "node": agent_type,
                            "tool": tool_name,
                            "input": input_summary,
                        })

            elif event.type == "result":
                result_text = event.data.get("result", "")
                if result_text:
                    full_text = result_text
                cost_usd = event.data.get("total_cost_usd", 0.0)
                is_error = event.data.get("is_error", False)
                if is_error:
                    success = False

                # 推送 token 用量
                usage = event.data.get("usage", {})
                push_event(thread_id, {
                    "type": "token_usage",
                    "agent": agent_type,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "cache_creation_tokens": usage.get("cache_creation_input_tokens", 0),
                    "cache_read_tokens": usage.get("cache_read_input_tokens", 0),
                })

    except Exception as e:
        full_text = f"执行异常: {e}"
        success = False

    duration_ms = int((time.time() - started_at) * 1000)

    # 通知前端：agent 执行完成
    push_event(thread_id, {
        "type": "agent_status",
        "agent": agent_type,
        "status": "completed" if success else "failed",
        "message": f"{agent_type} {'完成' if success else '失败'} ({duration_ms/1000:.1f}s, ${cost_usd:.4f})",
    })

    return NodeRunResult(
        success=success,
        output=full_text,
        cost_usd=cost_usd,
        duration_ms=duration_ms,
    )
