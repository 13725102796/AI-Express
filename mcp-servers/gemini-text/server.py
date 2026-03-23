"""
Gemini Text MCP Server
通过 Antigravity 反代调用 Gemini 3.1 Pro，提供文本生成能力。
用于设计分析、需求整理、风格描述等文本类任务。
"""

import os
import json
from mcp.server.fastmcp import FastMCP
from openai import OpenAI

# --- 配置 ---
GEMINI_BASE_URL = os.environ.get("GEMINI_BASE_URL", "http://127.0.0.1:8045/v1")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "not-needed")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-pro")

mcp = FastMCP(
    "gemini-text",
    description="Gemini 3.1 Pro 文本生成服务 - 设计分析、需求整理、风格描述",
)

client = OpenAI(base_url=GEMINI_BASE_URL, api_key=GEMINI_API_KEY)


@mcp.tool()
def gemini_chat(prompt: str, system_prompt: str = "") -> str:
    """
    与 Gemini 3.1 Pro 进行文本对话。

    适用场景：通用文本生成、设计方向分析、需求拆解、竞品分析等。

    Args:
        prompt: 用户提示词
        system_prompt: 系统提示词（可选），用于设定角色和行为约束
    """
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(model=GEMINI_MODEL, messages=messages)
    return response.choices[0].message.content


@mcp.tool()
def gemini_design_analyze(
    requirement: str,
    reference_description: str = "",
    style_preference: str = "",
) -> str:
    """
    让 Gemini 3.1 Pro 作为设计师分析需求，输出设计风格方向。

    输出包含：配色方案、字体建议、布局风格、交互模式、视觉参考描述。

    Args:
        requirement: 产品需求描述或 PRD 内容
        reference_description: 参考设计的文字描述（可选）
        style_preference: 用户偏好的设计风格（可选），如 "极简"、"毛玻璃"、"暗色"
    """
    system = """你是一位资深 UI/UX 设计师，拥有 15 年大厂设计经验。
请根据产品需求输出完整的设计风格指导，包含：

1. **设计理念**：核心设计思路（1-2 句话）
2. **配色方案**：主色、辅色、强调色、背景色（提供 HEX 值）
3. **字体方案**：标题字体、正文字体、代码字体（中英文各推荐）
4. **布局风格**：页面结构、栅格系统、间距规范
5. **组件风格**：按钮、卡片、输入框、导航的视觉特征
6. **交互模式**：动画风格、过渡效果、反馈方式
7. **设计原则**：3-5 条核心设计原则

输出格式为结构化 Markdown，可直接用于指导前端开发。"""

    user_parts = [f"## 产品需求\n{requirement}"]
    if reference_description:
        user_parts.append(f"## 参考设计描述\n{reference_description}")
    if style_preference:
        user_parts.append(f"## 风格偏好\n{style_preference}")

    response = client.chat.completions.create(
        model=GEMINI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": "\n\n".join(user_parts)},
        ],
    )
    return response.choices[0].message.content


@mcp.tool()
def gemini_generate_html_demo(
    design_spec: str,
    page_type: str = "landing",
    include_animation: bool = True,
) -> str:
    """
    让 Gemini 3.1 Pro 根据设计规格生成完整的 demo.html 文件内容。

    利用 Gemini 65K 输出优势，生成包含完整样式和交互的单文件 HTML。

    Args:
        design_spec: 设计风格规格说明（来自 gemini_design_analyze 的输出）
        page_type: 页面类型，如 "landing"、"dashboard"、"admin"、"portfolio"
        include_animation: 是否包含 CSS 动画和过渡效果
    """
    animation_instruction = ""
    if include_animation:
        animation_instruction = """
- 添加适当的 CSS 动画（入场动画、hover 效果、滚动动画）
- 使用 CSS transitions 和 @keyframes
- 动画要克制优雅，不要过度"""

    system = f"""你是一位全栈设计工程师，擅长将设计规格转化为高质量的 HTML/CSS 代码。

要求：
- 输出一个完整的、可直接在浏览器打开的单文件 HTML
- 所有 CSS 内联在 <style> 标签中，不依赖外部资源
- 使用语义化 HTML5 标签
- 响应式设计（移动端友好）
- 代码整洁、有注释
- 页面类型：{page_type}
{animation_instruction}

只输出 HTML 代码，不要任何额外解释。以 <!DOCTYPE html> 开头。"""

    response = client.chat.completions.create(
        model=GEMINI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"请根据以下设计规格生成 demo.html：\n\n{design_spec}"},
        ],
    )
    content = response.choices[0].message.content
    # 提取 HTML 代码块（如果 Gemini 用 markdown 包裹了的话）
    if "```html" in content:
        content = content.split("```html", 1)[1].rsplit("```", 1)[0]
    elif "```" in content:
        content = content.split("```", 1)[1].rsplit("```", 1)[0]
    return content.strip()


@mcp.tool()
def gemini_review_design(html_content: str, prd_content: str) -> str:
    """
    让 Gemini 3.1 Pro 审查 demo.html 是否符合 PRD 需求，给出改进建议。

    用于 Loop 中的交叉审查环节。

    Args:
        html_content: demo.html 的完整内容
        prd_content: PRD 文档内容
    """
    system = """你是一位资深设计评审专家。请对比 PRD 需求和 HTML 实现，从以下维度评审：

1. **需求覆盖度**：PRD 中的每个功能点是否在 HTML 中有体现？列出缺失项。
2. **视觉质量**：配色、字体、间距是否专业？是否有视觉层次？
3. **交互完整性**：关键交互是否有实现或占位？
4. **响应式**：是否考虑了移动端？
5. **可用性**：信息架构是否清晰？用户动线是否合理？

输出格式：
- 评分（1-10）
- 优点（保持的部分）
- 改进建议（具体可执行的修改建议，按优先级排序）"""

    response = client.chat.completions.create(
        model=GEMINI_MODEL,
        messages=[
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": f"## PRD 需求文档\n{prd_content}\n\n## HTML 实现\n```html\n{html_content}\n```",
            },
        ],
    )
    return response.choices[0].message.content


if __name__ == "__main__":
    mcp.run()
