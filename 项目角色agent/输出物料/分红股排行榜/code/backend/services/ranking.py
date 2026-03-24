"""Ranking service - query ranking data from cache."""
import logging
import math
from typing import List, Dict, Optional, Tuple

from backend.database import get_connection

logger = logging.getLogger(__name__)

# Valid tab types and their sort configurations
TAB_CONFIGS = {
    "comprehensive": {
        "order_by": "rc.composite_score DESC",
        "fields": ["score", "consecutive_years", "dividend_yield", "avg_yield_3y"],
    },
    "stable": {
        "order_by": "rc.consecutive_years DESC, rc.latest_yield DESC",
        "fields": ["consecutive_years", "dividend_yield", "dps"],
    },
    "highest": {
        "order_by": "rc.latest_yield DESC",
        "fields": ["dividend_yield", "avg_yield_3y", "dps", "total_dividend"],
    },
}


def get_ranking(
    tab_type: str,
    page: int = 1,
    page_size: int = 50,
    search: Optional[str] = None,
) -> Dict:
    """
    Get ranking data for a specific tab type.

    Returns dict with items, total, page, page_size, total_pages.
    """
    if tab_type not in TAB_CONFIGS:
        tab_type = "comprehensive"

    config = TAB_CONFIGS[tab_type]
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Build WHERE clause
        where_clauses = ["rc.consecutive_years >= 1"]
        params = []

        if search and search.strip():
            search_term = f"%{search.strip()}%"
            where_clauses.append("(s.code LIKE ? OR s.name LIKE ?)")
            params.extend([search_term, search_term])

        where_sql = " AND ".join(where_clauses)
        order_sql = config["order_by"]

        # Count total
        count_sql = f"""
            SELECT COUNT(*) as cnt
            FROM ranking_cache rc
            INNER JOIN stocks s ON rc.stock_code = s.code
            WHERE {where_sql}
        """
        cursor.execute(count_sql, params)
        total = cursor.fetchone()["cnt"]

        total_pages = max(1, math.ceil(total / page_size))
        page = max(1, min(page, total_pages))
        offset = (page - 1) * page_size

        # Fetch data
        query_sql = f"""
            SELECT
                s.code, s.name, s.industry,
                rc.composite_score, rc.consecutive_years,
                rc.latest_yield, rc.avg_yield_3y,
                rc.latest_dps, rc.total_dividend
            FROM ranking_cache rc
            INNER JOIN stocks s ON rc.stock_code = s.code
            WHERE {where_sql}
            ORDER BY {order_sql}
            LIMIT ? OFFSET ?
        """
        cursor.execute(query_sql, params + [page_size, offset])
        rows = cursor.fetchall()

        items = []
        for i, row in enumerate(rows):
            rank = offset + i + 1
            item = {
                "rank": rank,
                "code": row["code"],
                "name": row["name"],
                "industry": row["industry"] or "",
            }

            # Include fields based on tab type
            fields = config["fields"]
            if "score" in fields:
                item["score"] = round(row["composite_score"], 1)
            if "consecutive_years" in fields:
                item["consecutive_years"] = row["consecutive_years"]
            if "dividend_yield" in fields:
                item["dividend_yield"] = round(row["latest_yield"], 2)
            if "avg_yield_3y" in fields:
                item["avg_yield_3y"] = round(row["avg_yield_3y"], 2)
            if "dps" in fields:
                item["dps"] = round(row["latest_dps"], 2)
            if "total_dividend" in fields:
                item["total_dividend"] = round(row["total_dividend"], 2)

            items.append(item)

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }
    finally:
        conn.close()
