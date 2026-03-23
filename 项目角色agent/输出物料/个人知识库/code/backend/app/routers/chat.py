"""
M3: AI 问答路由
- POST   /api/chat                SSE 流式问答
- GET    /api/chat/history        对话历史列表
- GET    /api/chat/:id            单个对话详情
- POST   /api/chat/:id/stop      停止生成
- DELETE /api/chat/:id            删除对话
- POST   /api/chat/:id/feedback   反馈
"""
import uuid
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.database import get_db
from app.dependencies import get_current_user
from app.models.database import User, Conversation, Message, Citation, Feedback, DocChunk
from app.models.schemas import (
    ChatRequest, ChatFeedbackRequest, StopGenerationRequest,
    ConversationListItem, ConversationDetail, MessageResponse, CitationItem,
)
from app.services.rag_engine import rag_engine

router = APIRouter()


# ============================================================
# POST / — SSE 流式问答
# ============================================================

@router.post("")
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    AI 问答接口（SSE 流式响应）。
    基于 RAG 从知识库检索相关段落，结合 LLM 生成回答。
    """
    # 获取或创建对话
    conversation = None
    if body.conversation_id:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.id == body.conversation_id, Conversation.user_id == user.id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail={"error": "CONVERSATION_NOT_FOUND", "message": "对话不存在"})
    else:
        # 创建新对话
        conversation = Conversation(
            user_id=user.id,
            space_id=body.space_id,
            title=body.message[:50],  # 用前 50 字作为标题
        )
        db.add(conversation)
        await db.flush()

    # 保存用户消息
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=body.message,
    )
    db.add(user_message)
    await db.flush()

    # 获取对话历史
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at)
    )
    history_messages = history_result.scalars().all()
    conversation_history = [
        {"role": m.role, "content": m.content}
        for m in history_messages[:-1]  # 排除刚插入的当前消息
    ]

    # 创建 AI 消息占位
    ai_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content="",  # 流式生成完成后更新
    )
    db.add(ai_message)
    await db.flush()

    # 需要先 commit 以便流式过程中读取数据
    await db.commit()

    async def event_generator():
        """SSE 事件生成器"""
        full_content = ""
        citations_data = []

        try:
            async for event in rag_engine.query(
                db=db,
                query=body.message,
                user_id=user.id,
                space_id=body.space_id,
                conversation_history=conversation_history,
                conversation_id=str(conversation.id),
                message_id=str(ai_message.id),
            ):
                yield event

                # 解析内容用于存储
                if "text_delta" in event:
                    try:
                        data_line = event.split("data: ", 1)[1].strip()
                        data = json.loads(data_line)
                        full_content += data.get("delta", "")
                    except (IndexError, json.JSONDecodeError):
                        pass
                elif "citation" in event and "event: citation" in event:
                    try:
                        data_line = event.split("data: ", 1)[1].strip()
                        citations_data.append(json.loads(data_line))
                    except (IndexError, json.JSONDecodeError):
                        pass

        except Exception as e:
            logger.error(f"流式生成错误: {e}")
            yield f"event: error\ndata: {json.dumps({'error': 'STREAM_ERROR', 'message': str(e)})}\n\n"

        # 更新 AI 消息内容
        try:
            ai_message.content = full_content or "（生成失败）"
            db.add(ai_message)

            # 保存引用（跳过无效的 chunk_id 避免外键错误）
            for cit in citations_data:
                try:
                    doc_id = uuid.UUID(cit["sourceId"]) if "sourceId" in cit else None
                    chunk_id = uuid.UUID(cit["chunkId"]) if "chunkId" in cit else None
                    if not doc_id:
                        continue
                    # 如果没有 chunk_id，查找该文档的第一个 chunk
                    if not chunk_id:
                        from app.models.database import DocChunk as DC
                        chunk_result = await db.execute(
                            select(DC.id).where(DC.document_id == doc_id).limit(1)
                        )
                        first_chunk = chunk_result.scalar_one_or_none()
                        chunk_id = first_chunk if first_chunk else None
                    if not chunk_id:
                        continue  # 跳过没有 chunk 的引用
                    citation = Citation(
                        message_id=ai_message.id,
                        citation_index=cit.get("index", 0),
                        chunk_id=chunk_id,
                        document_id=doc_id,
                        excerpt=cit.get("excerpt", ""),
                        confidence=cit.get("confidence", 0.0),
                        page_num=cit.get("pageNum"),
                    )
                    db.add(citation)
                except Exception as cite_err:
                    logger.warning(f"保存引用失败，跳过: {cite_err}")

            await db.commit()
        except Exception as e:
            logger.error(f"保存消息失败: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================
# GET /history — 对话历史列表
# ============================================================

@router.get("/conversations")
@router.get("/history")
async def list_conversations(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取对话历史列表"""
    # 统计总数
    count_result = await db.execute(
        select(func.count()).where(Conversation.user_id == user.id)
    )
    total = count_result.scalar() or 0

    # 查询对话列表
    offset = (page - 1) * limit
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    conversations = result.scalars().all()

    items = []
    for conv in conversations:
        # 获取消息数
        msg_count_result = await db.execute(
            select(func.count()).where(Message.conversation_id == conv.id)
        )
        msg_count = msg_count_result.scalar() or 0

        # 获取最后消息时间
        last_msg_result = await db.execute(
            select(Message.created_at)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_msg_time = last_msg_result.scalar_one_or_none()

        items.append({
            "id": conv.id,
            "title": conv.title,
            "last_message_at": last_msg_time,
            "message_count": msg_count,
            "space_id": conv.space_id,
        })

    return {
        "items": items,
        "total": total,
        "has_more": (page * limit) < total,
    }


# ============================================================
# GET /:id — 单个对话详情
# ============================================================

@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """获取单个对话的完整消息列表"""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "对话不存在"})

    # 获取消息列表
    msg_result = await db.execute(
        select(Message)
        .options(selectinload(Message.citations), selectinload(Message.feedbacks))
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    message_list = []
    for msg in messages:
        citations = []
        for cit in msg.citations:
            citations.append({
                "index": cit.citation_index,
                "source_id": cit.document_id,
                "source_title": "",  # 需要 join document 表
                "source_type": "",
                "excerpt": cit.excerpt,
                "confidence": cit.confidence,
                "page_num": cit.page_num,
            })

        feedback = None
        if msg.feedbacks:
            feedback = msg.feedbacks[0].type

        message_list.append({
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at,
            "citations": citations,
            "feedback": feedback,
        })

    return {
        "id": conversation.id,
        "title": conversation.title,
        "space_id": conversation.space_id,
        "messages": message_list,
    }


# ============================================================
# POST /:id/stop — 停止生成
# ============================================================

@router.post("/{conversation_id}/stop")
async def stop_generation(
    conversation_id: uuid.UUID,
    body: StopGenerationRequest = StopGenerationRequest(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    停止正在进行的 AI 回答生成。
    客户端在收到此响应后应关闭 SSE 连接。
    """
    # 验证对话属于当前用户
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "对话不存在"})

    # TODO: 实际实现需要通过共享状态（如 Redis）通知流式生成器中断
    # 当前先标记消息为已中断
    if body.message_id:
        msg_result = await db.execute(
            select(Message).where(
                Message.id == body.message_id,
                Message.conversation_id == conversation_id,
            )
        )
        message = msg_result.scalar_one_or_none()
        if message and message.role == "assistant" and not message.content:
            message.content = "（生成已中断）"
            await db.flush()

    logger.info(f"停止生成: conversation_id={conversation_id}, message_id={body.message_id}")
    return {"success": True}


# ============================================================
# DELETE /:id — 删除对话
# ============================================================

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """删除对话及其全部消息、引用和反馈"""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "对话不存在"})

    # 级联删除会自动清理 messages -> citations, feedbacks
    await db.delete(conversation)
    await db.flush()

    logger.info(f"对话已删除: conversation_id={conversation_id}")
    return {"success": True}


# ============================================================
# POST /:id/feedback — 反馈
# ============================================================

@router.post("/{conversation_id}/feedback")
async def submit_feedback(
    conversation_id: uuid.UUID,
    body: ChatFeedbackRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """对 AI 回答提交反馈（有帮助/无帮助）"""
    # 验证对话属于当前用户
    conv_result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == user.id)
    )
    if not conv_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "对话不存在"})

    # 验证消息存在
    msg_result = await db.execute(
        select(Message).where(Message.id == body.message_id, Message.conversation_id == conversation_id)
    )
    if not msg_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail={"error": "MESSAGE_NOT_FOUND", "message": "消息不存在"})

    # 创建或更新反馈
    existing = await db.execute(
        select(Feedback).where(Feedback.message_id == body.message_id, Feedback.user_id == user.id)
    )
    feedback = existing.scalar_one_or_none()

    if feedback:
        feedback.type = body.type
    else:
        feedback = Feedback(
            message_id=body.message_id,
            user_id=user.id,
            type=body.type,
        )
        db.add(feedback)

    await db.flush()
    return {"success": True}
