"""Stock detail service."""
import logging
from typing import Optional, Dict, List

from backend.database import get_connection

logger = logging.getLogger(__name__)


def get_stock_detail(code: str) -> Optional[Dict]:
    """
    Get stock detail with dividend history.
    Returns None if stock not found.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get stock basic info + ranking
        cursor.execute("""
            SELECT
                s.code, s.name, s.industry,
                rc.composite_score, rc.consecutive_years,
                rc.latest_yield, rc.avg_yield_3y, rc.total_dividend
            FROM stocks s
            LEFT JOIN ranking_cache rc ON s.code = rc.stock_code
            WHERE s.code = ?
        """, (code,))
        stock = cursor.fetchone()

        if not stock:
            return None

        # Get comprehensive rank
        rank = _get_comprehensive_rank(cursor, code)

        # Get dividend history
        cursor.execute("""
            SELECT year, plan, dps, ex_date, total_amount
            FROM dividends
            WHERE stock_code = ? AND dps > 0
            ORDER BY year DESC
        """, (code,))
        history_rows = cursor.fetchall()

        # Calculate yield for each year
        price = None
        cursor.execute("SELECT current_price FROM stocks WHERE code = ?", (code,))
        price_row = cursor.fetchone()
        if price_row:
            price = price_row["current_price"]

        history = []
        for row in history_rows:
            dividend_yield = 0.0
            if price and price > 0:
                dividend_yield = round((row["dps"] / price) * 100, 2)

            history.append({
                "year": row["year"],
                "plan": row["plan"] or f"每10股派{row['dps'] * 10:.2f}元",
                "dps": round(row["dps"], 2),
                "dividend_yield": dividend_yield,
                "ex_date": row["ex_date"] or "",
                "total_amount": round(row["total_amount"], 2) if row["total_amount"] else 0,
            })

        return {
            "code": stock["code"],
            "name": stock["name"],
            "industry": stock["industry"] or "",
            "score": round(stock["composite_score"] or 0, 1),
            "comprehensive_rank": rank,
            "consecutive_years": stock["consecutive_years"] or 0,
            "dividend_yield": round(stock["latest_yield"] or 0, 2),
            "avg_yield_3y": round(stock["avg_yield_3y"] or 0, 2),
            "total_dividend": round(stock["total_dividend"] or 0, 2),
            "history": history,
        }
    finally:
        conn.close()


def get_stats() -> Dict:
    """Get overall statistics."""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Total stocks in ranking
        cursor.execute("SELECT COUNT(*) as cnt FROM ranking_cache WHERE consecutive_years >= 1")
        total_row = cursor.fetchone()
        total_stocks = total_row["cnt"] if total_row else 0

        # Average dividend yield
        cursor.execute("""
            SELECT AVG(latest_yield) as avg_yield
            FROM ranking_cache
            WHERE consecutive_years >= 1 AND latest_yield > 0
        """)
        avg_row = cursor.fetchone()
        avg_yield = round(avg_row["avg_yield"], 2) if avg_row and avg_row["avg_yield"] else 0

        # Max consecutive years + stock name
        cursor.execute("""
            SELECT rc.consecutive_years, s.name
            FROM ranking_cache rc
            INNER JOIN stocks s ON rc.stock_code = s.code
            ORDER BY rc.consecutive_years DESC
            LIMIT 1
        """)
        max_row = cursor.fetchone()
        max_years = max_row["consecutive_years"] if max_row else 0
        max_stock = max_row["name"] if max_row else ""

        # Last update time
        cursor.execute("""
            SELECT finished_at FROM update_log
            WHERE status = 'success'
            ORDER BY id DESC LIMIT 1
        """)
        update_row = cursor.fetchone()
        last_updated = update_row["finished_at"] if update_row else ""

        return {
            "total_stocks": total_stocks,
            "avg_dividend_yield": avg_yield,
            "max_consecutive_years": max_years,
            "max_consecutive_stock": max_stock,
            "last_updated": last_updated,
        }
    finally:
        conn.close()


def _get_comprehensive_rank(cursor, code: str) -> int:
    """Get the comprehensive ranking position for a stock."""
    cursor.execute("""
        SELECT COUNT(*) + 1 as rank
        FROM ranking_cache
        WHERE composite_score > (
            SELECT composite_score FROM ranking_cache WHERE stock_code = ?
        )
    """, (code,))
    row = cursor.fetchone()
    return row["rank"] if row else 0
