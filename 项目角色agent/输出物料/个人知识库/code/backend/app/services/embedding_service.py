"""
Embedding 服务 — 本地 BGE-M3 模型
支持 Dense + Sparse 双向量输出，零远程 API 依赖
"""
import asyncio
from loguru import logger

from app.config import get_settings

settings = get_settings()

_model = None
_reranker = None


def _get_model():
    """懒加载 BGE-M3 模型（首次调用时下载+加载，后续复用）"""
    global _model
    if _model is None:
        logger.info("正在加载 BGE-M3 embedding 模型（首次需要下载 ~1.2GB）...")
        from FlagEmbedding import BGEM3FlagModel
        _model = BGEM3FlagModel(settings.EMBEDDING_MODEL, use_fp16=True)
        logger.info("BGE-M3 模型加载完成")
    return _model


def _get_reranker():
    """懒加载 Reranker 模型"""
    global _reranker
    if _reranker is None:
        logger.info("正在加载 Reranker 模型: BAAI/bge-reranker-v2-m3 ...")
        from FlagEmbedding import FlagReranker
        _reranker = FlagReranker(settings.RERANKER_MODEL, use_fp16=True)
        logger.info("Reranker 模型加载完成")
    return _reranker


class EmbeddingService:
    """本地 BGE-M3 向量化服务"""

    def __init__(self):
        self.dimension = settings.EMBEDDING_DIMENSION  # 1024

    async def embed_text(self, text: str) -> list[float]:
        """单文本 embedding（dense 向量）"""
        model = _get_model()
        result = await asyncio.to_thread(
            model.encode, [text], return_dense=True, return_sparse=False
        )
        return result['dense_vecs'][0].tolist()

    async def embed_text_with_sparse(self, text: str) -> dict:
        """单文本 embedding（同时返回 dense + sparse）"""
        model = _get_model()
        result = await asyncio.to_thread(
            model.encode, [text], return_dense=True, return_sparse=True
        )
        return {
            'dense': result['dense_vecs'][0].tolist(),
            'sparse': result['lexical_weights'][0],  # dict: {token_id: weight}
        }

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """批量 embedding（dense）"""
        if not texts:
            return []
        model = _get_model()
        batch_size = settings.EMBEDDING_BATCH_SIZE
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                result = await asyncio.to_thread(
                    model.encode, batch,
                    return_dense=True, return_sparse=False,
                    batch_size=len(batch),
                )
                all_embeddings.extend([v.tolist() for v in result['dense_vecs']])
            except Exception as e:
                logger.error(f"批量 Embedding 失败 (batch {i // batch_size}): {e}")
                all_embeddings.extend([[0.0] * self.dimension] * len(batch))

        logger.info(f"Embedding 批量生成完成: {len(texts)} 个文本")
        return all_embeddings

    async def embed_batch_with_sparse(self, texts: list[str]) -> list[dict]:
        """批量 embedding（dense + sparse）"""
        if not texts:
            return []
        model = _get_model()
        batch_size = settings.EMBEDDING_BATCH_SIZE
        all_results = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            try:
                result = await asyncio.to_thread(
                    model.encode, batch,
                    return_dense=True, return_sparse=True,
                    batch_size=len(batch),
                )
                for j in range(len(batch)):
                    all_results.append({
                        'dense': result['dense_vecs'][j].tolist(),
                        'sparse': result['lexical_weights'][j],
                    })
            except Exception as e:
                logger.error(f"批量多向量 Embedding 失败: {e}")
                for _ in batch:
                    all_results.append({'dense': [0.0] * self.dimension, 'sparse': {}})

        return all_results

    async def rerank(
        self,
        query: str,
        passages: list[str],
        top_k: int = 10,
    ) -> list[dict]:
        """使用 Cross-Encoder Reranker 对候选文档精排"""
        if not passages:
            return []

        try:
            reranker = _get_reranker()
            pairs = [[query, p] for p in passages]
            scores = await asyncio.to_thread(reranker.compute_score, pairs, normalize=True)

            if isinstance(scores, float):
                scores = [scores]

            scored = [
                {"index": i, "score": float(s), "text": passages[i]}
                for i, s in enumerate(scores)
            ]
            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]
        except Exception as e:
            logger.warning(f"Reranker 不可用，跳过精排: {e}")
            # 降级：按原始顺序返回
            return [
                {"index": i, "score": 0.5, "text": passages[i]}
                for i in range(min(top_k, len(passages)))
            ]


# 单例
embedding_service = EmbeddingService()
