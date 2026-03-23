"""
M2: 文件解析服务 — 支持 PDF、Word、Markdown、TXT 格式
"""
from pathlib import Path
from loguru import logger


class DocumentParser:
    """文档解析调度器，根据文件类型选择对应解析器"""

    SUPPORTED_TYPES = {
        "pdf": [".pdf"],
        "word": [".docx", ".doc"],
        "markdown": [".md"],
        "txt": [".txt"],
        "csv": [".csv"],
        "image": [".png", ".jpg", ".jpeg", ".webp"],
        "web": [],  # 网页通过 URL 抓取
    }

    SUPPORTED_EXTENSIONS = set()
    for exts in SUPPORTED_TYPES.values():
        SUPPORTED_EXTENSIONS.update(exts)

    @staticmethod
    def get_file_type(filename: str) -> str | None:
        """根据文件扩展名判断文件类型"""
        ext = Path(filename).suffix.lower()
        for file_type, extensions in DocumentParser.SUPPORTED_TYPES.items():
            if ext in extensions:
                return file_type
        return None

    @staticmethod
    def is_supported(filename: str) -> bool:
        ext = Path(filename).suffix.lower()
        return ext in DocumentParser.SUPPORTED_EXTENSIONS

    async def parse(self, file_path: str, file_type: str) -> list[dict]:
        """
        解析文件，返回段落列表。
        每个段落: {"heading": str|None, "content": str, "page_num": int|None}
        """
        parser_map = {
            "pdf": self._parse_pdf,
            "word": self._parse_word,
            "markdown": self._parse_markdown,
            "txt": self._parse_txt,
            "csv": self._parse_csv,
            "image": self._parse_image,
        }

        parser = parser_map.get(file_type)
        if not parser:
            raise ValueError(f"不支持的文件类型: {file_type}")

        logger.info(f"开始解析文件: {file_path} (类型: {file_type})")
        paragraphs = await parser(file_path)
        logger.info(f"解析完成: {len(paragraphs)} 个段落")
        return paragraphs

    async def _parse_pdf(self, file_path: str) -> list[dict]:
        """使用 pdfplumber 提取 PDF 文本"""
        try:
            import pdfplumber

            paragraphs = []
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text and text.strip():
                        paragraphs.append({
                            "heading": None,
                            "content": text.strip(),
                            "page_num": i + 1,
                        })
            return paragraphs
        except Exception as e:
            logger.error(f"PDF 解析失败: {e}")
            # Fallback: 尝试 PyPDF2
            return await self._parse_pdf_fallback(file_path)

    async def _parse_pdf_fallback(self, file_path: str) -> list[dict]:
        """PDF 解析的降级方案"""
        try:
            from PyPDF2 import PdfReader

            paragraphs = []
            reader = PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    paragraphs.append({
                        "heading": None,
                        "content": text.strip(),
                        "page_num": i + 1,
                    })
            return paragraphs
        except Exception as e:
            logger.error(f"PDF fallback 解析也失败: {e}")
            raise

    async def _parse_word(self, file_path: str) -> list[dict]:
        """使用 python-docx 提取 Word 文档段落"""
        from docx import Document as DocxDocument

        paragraphs = []
        doc = DocxDocument(file_path)
        current_heading = None

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            # 检查是否是标题
            if para.style and para.style.name.startswith("Heading"):
                current_heading = text
                continue

            paragraphs.append({
                "heading": current_heading,
                "content": text,
                "page_num": None,
            })

        return paragraphs

    async def _parse_markdown(self, file_path: str) -> list[dict]:
        """解析 Markdown 文件"""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        paragraphs = []
        current_heading = None
        current_content_lines = []

        for line in content.split("\n"):
            stripped = line.strip()
            if stripped.startswith("#"):
                # 先保存之前积累的段落
                if current_content_lines:
                    paragraphs.append({
                        "heading": current_heading,
                        "content": "\n".join(current_content_lines).strip(),
                        "page_num": None,
                    })
                    current_content_lines = []
                # 提取标题
                current_heading = stripped.lstrip("#").strip()
            elif stripped:
                current_content_lines.append(stripped)

        # 最后一个段落
        if current_content_lines:
            paragraphs.append({
                "heading": current_heading,
                "content": "\n".join(current_content_lines).strip(),
                "page_num": None,
            })

        return paragraphs

    async def _parse_txt(self, file_path: str) -> list[dict]:
        """解析纯文本文件"""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # 按双换行分段
        raw_paragraphs = content.split("\n\n")
        paragraphs = []
        for para in raw_paragraphs:
            text = para.strip()
            if text:
                paragraphs.append({
                    "heading": None,
                    "content": text,
                    "page_num": None,
                })

        return paragraphs

    async def _parse_image(self, file_path: str) -> list[dict]:
        """OCR 图片文字识别（pytesseract 优先，Pillow fallback）"""
        paragraphs = []
        text = ""

        # 方案1：pytesseract OCR
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img, lang="chi_sim+eng")
            logger.info(f"pytesseract OCR 成功: {len(text)} 字符")
        except ImportError:
            logger.warning("pytesseract 未安装，尝试其他 OCR 方案")
        except Exception as e:
            logger.warning(f"pytesseract OCR 失败: {e}")

        # 方案2：如果 pytesseract 不可用，尝试 easyocr
        if not text.strip():
            try:
                import easyocr
                reader = easyocr.Reader(["ch_sim", "en"])
                results = reader.readtext(file_path)
                text = "\n".join([r[1] for r in results])
                logger.info(f"easyocr OCR 成功: {len(text)} 字符")
            except ImportError:
                logger.warning("easyocr 也未安装")
            except Exception as e:
                logger.warning(f"easyocr OCR 失败: {e}")

        # 方案3：都没有，用 Pillow 提取图片基本信息
        if not text.strip():
            try:
                from PIL import Image
                img = Image.open(file_path)
                text = f"图片文件: {Path(file_path).name}, 尺寸: {img.size[0]}x{img.size[1]}, 格式: {img.format or 'unknown'}"
                logger.info(f"无 OCR 工具，记录图片元信息")
            except Exception as e:
                text = f"图片文件: {Path(file_path).name}"
                logger.warning(f"Pillow 也无法读取: {e}")

        if text.strip():
            # 按换行分段
            for para in text.strip().split("\n\n"):
                if para.strip():
                    paragraphs.append({
                        "heading": None,
                        "content": para.strip(),
                        "page_num": None,
                    })

        if not paragraphs:
            paragraphs.append({
                "heading": None,
                "content": text.strip() or f"图片文件: {Path(file_path).name}",
                "page_num": None,
            })

        return paragraphs

    async def _parse_csv(self, file_path: str) -> list[dict]:
        """解析 CSV/Excel 表格，将表头+行数据转为可检索的文本"""
        import csv as csv_module

        paragraphs = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv_module.reader(f)
                rows = list(reader)

            if not rows:
                return paragraphs

            headers = rows[0]

            # 第一段：表头概要
            paragraphs.append({
                "heading": "表格结构",
                "content": f"表格包含 {len(rows)-1} 行数据，列字段为：{', '.join(headers)}",
                "page_num": None,
            })

            # 每行数据转为自然语言描述
            for i, row in enumerate(rows[1:], 1):
                if not any(cell.strip() for cell in row):
                    continue
                # 将每行转为 "字段名: 值" 格式
                pairs = [f"{headers[j]}: {row[j]}" for j in range(min(len(headers), len(row))) if row[j].strip()]
                if pairs:
                    paragraphs.append({
                        "heading": None,
                        "content": f"第{i}行 — " + "，".join(pairs),
                        "page_num": None,
                    })

            return paragraphs

        except Exception as e:
            logger.error(f"CSV 解析失败: {e}")
            # Fallback: 当作纯文本读取
            return await self._parse_txt(file_path)


# 单例
document_parser = DocumentParser()
