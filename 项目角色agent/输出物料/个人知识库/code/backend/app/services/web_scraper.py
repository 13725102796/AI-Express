"""
M2: 网页抓取服务 — 使用 httpx + BeautifulSoup 提取网页正文
"""
import httpx
from bs4 import BeautifulSoup
from loguru import logger


class WebScraper:
    """网页正文提取器"""

    TIMEOUT = 30  # 秒
    USER_AGENT = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    async def scrape(self, url: str) -> dict:
        """
        抓取网页并提取正文内容。
        返回: {"title": str, "content": str, "paragraphs": list[dict]}
        """
        logger.info(f"开始抓取网页: {url}")

        try:
            async with httpx.AsyncClient(
                timeout=self.TIMEOUT,
                follow_redirects=True,
                headers={"User-Agent": self.USER_AGENT},
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"网页请求失败: {e.response.status_code}")
            raise ValueError(f"网页无法访问 (HTTP {e.response.status_code})")
        except httpx.RequestError as e:
            logger.error(f"网页请求错误: {e}")
            raise ValueError("网页无法访问，请检查链接是否有效")

        html = response.text
        soup = BeautifulSoup(html, "html.parser")

        # 提取标题
        title = ""
        if soup.title:
            title = soup.title.get_text(strip=True)

        # 移除脚本、样式、导航等噪音元素
        for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe"]):
            tag.decompose()

        # 尝试使用 article 标签或 main 标签提取正文
        article = soup.find("article") or soup.find("main") or soup.find("body")

        paragraphs = []
        if article:
            current_heading = None
            for element in article.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li"]):
                text = element.get_text(strip=True)
                if not text:
                    continue
                if element.name.startswith("h"):
                    current_heading = text
                else:
                    paragraphs.append({
                        "heading": current_heading,
                        "content": text,
                        "page_num": None,
                    })

        # 如果段落提取太少，降级到全文提取
        if len(paragraphs) < 2:
            body_text = soup.get_text(separator="\n", strip=True)
            lines = [line.strip() for line in body_text.split("\n") if line.strip()]
            paragraphs = [
                {"heading": None, "content": line, "page_num": None}
                for line in lines
                if len(line) > 20  # 过滤太短的行
            ]

        full_content = "\n\n".join(p["content"] for p in paragraphs)

        logger.info(f"网页抓取完成: {title} ({len(paragraphs)} 段落)")
        return {
            "title": title or url,
            "content": full_content,
            "paragraphs": paragraphs,
        }


# 单例
web_scraper = WebScraper()
