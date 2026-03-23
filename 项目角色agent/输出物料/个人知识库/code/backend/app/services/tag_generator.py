"""
M2: 自动标签 & 摘要生成服务 — 调用 LLM 为文档生成标签和摘要
"""
import json
from loguru import logger
from app.services.llm_service import llm_service


class TagGenerator:
    """AI 标签和摘要生成器"""

    TAG_PROMPT = """请根据以下文档内容，生成 3-5 个最能概括内容主题的标签。

要求：
1. 标签用中文
2. 每个标签 2-6 个字
3. 只返回 JSON 数组格式，例如: ["标签1", "标签2", "标签3"]
4. 不要多余文字

文档内容：
{content}"""

    SUMMARY_PROMPT = """请为以下文档生成一个简洁的摘要，200 字以内。

要求：
1. 用中文概括文档核心内容
2. 包含关键信息点
3. 只返回摘要文本，不要多余格式

文档内容：
{content}"""

    async def generate_tags(self, content: str) -> list[str]:
        """
        为文档内容生成 3-5 个标签。
        如果内容太短（<50字），返回空列表。
        """
        if len(content) < 50:
            return []

        # 截取前 3000 字用于生成标签
        truncated = content[:3000]

        try:
            result = await llm_service.chat_completion(
                messages=[
                    {"role": "system", "content": "你是一个专业的文档分析助手，擅长提取文档主题标签。"},
                    {"role": "user", "content": self.TAG_PROMPT.format(content=truncated)},
                ],
                temperature=0.3,
                max_tokens=200,
            )
            # 解析 JSON 数组
            tags_text = result["content"].strip()
            # 处理可能的 markdown 代码块包裹
            if tags_text.startswith("```"):
                tags_text = tags_text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            tags = json.loads(tags_text)
            if isinstance(tags, list):
                return [str(t).strip() for t in tags[:8]]  # 最多 8 个
            return []
        except Exception as e:
            logger.error(f"标签生成失败: {e}")
            return []

    async def generate_summary(self, content: str) -> str:
        """为文档内容生成 200 字以内的摘要"""
        if len(content) < 30:
            return content

        # 截取前 5000 字用于生成摘要
        truncated = content[:5000]

        try:
            result = await llm_service.chat_completion(
                messages=[
                    {"role": "system", "content": "你是一个专业的文档摘要助手。"},
                    {"role": "user", "content": self.SUMMARY_PROMPT.format(content=truncated)},
                ],
                temperature=0.3,
                max_tokens=400,
            )
            return result["content"].strip()
        except Exception as e:
            logger.error(f"摘要生成失败: {e}")
            return content[:200]  # 降级：返回前 200 字


# 单例
tag_generator = TagGenerator()
