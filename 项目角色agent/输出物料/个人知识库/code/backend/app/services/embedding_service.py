"""
M2: Embedding 服务 — 调用 OpenAI 兼容 API 生成向量
支持后续切换到 BGE-M3 自部署
"""
from openai import AsyncOpenAI
from loguru import logger

from app.config import get_settings

settings = get_settings()


class EmbeddingService:
    """向量化服务 — 将文本转换为高维向量"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        self.model = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION

    async def embed_text(self, text: str) -> list[float]:
        """生成单个文本的 embedding 向量"""
        try:
            response = await self.client.embeddings.create(
                model=self.model,
                input=text,
                dimensions=self.dimension,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding 生成失败: {e}")
            raise

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        批量生成 embedding 向量。
        OpenAI API 单次最多 2048 个输入。
        """
        if not texts:
            return []

        all_embeddings = []
        batch_size = 100  # 每批处理 100 个文本

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                response = await self.client.embeddings.create(
                    model=self.model,
                    input=batch,
                    dimensions=self.dimension,
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
            except Exception as e:
                logger.error(f"批量 Embedding 生成失败 (batch {i // batch_size}): {e}")
                # 降级: 为失败的批次生成零向量
                all_embeddings.extend([[0.0] * self.dimension] * len(batch))

        logger.info(f"Embedding 批量生成完成: {len(texts)} 个文本")
        return all_embeddings


# 单例
embedding_service = EmbeddingService()
