"""design-agent node — 生成设计风格 demo.html"""
import os
import time
from langchain_core.messages import AIMessage
from ...prompts.design import SYSTEM_PROMPT
from ..state import ThreadState, AgentDispatch
from ._runner import run_agent_streaming


def design_node(state: ThreadState) -> dict:
    """流式调用 Claude CLI 生成设计风格 demo.html"""
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
    prd_path = os.path.join(output_dir, "PRD.md")
    research_design_path = os.path.join(output_dir, "research-design.md")
    has_prd = os.path.exists(prd_path)
    has_research_design = os.path.exists(research_design_path)

    input_files_lines = []
    if has_prd:
        input_files_lines.append(f"- {prd_path}: PRD 文档（含产品概述+功能需求+设计指引）")
    else:
        input_files_lines.append("- PRD.md: 不存在（需基于用户需求直接设计）")
    if has_research_design:
        input_files_lines.append(f"- {research_design_path}: 设计色彩报告（含配色方案+字体趋势+视觉风格）")
    else:
        input_files_lines.append("- research-design.md: 不存在（仅基于 PRD 提炼设计方向）")
    input_files_section = "\n".join(input_files_lines)

    # 从上下文快照中获取上游摘要（如有）
    prd_summary = context.get("prd_summary", "暂无 PRD 摘要")
    design_keywords = context.get("design_keywords", "暂无设计关键词")

    prompt = f"""
<task-handoff>
<task-id>phase0-step3-design-1</task-id>
<from>phase0-orchestrator</from>
<to>design-agent</to>
<project>{project_name}</project>
<output-dir>{output_dir}</output-dir>

<objective>基于 PRD 和设计调研，生成设计风格方向的可视化参考 demo.html</objective>

<context-snapshot>
- 核心需求：{user_requirement}
- 项目名称：{project_name}
- 输出路径：{output_dir}
- PRD 可用：{'是' if has_prd else '否'}
- 设计色彩报告可用：{'是' if has_research_design else '否'}
- PRD 摘要：{prd_summary}
- 设计关键词：{design_keywords}
</context-snapshot>

<input-files>
{input_files_section}
</input-files>

<deliverables>
- demo.html: 设计风格参考页（配色+字体+组件+布局+动效，可在浏览器直接打开）
</deliverables>

<self-check>
- [ ] demo.html 包含完整设计令牌系统（OKLCH 颜色、间距、字体、阴影、圆角、动效）
- [ ] 通过 Anti AI Slop Test（无烂大街字体、无紫蓝渐变、无卡片套卡片）
- [ ] 响应式 Mobile-First，至少 3 个断点
- [ ] 所有文字对比度 ≥ WCAG AA
</self-check>
</task-handoff>

用户原始需求：{user_requirement}

{'请先读取 ' + prd_path + ' 获取产品定位和设计指引。' if has_prd else '无 PRD 文档，请基于用户需求直接确定设计方向。'}
{'请读取 ' + research_design_path + ' 获取设计趋势和配色灵感。' if has_research_design else '无设计色彩报告，请基于 PRD 和行业经验确定配色方案。'}

请将 demo.html 保存到 {output_dir}/ 目录下。
"""

    retry_count = state.get("_retry_count", 0)
    validation_issues = state.get("_validation_issues", [])
    if retry_count > 0 and validation_issues:
        prompt += f"\n\n⚠️ 上次执行的产出物验证失败，问题：{'; '.join(validation_issues)}\n请针对以上问题重新生成，确保 demo.html 包含完整的 CSS 设计令牌（--color-primary 等 CSS 变量）。"

    started_at = time.time()
    result = run_agent_streaming(
        prompt=prompt,
        cwd=output_dir,
        system_prompt=SYSTEM_PROMPT,
        thread_id=thread_id,
        agent_type="design-agent",
    )

    dispatch = AgentDispatch(
        task_id="phase0-step3-design-1",
        agent_type="design-agent",
        objective=f"生成设计风格 demo.html: {project_name}",
        status="completed" if result.success else "failed",
        deliverables=["demo.html"],
        started_at=started_at,
        completed_at=time.time(),
        cost_usd=result.cost_usd,
        output_summary=result.output[:200] if result.output else "执行失败",
    )

    artifacts = []
    demo_path = os.path.join(output_dir, "demo.html")
    if os.path.exists(demo_path):
        artifacts.append(demo_path)

    return {
        "messages": [AIMessage(content=f"**[design-agent]** {'设计风格 demo 生成完成' if result.success else '设计风格 demo 生成失败'}\n\n{result.output[:500] if result.output else '无输出'}")],
        "dispatches": [dispatch],
        "artifacts": artifacts,
    }
