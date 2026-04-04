"""
LangGraph 入口图 — 顶层路由

接收用户消息，根据内容路由到对应的 Phase 子图。
"""
from __future__ import annotations

import os
import time

from langchain_core.messages import AIMessage
from langgraph.graph import END, StateGraph

from ..config import config
from .state import ThreadState


def init_session(state: ThreadState) -> dict:
    """初始化会话：创建输出目录和 context"""
    project_name = state.get("project_name") or ""
    if not project_name:
        # 从用户消息中提取项目名
        import re
        msgs = state.get("messages", [])
        last_msg = msgs[-1].content if msgs else ""
        project_name = "新项目"
        # 匹配 "做/开发/创建/设计/建 一个 XXX" 模式
        patterns = [
            r"(?:做|开发|创建|设计|建|搭建)一个(.+?)(?:，|,|。|\.|$|\n|phase|Phase)",
            r"(?:我想|我要|帮我)(?:做|开发|创建|设计)(.+?)(?:，|,|。|\.|$|\n|phase|Phase)",
        ]
        for pattern in patterns:
            m = re.search(pattern, last_msg, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                # 去掉尾部的 phase 指令残留
                name = re.sub(r"[\s,，]*(?:开始|进入)?\s*$", "", name).strip()
                if name and len(name) <= 30:
                    project_name = name
                    break

    output_dir = os.path.join(os.path.abspath(config.output.base_dir), project_name)
    os.makedirs(output_dir, exist_ok=True)

    return {
        "project_name": project_name,
        "output_dir": output_dir,
        "current_phase": -1,
        "phase_statuses": [],
        "context_snapshot": {},
        "_validation_result": "pass",
        "_validation_issues": [],
        "_retry_count": 0,
    }


def route_to_phase(state: ThreadState) -> dict:
    """解析用户消息，准备路由"""
    return {}


def decide_phase(state: ThreadState) -> str:
    """条件边：根据用户消息决定去哪个 Phase

    只有明确的 Phase 指令才触发对应阶段。
    普通对话（包含"开发"等词但不是 Phase 指令）走 chat。
    """
    last_msg = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "type") and msg.type == "human":
            last_msg = msg.content.lower()
            break

    # 必须包含明确的 Phase 触发词（"开始 phase X" / "phase X" / "进入XX阶段"）
    # 不能仅凭"开发"等模糊词触发
    if any(k in last_msg for k in ["phase 0", "phase0", "开始需求", "进入需求", "需求阶段"]):
        return "phase0"
    elif any(k in last_msg for k in ["phase 1", "phase1", "开始页面设计", "进入页面设计", "页面设计阶段"]):
        return "phase1"
    elif any(k in last_msg for k in ["phase 2", "phase2", "开始开发阶段", "进入开发", "开发阶段"]):
        return "phase2"
    else:
        # 默认走普通对话——让 Claude 理解用户需求并引导用户使用 Phase
        return "chat"


def simple_chat(state: ThreadState) -> dict:
    """简单对话：不触发 Phase，用流式 CLI 调用并实时推事件"""
    from ..claude.service import claude_service
    from ..event_bus import push_event

    last_msg = ""
    thread_id = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "type") and msg.type == "human":
            last_msg = msg.content
            break

    # 从 state 中获取 thread_id（由 SSE 端点注入）
    thread_id = state.get("_thread_id", "")
    cwd = state.get("output_dir") or os.getcwd()

    # 使用流式模式执行 CLI，实时推送中间事件
    full_text = ""
    for event in claude_service.stream(prompt=last_msg, cwd=cwd):
        if event.type == "assistant":
            msg_data = event.data.get("message", {})
            for block in msg_data.get("content", []):
                if block.get("type") == "text":
                    text = block.get("text", "")
                    full_text = text  # 每次覆盖（streaming 是增量的）
                    if thread_id:
                        push_event(thread_id, {
                            "type": "streaming",
                            "node": "chat",
                            "text": text,
                        })
                elif block.get("type") == "thinking":
                    if thread_id:
                        push_event(thread_id, {
                            "type": "thinking",
                            "node": "chat",
                            "text": block.get("thinking", "")[:200],
                        })

        elif event.type == "result":
            full_text = event.data.get("result", full_text)
            cost = event.data.get("total_cost_usd", 0)
            usage = event.data.get("usage", {})
            if thread_id:
                push_event(thread_id, {
                    "type": "token_usage",
                    "agent": "chat",
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "cache_creation_tokens": usage.get("cache_creation_input_tokens", 0),
                    "cache_read_tokens": usage.get("cache_read_input_tokens", 0),
                })

    output = full_text if full_text else "（无回复）"

    return {
        "messages": [AIMessage(content=output)],
    }


def phase0_run(state: ThreadState) -> dict:
    """Phase 0 — 调用真实子图"""
    from .orchestrators.phase0 import phase0_graph
    result = phase0_graph.invoke(state)
    return result


def phase1_placeholder(state: ThreadState) -> dict:
    """Phase 1 占位（不更新 current_phase，避免误标已完成）"""
    return {
        "messages": [AIMessage(content="Phase 1（页面设计）暂未实现。请先运行 Phase 0 完成需求和设计。\n\n输入 `Phase 0` 开始。")],
    }


def phase2_placeholder(state: ThreadState) -> dict:
    """Phase 2 占位"""
    return {
        "messages": [AIMessage(content="Phase 2（开发）暂未实现。请先运行 Phase 0 和 Phase 1。\n\n输入 `Phase 0` 开始。")],
    }


def make_lead_agent():
    """构建并编译顶层路由图"""
    graph = StateGraph(ThreadState)

    graph.add_node("init", init_session)
    graph.add_node("router", route_to_phase)
    graph.add_node("chat", simple_chat)
    graph.add_node("phase0", phase0_run)
    graph.add_node("phase1", phase1_placeholder)
    graph.add_node("phase2", phase2_placeholder)

    graph.add_edge("__start__", "init")
    graph.add_edge("init", "router")
    graph.add_conditional_edges("router", decide_phase, {
        "chat": "chat",
        "phase0": "phase0",
        "phase1": "phase1",
        "phase2": "phase2",
    })
    graph.add_edge("chat", END)
    graph.add_edge("phase0", END)
    graph.add_edge("phase1", END)
    graph.add_edge("phase2", END)

    return graph.compile()
