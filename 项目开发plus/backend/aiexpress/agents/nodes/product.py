"""product-agent node — 编写 PRD 文档"""
import os
import time
from langchain_core.messages import AIMessage
from ...prompts.product import SYSTEM_PROMPT
from ..state import ThreadState, AgentDispatch
from ._runner import run_agent_streaming


def product_node(state: ThreadState) -> dict:
    """调用 Claude CLI 编写 PRD 文档，产出 PRD.md"""
    output_dir = state["output_dir"]
    project_name = state["project_name"]
    thread_id = state.get("_thread_id", "")
    user_requirement = ""
    for msg in reversed(state.get("messages", [])):
        if hasattr(msg, "type") and msg.type == "human":
            user_requirement = msg.content
            break

    context = state.get("context_snapshot", {})

    # 检查上游产出是否存在
    research_market_path = os.path.join(output_dir, "research-market.md")
    has_research = os.path.exists(research_market_path)

    input_files_section = ""
    if has_research:
        input_files_section = f"- {research_market_path}: 产研报告（由 research-agent 生成，含竞品分析+用户洞察+KANO分类）"
    else:
        input_files_section = "（无前置调研报告，需自行搜索竞品信息）"

    # 从上下文快照中获取调研摘要（如有）
    research_summary = context.get("research_summary", "暂无调研摘要")

    prompt = f"""
<task-handoff>
<task-id>phase0-step2-product-1</task-id>
<from>phase0-orchestrator</from>
<to>product-agent</to>
<project>{project_name}</project>
<output-dir>{output_dir}</output-dir>

<objective>基于用户需求和调研数据，编写结构化 PRD 文档</objective>

<context-snapshot>
- 核心需求：{user_requirement}
- 项目名称：{project_name}
- 输出路径：{output_dir}
- 调研报告可用：{'是' if has_research else '否'}
- 调研摘要：{research_summary}
</context-snapshot>

<input-files>
{input_files_section}
</input-files>

<deliverables>
- PRD.md: 产品需求文档（含功能需求+验收标准+信息架构+设计指引）
</deliverables>

<self-check>
- [ ] 每个功能都有用户故事和 Given/When/Then 验收标准
- [ ] 优先级 P0/P1/P2 已标注
- [ ] 范围边界清晰（MVP 包含/不包含/明确排除）
- [ ] 设计指引足够设计 Agent 理解风格方向
</self-check>
</task-handoff>

用户原始需求：{user_requirement}

{'请先读取 ' + research_market_path + ' 获取调研数据，作为 PRD 编写的参考素材。' if has_research else '无前置调研报告，请基于自身知识和搜索完成竞品分析。'}

请将 PRD.md 保存到 {output_dir}/ 目录下。
"""

    retry_count = state.get("_retry_count", 0)
    validation_issues = state.get("_validation_issues", [])
    if retry_count > 0 and validation_issues:
        prompt += f"\n\n⚠️ 上次执行的产出物验证失败，问题：{'; '.join(validation_issues)}\n请针对以上问题重新生成，确保 PRD 包含完整的功能需求、信息架构和设计指引章节。"

    started_at = time.time()
    result = run_agent_streaming(
        prompt=prompt,
        cwd=output_dir,
        system_prompt=SYSTEM_PROMPT,
        thread_id=thread_id,
        agent_type="product-agent",
    )

    dispatch = AgentDispatch(
        task_id="phase0-step2-product-1",
        agent_type="product-agent",
        objective=f"编写 PRD 文档: {project_name}",
        status="completed" if result.success else "failed",
        deliverables=["PRD.md"],
        started_at=started_at,
        completed_at=time.time(),
        cost_usd=result.cost_usd,
        output_summary=result.output[:200] if result.output else "执行失败",
    )

    artifacts = []
    prd_path = os.path.join(output_dir, "PRD.md")
    if os.path.exists(prd_path):
        artifacts.append(prd_path)

    return {
        "messages": [AIMessage(content=f"**[product-agent]** {'PRD 编写完成' if result.success else 'PRD 编写失败'}\n\n{result.output[:500] if result.output else '无输出'}")],
        "dispatches": [dispatch],
        "artifacts": artifacts,
    }
