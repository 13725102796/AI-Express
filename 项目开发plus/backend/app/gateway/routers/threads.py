"""
会话管理 + 图执行（SSE 流式） — SQLite 持久化
"""
from __future__ import annotations

import asyncio
import json
import queue
import threading
import time
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from loguru import logger
from pydantic import BaseModel

from aiexpress.agents.entry import make_lead_agent
from aiexpress import store
from aiexpress.event_bus import create_channel, remove_channel, get_channel, push_sentinel

router = APIRouter()

_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = make_lead_agent()
    return _graph


class CreateThreadRequest(BaseModel):
    title: str | None = None


class RunRequest(BaseModel):
    message: str
    project_name: str | None = None


# ---- 会话 CRUD ----

@router.post("")
async def create_thread_endpoint(req: CreateThreadRequest | None = None):
    title = (req.title if req and req.title else None) or "新项目"
    return store.create_thread(title)


@router.get("")
async def list_threads_endpoint():
    threads = store.list_threads()
    # 附带 token 统计
    for t in threads:
        t["token_summary"] = store.get_token_summary(t["id"])
    return threads


@router.get("/{thread_id}")
async def get_thread_endpoint(thread_id: str):
    t = store.get_thread(thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    t["token_summary"] = store.get_token_summary(thread_id)
    return t


@router.delete("/{thread_id}")
async def delete_thread_endpoint(thread_id: str):
    store.delete_thread(thread_id)
    return {"ok": True}


@router.get("/{thread_id}/messages")
async def get_messages_endpoint(thread_id: str):
    """获取会话的所有消息历史"""
    t = store.get_thread(thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")
    messages = store.get_messages(thread_id)
    return {"messages": messages, "token_summary": store.get_token_summary(thread_id)}


# ---- 图执行（SSE 流式） ----

@router.post("/{thread_id}/run/stream")
async def stream_thread(thread_id: str, req: RunRequest):
    """SSE 流式执行图"""
    message = req.message
    project_name = req.project_name
    t = store.get_thread(thread_id)
    if not t:
        raise HTTPException(404, "Thread not found")

    # 保存用户消息到 DB
    store.add_message(thread_id, "user", message)

    create_channel(thread_id)
    step_queue: queue.Queue = queue.Queue()

    def _run_graph(input_state: dict):
        graph = get_graph()
        final_state = input_state.copy()

        try:
            for step in graph.stream(input_state, stream_mode="updates"):
                for node_name, update in step.items():
                    if update is None:
                        continue

                    step_messages = []
                    for m in update.get("messages", []):
                        if hasattr(m, "type") and m.type == "ai":
                            step_messages.append(m.content)

                    step_queue.put({
                        "type": "step",
                        "node": node_name,
                        "messages": step_messages,
                        "dispatches": update.get("dispatches", []),
                        "artifacts": update.get("artifacts", []),
                        "current_phase": update.get("current_phase"),
                        "project_name": update.get("project_name"),
                    })

                    # 保存 AI 消息到 DB
                    for msg_text in step_messages:
                        store.add_message(thread_id, "assistant", msg_text, agent_type=node_name)

                    for key in ["messages", "dispatches", "artifacts", "context_snapshot",
                                 "project_name", "output_dir", "current_phase", "phase_statuses"]:
                        if key in update and update[key] is not None:
                            if key == "messages":
                                final_state.setdefault("messages", [])
                                final_state["messages"].extend(update["messages"])
                            elif key in ("dispatches", "artifacts"):
                                final_state.setdefault(key, [])
                                final_state[key].extend(update[key])
                            else:
                                final_state[key] = update[key]

            step_queue.put({
                "type": "done",
                "dispatches": final_state.get("dispatches", []),
                "artifacts": final_state.get("artifacts", []),
                "current_phase": final_state.get("current_phase", -1),
                "project_name": final_state.get("project_name", ""),
            })

            # 更新 thread 元数据到 DB
            store.update_thread(
                thread_id,
                title=final_state.get("project_name") or t.get("title", "新项目"),
                project_name=final_state.get("project_name", ""),
                current_phase=final_state.get("current_phase", -1),
                output_dir=final_state.get("output_dir", ""),
                state_json=json.dumps({
                    k: v for k, v in final_state.items()
                    if k in ("project_name", "output_dir", "current_phase", "context_snapshot",
                             "phase_statuses", "_retry_count", "_validation_result")
                }, default=str),
            )

        except Exception as e:
            logger.error(f"图执行错误: {e}")
            step_queue.put({"type": "error", "message": str(e)})
        finally:
            step_queue.put(None)
            push_sentinel(thread_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        # 从 DB 恢复 state
        state_json = t.get("state_json", "{}")
        try:
            prev_state = json.loads(state_json) if state_json else {}
        except Exception:
            prev_state = {}

        # 恢复 LangGraph messages（从 DB 消息历史重建）
        db_messages = store.get_messages(thread_id)
        lc_messages = []
        for m in db_messages:
            if m["role"] == "user":
                lc_messages.append(HumanMessage(content=m["content"]))
            # AI 消息不需要放回 LangGraph state（CLI 每次独立调用）

        input_state = {
            "messages": lc_messages + [HumanMessage(content=message)],
            "project_name": project_name or prev_state.get("project_name", ""),
            "output_dir": prev_state.get("output_dir", ""),
            "current_phase": prev_state.get("current_phase", -1),
            "phase_statuses": prev_state.get("phase_statuses", []),
            "dispatches": [],
            "artifacts": [],
            "context_snapshot": prev_state.get("context_snapshot", {}),
            "_validation_result": "pass",
            "_validation_issues": [],
            "_retry_count": 0,
            "_thread_id": thread_id,
        }

        yield f"data: {json.dumps({'type': 'start', 'thread_id': thread_id})}\n\n"

        bg_thread = threading.Thread(target=_run_graph, args=(input_state,), daemon=True)
        bg_thread.start()

        graph_done = False
        bus_channel = get_channel(thread_id)
        max_wait_seconds = 900
        started_at = time.time()

        try:
            while not graph_done or (bus_channel and not bus_channel.empty()):
                if time.time() - started_at > max_wait_seconds:
                    logger.error(f"SSE 超时 ({max_wait_seconds}s)")
                    yield f"data: {json.dumps({'type': 'error', 'message': f'执行超时（{max_wait_seconds}秒）'})}\n\n"
                    break

                if bus_channel:
                    try:
                        bus_event = bus_channel.get_nowait()
                        if bus_event is None:
                            pass
                        else:
                            # 保存 token_usage 到 DB
                            if bus_event.get("type") == "token_usage":
                                store.add_token_usage(
                                    thread_id,
                                    bus_event.get("agent", ""),
                                    bus_event.get("input_tokens", 0),
                                    bus_event.get("output_tokens", 0),
                                    bus_event.get("cache_creation_tokens", 0),
                                    bus_event.get("cache_read_tokens", 0),
                                )
                            yield f"data: {json.dumps(bus_event, ensure_ascii=False, default=str)}\n\n"
                        continue
                    except queue.Empty:
                        pass

                try:
                    step_event = step_queue.get_nowait()
                    if step_event is None:
                        graph_done = True
                        continue
                    yield f"data: {json.dumps(step_event, ensure_ascii=False, default=str)}\n\n"
                    continue
                except queue.Empty:
                    pass

                await asyncio.sleep(0.1)

        finally:
            remove_channel(thread_id)

        yield f"data: {json.dumps({'type': 'end'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
