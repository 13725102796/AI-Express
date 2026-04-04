"""
Phase 0 子图 — 需求+调研+设计

流程：init → research → validate_research → product → validate_prd → design → validate_design → finalize

每个验证阶段有独立的重试计数器，最多重试 1 次（共 2 次执行机会），然后降级跳过。
重试时会修改 prompt 提示上次失败原因，避免相同输出。

最坏情况 Claude CLI 调用次数：6 次（3 agent × 各重试 1 次）
"""
import os

from langchain_core.messages import AIMessage
from langgraph.graph import END, StateGraph

from ..nodes.research import research_node
from ..nodes.product import product_node
from ..nodes.design import design_node
from ..state import ThreadState


# ==================== 验证用关键词（容错匹配） ====================

RESEARCH_KEYWORDS = ["竞品", "竞争", "对手", "同类产品", "市场参与者", "competitor", "alternative", "对比"]
PRD_SECTION_KEYWORDS = {
    "功能需求": ["功能需求", "功能模块", "Feature", "用户故事"],
    "信息架构": ["信息架构", "页面结构", "导航", "sitemap", "Information Architecture"],
    "设计指引": ["设计指引", "设计方向", "风格", "调性", "Design Guide"],
}
DESIGN_TOKEN_KEYWORDS = ["--color-primary", "--color", "oklch", "OKLCH", "color-primary"]


# ==================== 初始化 ====================

def init_phase0(state: ThreadState) -> dict:
    """初始化 Phase 0 状态"""
    output_dir = state["output_dir"]
    os.makedirs(output_dir, exist_ok=True)

    return {
        "current_phase": 0,
        "messages": [AIMessage(content="**Phase 0 启动** — 开始执行需求调研 → PRD 编写 → 设计风格探索")],
        "_validation_result": "pass",
        "_validation_issues": [],
        "_retry_count": 0,
    }


# ==================== 通用验证逻辑 ====================

def _check_file(output_dir: str, filename: str, min_size: int) -> list[str]:
    """检查文件是否存在且大小足够"""
    issues = []
    path = os.path.join(output_dir, filename)
    if not os.path.exists(path):
        issues.append(f"{filename} 不存在")
    elif os.path.getsize(path) < min_size:
        issues.append(f"{filename} 内容过少（<{min_size}字节）")
    return issues


def _content_has_keywords(filepath: str, keywords: list[str]) -> bool:
    """检查文件内容是否包含任一关键词（容错匹配）"""
    if not os.path.exists(filepath):
        return False
    try:
        content = open(filepath, encoding="utf-8").read()
        return any(kw in content for kw in keywords)
    except Exception:
        return False


def _make_validation_result(issues: list[str], retry_count_for_this_stage: int) -> tuple[str, str]:
    """根据问题列表和当前阶段重试次数，返回 (result, message)"""
    if not issues:
        return "pass", "验证通过"

    # 每个阶段最多重试 1 次（retry_count_for_this_stage 从 0 开始）
    if retry_count_for_this_stage < 1:
        return "retry", f"验证失败（第 {retry_count_for_this_stage + 1} 次），将重试：{'; '.join(issues)}"
    else:
        return "degrade", f"验证失败 {retry_count_for_this_stage + 1} 次，降级跳过：{'; '.join(issues)}"


# ==================== 验证节点（每阶段独立计数） ====================

def validate_research(state: ThreadState) -> dict:
    """验证调研产出物（独立重试计数）"""
    output_dir = state["output_dir"]
    issues = []

    # 文件检查
    issues.extend(_check_file(output_dir, "research-market.md", 100))
    issues.extend(_check_file(output_dir, "research-design.md", 100))

    # 内容检查（容错关键词）
    market_path = os.path.join(output_dir, "research-market.md")
    if os.path.exists(market_path) and not _content_has_keywords(market_path, RESEARCH_KEYWORDS):
        issues.append("research-market.md 缺少竞品分析内容")

    # 使用全局 _retry_count 作为本阶段计数（init 重置为 0，本阶段第一次验证时为 0）
    retry_count = state.get("_retry_count", 0)
    result, msg = _make_validation_result(issues, retry_count)

    new_retry = retry_count + 1 if issues else 0  # 通过则重置为 0 给下个阶段

    return {
        "_validation_result": result,
        "_validation_issues": issues,
        "_retry_count": new_retry if result == "retry" else 0,  # 通过或降级都重置
        "messages": [AIMessage(content=f"**[验证-调研]** {msg}")],
    }


def validate_prd(state: ThreadState) -> dict:
    """验证 PRD 产出物（独立重试计数，从 0 开始）"""
    output_dir = state["output_dir"]
    issues = []

    prd_path = os.path.join(output_dir, "PRD.md")
    issues.extend(_check_file(output_dir, "PRD.md", 200))

    if os.path.exists(prd_path) and os.path.getsize(prd_path) >= 200:
        for section_name, keywords in PRD_SECTION_KEYWORDS.items():
            if not _content_has_keywords(prd_path, keywords):
                issues.append(f"PRD.md 缺少「{section_name}」相关章节")

    # _retry_count 在上一阶段验证通过/降级时已重置为 0
    retry_count = state.get("_retry_count", 0)
    result, msg = _make_validation_result(issues, retry_count)

    new_retry = retry_count + 1 if issues else 0

    return {
        "_validation_result": result,
        "_validation_issues": issues,
        "_retry_count": new_retry if result == "retry" else 0,
        "messages": [AIMessage(content=f"**[验证-PRD]** {msg}")],
    }


def validate_design(state: ThreadState) -> dict:
    """验证设计产出物（独立重试计数，从 0 开始）"""
    output_dir = state["output_dir"]
    issues = []

    issues.extend(_check_file(output_dir, "demo.html", 500))

    demo_path = os.path.join(output_dir, "demo.html")
    if os.path.exists(demo_path) and os.path.getsize(demo_path) >= 500:
        if not _content_has_keywords(demo_path, DESIGN_TOKEN_KEYWORDS):
            issues.append("demo.html 缺少 CSS 设计令牌")

    retry_count = state.get("_retry_count", 0)
    result, msg = _make_validation_result(issues, retry_count)

    new_retry = retry_count + 1 if issues else 0

    return {
        "_validation_result": result,
        "_validation_issues": issues,
        "_retry_count": new_retry if result == "retry" else 0,
        "messages": [AIMessage(content=f"**[验证-设计]** {msg}")],
    }


# ==================== 条件边 ====================

def check_validation(state: ThreadState) -> str:
    """通用条件边函数"""
    return state.get("_validation_result", "pass")


# ==================== 收尾 ====================

def finalize_phase0(state: ThreadState) -> dict:
    """Phase 0 收尾"""
    output_dir = state["output_dir"]

    files = []
    for f in ["research-market.md", "research-design.md", "PRD.md", "demo.html"]:
        p = os.path.join(output_dir, f)
        if os.path.exists(p):
            size = os.path.getsize(p)
            files.append(f"{f} ({size:,} bytes)")

    prd_summary = ""
    prd_path = os.path.join(output_dir, "PRD.md")
    if os.path.exists(prd_path):
        prd_summary = open(prd_path, encoding="utf-8").read()[:500]

    context_snapshot = state.get("context_snapshot", {})
    context_snapshot["prd_summary"] = prd_summary
    context_snapshot["phase0_completed"] = True
    context_snapshot["phase0_files"] = files

    summary = f"""**Phase 0 完成！**

产出文件：
{chr(10).join(f'- {f}' for f in files)}

输出目录：`{output_dir}`

可以继续输入「开始 Phase 1」进入页面设计阶段。"""

    return {
        "messages": [AIMessage(content=summary)],
        "context_snapshot": context_snapshot,
    }


# ==================== 构建图 ====================

def build_phase0_graph():
    graph = StateGraph(ThreadState)

    graph.add_node("init_phase0", init_phase0)
    graph.add_node("research", research_node)
    graph.add_node("validate_research", validate_research)
    graph.add_node("product", product_node)
    graph.add_node("validate_prd", validate_prd)
    graph.add_node("design", design_node)
    graph.add_node("validate_design", validate_design)
    graph.add_node("finalize", finalize_phase0)

    graph.add_edge("__start__", "init_phase0")
    graph.add_edge("init_phase0", "research")
    graph.add_edge("research", "validate_research")

    graph.add_conditional_edges("validate_research", check_validation, {
        "pass": "product",
        "retry": "research",
        "degrade": "product",
    })

    graph.add_edge("product", "validate_prd")

    graph.add_conditional_edges("validate_prd", check_validation, {
        "pass": "design",
        "retry": "product",
        "degrade": "design",
    })

    graph.add_edge("design", "validate_design")

    graph.add_conditional_edges("validate_design", check_validation, {
        "pass": "finalize",
        "retry": "design",
        "degrade": "finalize",
    })

    graph.add_edge("finalize", END)

    return graph.compile()


phase0_graph = build_phase0_graph()
