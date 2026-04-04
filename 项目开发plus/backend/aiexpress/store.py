"""
SQLite 持久化存储 — threads + messages

表结构：
- threads: id, title, project_name, current_phase, created_at, state_json
- messages: id, thread_id, role, content, agent_type, created_at
- token_usage: id, thread_id, agent, input_tokens, output_tokens, cache_creation, cache_read, created_at
"""
import json
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from typing import Any

from loguru import logger

from .config import config

DB_PATH = os.path.join(os.path.abspath(config.output.base_dir), "workbench.db")


def _ensure_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '新项目',
            project_name TEXT NOT NULL DEFAULT '',
            current_phase INTEGER NOT NULL DEFAULT -1,
            output_dir TEXT NOT NULL DEFAULT '',
            created_at REAL NOT NULL,
            state_json TEXT NOT NULL DEFAULT '{}'
        );
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            agent_type TEXT,
            created_at REAL NOT NULL,
            FOREIGN KEY (thread_id) REFERENCES threads(id)
        );
        CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);
        CREATE TABLE IF NOT EXISTS token_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id TEXT NOT NULL,
            agent TEXT,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            cache_creation INTEGER DEFAULT 0,
            cache_read INTEGER DEFAULT 0,
            created_at REAL NOT NULL,
            FOREIGN KEY (thread_id) REFERENCES threads(id)
        );
    """)
    conn.close()


_ensure_db()


@contextmanager
def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ========== Threads ==========

def create_thread(title: str = "新项目") -> dict:
    thread_id = str(uuid.uuid4())
    now = time.time()
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO threads (id, title, created_at) VALUES (?, ?, ?)",
            (thread_id, title, now),
        )
    return {"id": thread_id, "title": title, "created_at": now}


def get_thread(thread_id: str) -> dict | None:
    with _get_conn() as conn:
        row = conn.execute("SELECT * FROM threads WHERE id = ?", (thread_id,)).fetchone()
        if row:
            return dict(row)
    return None


def list_threads() -> list[dict]:
    with _get_conn() as conn:
        rows = conn.execute("SELECT * FROM threads ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def update_thread(thread_id: str, **kwargs) -> None:
    allowed = {"title", "project_name", "current_phase", "output_dir", "state_json"}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [thread_id]
    with _get_conn() as conn:
        conn.execute(f"UPDATE threads SET {set_clause} WHERE id = ?", values)


def delete_thread(thread_id: str) -> None:
    with _get_conn() as conn:
        conn.execute("DELETE FROM messages WHERE thread_id = ?", (thread_id,))
        conn.execute("DELETE FROM token_usage WHERE thread_id = ?", (thread_id,))
        conn.execute("DELETE FROM threads WHERE id = ?", (thread_id,))


# ========== Messages ==========

def add_message(thread_id: str, role: str, content: str, agent_type: str | None = None) -> dict:
    msg_id = str(uuid.uuid4())
    now = time.time()
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO messages (id, thread_id, role, content, agent_type, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (msg_id, thread_id, role, content, agent_type, now),
        )
    return {"id": msg_id, "role": role, "content": content, "agent_type": agent_type, "timestamp": now}


def get_messages(thread_id: str) -> list[dict]:
    with _get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC",
            (thread_id,),
        ).fetchall()
        return [dict(r) for r in rows]


# ========== Token Usage ==========

def add_token_usage(thread_id: str, agent: str, input_tokens: int, output_tokens: int,
                    cache_creation: int, cache_read: int) -> None:
    with _get_conn() as conn:
        conn.execute(
            "INSERT INTO token_usage (thread_id, agent, input_tokens, output_tokens, cache_creation, cache_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (thread_id, agent, input_tokens, output_tokens, cache_creation, cache_read, time.time()),
        )


def get_token_summary(thread_id: str) -> dict:
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as calls, COALESCE(SUM(input_tokens),0) as input, COALESCE(SUM(output_tokens),0) as output, COALESCE(SUM(cache_creation),0) as cache_creation, COALESCE(SUM(cache_read),0) as cache_read FROM token_usage WHERE thread_id = ?",
            (thread_id,),
        ).fetchone()
        return dict(row) if row else {"calls": 0, "input": 0, "output": 0, "cache_creation": 0, "cache_read": 0}
