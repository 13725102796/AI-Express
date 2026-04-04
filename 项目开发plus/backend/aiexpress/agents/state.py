"""
LangGraph 全局线程状态定义

所有 node 共享此 State，通过返回 dict 更新字段。
"""
from __future__ import annotations

import operator
from typing import Annotated, TypedDict

from langgraph.graph import MessagesState


class AgentDispatch(TypedDict):
    """单个 agent 调度记录（驱动前端流程图）"""
    task_id: str                    # phase0-step1-research-1
    agent_type: str                 # research-agent
    objective: str                  # 一句话任务目标
    status: str                     # pending | running | completed | failed
    deliverables: list[str]         # 预期产出文件名
    started_at: float | None        # 开始时间戳
    completed_at: float | None      # 完成时间戳
    cost_usd: float                 # 本次调用费用
    output_summary: str             # 一句话结果


class PhaseStep(TypedDict):
    """Phase 内单个步骤的状态"""
    step_id: str
    agent: str
    status: str                     # pending | running | completed | failed | skipped
    retry_count: int
    deliverables: dict[str, str]    # 文件名 → verified | pending | failed
    notes: str


class PhaseStatus(TypedDict):
    """单个 Phase 的状态"""
    phase: int                      # 0, 1, 2
    status: str                     # pending | in_progress | completed | failed
    current_step: str
    steps: list[PhaseStep]


def merge_dispatches(left: list[AgentDispatch], right: list[AgentDispatch]) -> list[AgentDispatch]:
    """合并 dispatches：相同 task_id 的更新，新 task_id 追加"""
    by_id = {d["task_id"]: d for d in left}
    for d in right:
        by_id[d["task_id"]] = d
    return list(by_id.values())


def merge_artifacts(left: list[str], right: list[str]) -> list[str]:
    """合并 artifacts：去重保序"""
    seen = set(left)
    result = list(left)
    for item in right:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


class ThreadState(MessagesState):
    """全局线程状态"""
    # 项目元数据
    project_name: str
    output_dir: str

    # Phase 状态
    current_phase: int
    phase_statuses: list[PhaseStatus]

    # Agent 调度记录（驱动前端流程图）
    dispatches: Annotated[list[AgentDispatch], merge_dispatches]

    # 产出物文件路径
    artifacts: Annotated[list[str], merge_artifacts]

    # 跨 Phase 上下文快照
    context_snapshot: dict

    # 内部控制
    _validation_result: str         # pass | retry | degrade
    _validation_issues: list[str]
    _retry_count: int
    _thread_id: str                 # SSE 端点注入，供 node 推事件到 event_bus
