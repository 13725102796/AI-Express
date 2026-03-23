"""
M3: Prompt 模板 — RAG 问答的系统指令和 Prompt 构造
"""

SYSTEM_PROMPT = """你是 KnowBase 智能助手，一个基于用户个人知识库的 AI 问答系统。

你的职责：
1. 仅基于提供的知识库段落回答用户问题
2. 在回答中使用引用标注 [1][2] 等来标注信息来源
3. 如果知识库中没有相关信息，明确告知用户"知识库中未找到相关资料"
4. 不要编造不在知识库中的信息
5. 区分"来自知识库的内容"和"AI 补充的通用知识"

引用规则：
- 使用 [数字] 格式标注引用，如 [1]、[2]
- 引用编号对应下方提供的知识库段落编号
- 每段回答尽量标注来源
- 单次回答引用来源不超过 10 条"""


def build_rag_prompt(
    query: str,
    context_chunks: list[dict],
    conversation_history: list[dict] | None = None,
) -> list[dict]:
    """
    构建完整的 RAG Prompt。

    Args:
        query: 用户提问
        context_chunks: 检索到的相关段落
        conversation_history: 对话历史

    Returns:
        OpenAI 格式的 messages 列表
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # 构建知识库上下文
    if context_chunks:
        context_parts = []
        for i, chunk in enumerate(context_chunks[:10]):
            source_info = f"[来源: {chunk['document_title']}"
            if chunk.get("page_num"):
                source_info += f", 第{chunk['page_num']}页"
            source_info += f", 相关度: {chunk['similarity']:.2f}]"

            context_parts.append(
                f"[{i + 1}] {source_info}\n{chunk['content']}"
            )

        context_text = "\n\n---\n\n".join(context_parts)
        messages.append({
            "role": "system",
            "content": f"以下是从用户知识库中检索到的相关段落：\n\n{context_text}",
        })

    # 添加对话历史（最近 10 轮）
    if conversation_history:
        for msg in conversation_history[-20:]:  # 最多 20 条消息（10 轮）
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

    # 添加当前用户提问
    messages.append({"role": "user", "content": query})

    return messages
