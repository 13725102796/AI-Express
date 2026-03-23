"""
M2: 文本分块服务 — RecursiveCharacterTextSplitter
按 tech-architecture.md 规范: chunk_size=500, overlap=50
"""
from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger


class TextChunker:
    """将长文本切分为适合 embedding 的小块"""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", "。", ".", "！", "!", "？", "?", "；", ";", " "],
        )

    def split_paragraphs(self, paragraphs: list[dict]) -> list[dict]:
        """
        将解析出的段落进一步切分为适合 embedding 的小块。
        输入: [{"heading": str|None, "content": str, "page_num": int|None}]
        输出: [{"heading": str|None, "content": str, "page_num": int|None, "chunk_index": int}]
        """
        chunks = []
        chunk_index = 0

        for para in paragraphs:
            content = para["content"]
            if len(content) <= self.splitter._chunk_size:
                # 段落本身足够小，直接作为一个 chunk
                chunks.append({
                    "heading": para.get("heading"),
                    "content": content,
                    "page_num": para.get("page_num"),
                    "chunk_index": chunk_index,
                })
                chunk_index += 1
            else:
                # 段落太长，需要切分
                split_texts = self.splitter.split_text(content)
                for text in split_texts:
                    chunks.append({
                        "heading": para.get("heading"),
                        "content": text,
                        "page_num": para.get("page_num"),
                        "chunk_index": chunk_index,
                    })
                    chunk_index += 1

        logger.info(f"文本分块完成: {len(paragraphs)} 段落 → {len(chunks)} 个 chunk")
        return chunks


# 单例
text_chunker = TextChunker()
