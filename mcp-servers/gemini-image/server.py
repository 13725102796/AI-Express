"""
Gemini Image MCP Server
通过 Antigravity 反代调用 Gemini 3.1 Flash Image，提供图片生成能力。
用于生成设计素材、UI 概念图、图标、插图等。
"""

import os
import base64
import time
from mcp.server.fastmcp import FastMCP
from openai import OpenAI

# --- 配置 ---
GEMINI_BASE_URL = os.environ.get("GEMINI_BASE_URL", "http://127.0.0.1:8045/v1")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "not-needed")
GEMINI_IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image")

# 图片默认保存目录
DEFAULT_OUTPUT_DIR = os.environ.get(
    "GEMINI_IMAGE_OUTPUT_DIR",
    os.path.join(os.path.dirname(__file__), "output"),
)

mcp = FastMCP(
    "gemini-image",
    description="Gemini 3.1 Flash Image 图片生成服务 - UI 概念图、设计素材、图标",
)

client = OpenAI(base_url=GEMINI_BASE_URL, api_key=GEMINI_API_KEY)


def _ensure_output_dir(output_dir: str) -> str:
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def _extract_and_save_image(content: str, save_path: str) -> bool:
    """从 Gemini 响应中提取 base64 图片并保存。"""
    if not content or "base64," not in content:
        return False
    b64_data = content.split("base64,")[1].split(")")[0].split('"')[0]
    img_bytes = base64.b64decode(b64_data)
    with open(save_path, "wb") as f:
        f.write(img_bytes)
    return True


@mcp.tool()
def gemini_generate_image(
    prompt: str,
    filename: str = "",
    output_dir: str = "",
    style: str = "",
) -> str:
    """
    使用 Gemini 3.1 Flash Image 生成图片。

    适用场景：UI 概念图、设计素材、图标、插图、mood board 素材等。

    Args:
        prompt: 图片描述提示词
        filename: 保存的文件名（可选，默认自动生成）
        output_dir: 保存目录（可选，默认为 server 下的 output 目录）
        style: 风格提示（可选），如 "扁平化"、"3D"、"手绘"、"像素风"
    """
    full_prompt = prompt
    if style:
        full_prompt = f"{prompt}，风格：{style}"

    response = client.chat.completions.create(
        model=GEMINI_IMAGE_MODEL,
        messages=[{"role": "user", "content": full_prompt}],
    )

    message = response.choices[0].message
    content = message.content

    if not filename:
        filename = f"gemini_{int(time.time())}.png"
    if not filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        filename += ".png"

    save_dir = _ensure_output_dir(output_dir or DEFAULT_OUTPUT_DIR)
    save_path = os.path.join(save_dir, filename)

    if _extract_and_save_image(content, save_path):
        return f"图片已生成并保存到: {save_path}"
    else:
        return f"Gemini 返回了文本而非图片: {content[:500]}"


@mcp.tool()
def gemini_generate_ui_mockup(
    description: str,
    page_type: str = "mobile",
    color_scheme: str = "",
    filename: str = "",
    output_dir: str = "",
) -> str:
    """
    生成 UI 界面概念图/线框图。

    让 Gemini 生成界面的视觉概念图，用于早期设计方向确认。

    Args:
        description: 界面描述（功能、布局、内容）
        page_type: 页面类型 - "mobile"、"desktop"、"tablet"
        color_scheme: 配色描述（可选），如 "深色主题，蓝紫色调"
        filename: 保存文件名（可选）
        output_dir: 保存目录（可选）
    """
    color_part = f"，配色方案：{color_scheme}" if color_scheme else ""
    prompt = (
        f"生成一个专业的 {page_type} 端 UI 界面设计图。"
        f"界面描述：{description}{color_part}。"
        f"要求：现代化设计风格，清晰的视觉层次，专业的排版布局，"
        f"高保真效果，适合用作设计方向参考。"
    )

    response = client.chat.completions.create(
        model=GEMINI_IMAGE_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content

    if not filename:
        filename = f"ui_mockup_{page_type}_{int(time.time())}.png"
    if not filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        filename += ".png"

    save_dir = _ensure_output_dir(output_dir or DEFAULT_OUTPUT_DIR)
    save_path = os.path.join(save_dir, filename)

    if _extract_and_save_image(content, save_path):
        return f"UI 概念图已生成并保存到: {save_path}"
    else:
        return f"Gemini 返回了文本而非图片: {content[:500]}"


@mcp.tool()
def gemini_generate_icon_set(
    theme: str,
    icons: list[str],
    style: str = "线性图标",
    output_dir: str = "",
) -> str:
    """
    批量生成一组风格统一的图标。

    Args:
        theme: 图标主题描述，如 "电商应用"、"社交媒体"
        icons: 图标列表，如 ["首页", "购物车", "用户", "搜索"]
        style: 图标风格，如 "线性图标"、"填充图标"、"双色调"、"3D 图标"
        output_dir: 保存目录（可选）
    """
    save_dir = _ensure_output_dir(output_dir or DEFAULT_OUTPUT_DIR)
    results = []

    prompt = (
        f"生成一组风格统一的{style}，主题：{theme}。"
        f"在一张图中展示以下图标：{', '.join(icons)}。"
        f"要求：图标排列整齐，风格一致，背景透明或纯色，"
        f"适合用于 APP 或网页界面。每个图标下方标注名称。"
    )

    response = client.chat.completions.create(
        model=GEMINI_IMAGE_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content
    filename = f"icon_set_{theme}_{int(time.time())}.png"
    save_path = os.path.join(save_dir, filename)

    if _extract_and_save_image(content, save_path):
        results.append(f"图标集已保存到: {save_path}")
    else:
        results.append(f"图标集生成失败: {content[:300]}")

    return "\n".join(results)


@mcp.tool()
def gemini_generate_color_palette(
    mood: str,
    count: int = 5,
    filename: str = "",
    output_dir: str = "",
) -> str:
    """
    生成配色方案可视化图。

    Args:
        mood: 情绪/风格描述，如 "科技感"、"温暖"、"自然"、"高端奢华"
        count: 颜色数量（默认 5）
        filename: 文件名（可选）
        output_dir: 保存目录（可选）
    """
    prompt = (
        f"生成一张专业的配色方案展示图。"
        f"风格情绪：{mood}。颜色数量：{count} 个。"
        f"要求：每个颜色用大色块展示，标注 HEX 色值和颜色名称，"
        f"排列美观，适合作为设计规范的配色参考。"
    )

    response = client.chat.completions.create(
        model=GEMINI_IMAGE_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content

    if not filename:
        filename = f"palette_{mood}_{int(time.time())}.png"
    if not filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        filename += ".png"

    save_dir = _ensure_output_dir(output_dir or DEFAULT_OUTPUT_DIR)
    save_path = os.path.join(save_dir, filename)

    if _extract_and_save_image(content, save_path):
        return f"配色方案已生成并保存到: {save_path}"
    else:
        return f"Gemini 返回了文本而非图片: {content[:500]}"


if __name__ == "__main__":
    mcp.run()
