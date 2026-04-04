"""
全局事件总线 — 让 LangGraph node 能实时推事件到 SSE 端点

用法：
- SSE 端点启动时 create_channel(thread_id)，结束时 remove_channel(thread_id)
- Node 执行时 push_event(thread_id, event) 推中间事件
- SSE 端点用 async for event in iter_events(thread_id) 消费事件
"""
import asyncio
import queue
import threading
from typing import Any

# 每个 thread_id 一个 queue
_channels: dict[str, queue.Queue] = {}
_lock = threading.Lock()


def create_channel(thread_id: str) -> None:
    with _lock:
        _channels[thread_id] = queue.Queue()


def remove_channel(thread_id: str) -> None:
    with _lock:
        _channels.pop(thread_id, None)


def push_event(thread_id: str, event: dict) -> None:
    """Node 内部调用：推一个事件到对应 thread 的 channel"""
    with _lock:
        ch = _channels.get(thread_id)
    if ch is not None:
        ch.put(event)


def push_sentinel(thread_id: str) -> None:
    """标记 channel 结束"""
    push_event(thread_id, None)


def get_channel(thread_id: str) -> queue.Queue | None:
    with _lock:
        return _channels.get(thread_id)
