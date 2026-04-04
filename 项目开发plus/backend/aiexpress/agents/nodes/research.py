"""research-agent node — 市场调研"""
import os
import time
from langchain_core.messages import AIMessage
from ...prompts.research import SYSTEM_PROMPT
from ..state import ThreadState, AgentDispatch
from ._runner import run_agent_streaming


def research_node(state: ThreadState) -> dict:
    """流式调用 Claude CLI 执行市场调研"""
    output_dir = state["output_dir"]
    project_name = state["project_name"]
    thread_id = state.get("_thread_id", "")
    user_requirement = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "type") and msg.type == "human":
            user_requirement = msg.content
            break

    prompt = f"""
<task-handoff>
<task-id>phase0-step1-research-1</task-id>
<from>phase0-orchestrator</from>
<to>research-agent</to>
<project>{project_name}</project>
<output-dir>{output_dir}</output-dir>

<objective>对「{project_name}」进行市场调研和设计趋势分析</objective>

<context-snapshot>
- 核心需求：{user_requirement}
- 项目名称：{project_name}
- 输出路径：{output_dir}
</context-snapshot>

<input-files>
（无前置输入，从零开始调研）
</input-files>

<deliverables>
- research-market.md: 产研报告（竞品分析+用户洞察+KANO分类）
- research-design.md: 设计色彩报告（3套配色方案+字体+视觉趋势）
</deliverables>

<self-check>
- [ ] 调研报告包含 ≥3 个竞品分析
- [ ] 每个结论附有数据来源
- [ ] 配色方案推荐基于行业数据
</self-check>
</task-handoff>

用户原始需求：{user_requirement}

请将所有输出文件保存到 {output_dir}/ 目录下。
"""

    # Fix 4: 重试时追加失败原因，避免相同输出
    retry_count = state.get("_retry_count", 0)
    validation_issues = state.get("_validation_issues", [])
    if retry_count > 0 and validation_issues:
        prompt += f"\n\n⚠️ 上次执行的产出物验证失败，问题：{'; '.join(validation_issues)}\n请针对以上问题重新生成，确保产出物符合要求。"

    started_at = time.time()
    result = run_agent_streaming(
        prompt=prompt,
        cwd=output_dir,
        system_prompt=SYSTEM_PROMPT,
        thread_id=thread_id,
        agent_type="research-agent",
    )

    dispatch = AgentDispatch(
        task_id="phase0-step1-research-1",
        agent_type="research-agent",
        objective=f"市场调研: {project_name}",
        status="completed" if result.success else "failed",
        deliverables=["research-market.md", "research-design.md"],
        started_at=started_at,
        completed_at=time.time(),
        cost_usd=result.cost_usd,
        output_summary=result.output[:200] if result.output else "执行失败",
    )

    artifacts = []
    for f in ["research-market.md", "research-design.md"]:
        p = os.path.join(output_dir, f)
        if os.path.exists(p):
            artifacts.append(p)

    return {
        "messages": [AIMessage(content=f"**[research-agent]** {'调研完成' if result.success else '调研失败'}\n\n{result.output[:500] if result.output else '无输出'}")],
        "dispatches": [dispatch],
        "artifacts": artifacts,
    }
