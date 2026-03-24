"""AKShare data fetching service for A-share dividend data."""
import logging
import os
import re
import urllib.request
from datetime import datetime
from typing import List, Dict, Tuple, Optional

from backend.database import get_connection

logger = logging.getLogger(__name__)

# Fetch recent N years of dividend data
DIVIDEND_YEARS = 10


def _disable_system_proxy():
    """Disable macOS system proxy so AKShare can reach domestic APIs directly."""
    urllib.request.getproxies = lambda: {}
    for key in ("http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "all_proxy", "ALL_PROXY"):
        os.environ.pop(key, None)
    os.environ["NO_PROXY"] = "*"
    os.environ["no_proxy"] = "*"


def fetch_and_store_data() -> Tuple[int, str]:
    """
    Fetch A-share dividend data using AKShare batch API and store in database.
    Uses stock_fhps_em (东方财富分红配送) for batch retrieval — ~2s per year.
    Returns (stock_count, error_message).
    """
    _disable_system_proxy()

    try:
        import akshare as ak
        import pandas as pd
    except ImportError as e:
        logger.error("AKShare not installed: %s", e)
        return 0, f"AKShare not installed: {e}"

    conn = get_connection()
    cursor = conn.cursor()

    try:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        current_year = datetime.now().year
        all_stock_codes = set()

        # Step 1: Fetch dividend data year by year using batch API
        logger.info("Fetching dividend data for %d years...", DIVIDEND_YEARS)
        total_records = 0

        for year_offset in range(DIVIDEND_YEARS):
            year = current_year - year_offset
            date_str = f"{year}1231"

            try:
                df = ak.stock_fhps_em(date=date_str)
                if df is None or df.empty:
                    continue

                # Filter: only implemented plans with cash dividend
                if "方案进度" in df.columns:
                    df = df[df["方案进度"].str.contains("实施", na=False)]

                # Filter out ST stocks
                if "名称" in df.columns:
                    df = df[~df["名称"].str.contains("ST", na=False)]

                logger.info("Year %d: %d dividend records", year, len(df))

                for _, row in df.iterrows():
                    code = str(row.get("代码", "")).strip()
                    if not code or len(code) != 6:
                        continue
                    name = str(row.get("名称", "")).strip()

                    # Store stock info
                    all_stock_codes.add(code)
                    cursor.execute(
                        """INSERT INTO stocks (code, name, industry, current_price, updated_at)
                           VALUES (?, ?, '', 0, ?)
                           ON CONFLICT(code) DO UPDATE SET
                           name=excluded.name, updated_at=excluded.updated_at""",
                        (code, name, now_str)
                    )

                    # Extract DPS from '现金分红-现金分红比例' (per 10 shares)
                    dps_per_10 = 0.0
                    try:
                        dps_per_10 = float(row.get("现金分红-现金分红比例", 0) or 0)
                    except (ValueError, TypeError):
                        pass

                    if dps_per_10 <= 0:
                        continue

                    dps = round(dps_per_10 / 10, 4)
                    plan = f"每10股派{dps_per_10}元"

                    # Extract ex-dividend date
                    ex_date = str(row.get("除权除息日", "")).strip()
                    if ex_date in ("nan", "NaT", "None", ""):
                        ex_date = ""
                    else:
                        ex_date = ex_date[:10]

                    # Extract dividend yield (as percentage, e.g. 0.05 = 5%)
                    dividend_yield = 0.0
                    try:
                        dividend_yield = float(row.get("现金分红-股息率", 0) or 0)
                        dividend_yield = round(dividend_yield * 100, 2)  # Convert to percentage
                    except (ValueError, TypeError):
                        pass

                    # Store yield in total_amount field for ranking use
                    cursor.execute(
                        """INSERT INTO dividends (stock_code, year, plan, dps, ex_date, total_amount)
                           VALUES (?, ?, ?, ?, ?, ?)
                           ON CONFLICT(stock_code, year) DO UPDATE SET
                           plan=excluded.plan, dps=excluded.dps, ex_date=excluded.ex_date,
                           total_amount=excluded.total_amount""",
                        (code, year, plan, dps, ex_date, dividend_yield)
                    )
                    total_records += 1

                conn.commit()

            except Exception as e:
                logger.warning("Error fetching year %d: %s", year, e)
                continue

        logger.info("Total: %d dividend records for %d stocks", total_records, len(all_stock_codes))

        # Step 2: Calculate ranking metrics
        _calculate_rankings(conn)

        return len(all_stock_codes), ""

    except Exception as e:
        logger.error("Data fetch failed: %s", e)
        return 0, str(e)
    finally:
        conn.close()


def _calculate_rankings(conn) -> None:
    """Calculate ranking metrics for all stocks and store in ranking_cache."""
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    cursor.execute("""
        SELECT DISTINCT s.code, s.name, s.current_price
        FROM stocks s
        INNER JOIN dividends d ON s.code = d.stock_code
        WHERE d.dps > 0
    """)
    stocks = cursor.fetchall()

    ranking_entries = []

    for stock in stocks:
        code = stock["code"]
        price = stock["current_price"] or 0

        cursor.execute("""
            SELECT year, dps, total_amount FROM dividends
            WHERE stock_code = ? AND dps > 0
            ORDER BY year DESC
        """, (code,))
        dividends = cursor.fetchall()

        if not dividends:
            continue

        consecutive_years = _calc_consecutive_years([d["year"] for d in dividends])
        if consecutive_years < 1:
            continue

        latest_dps = dividends[0]["dps"]

        # total_amount stores dividend yield (%) from API
        latest_yield = dividends[0]["total_amount"] or 0

        # Average yield over recent 3 years (stored in total_amount as %)
        recent_3 = dividends[:3]
        yields_3y = [d["total_amount"] for d in recent_3 if d["total_amount"] and d["total_amount"] > 0]
        avg_yield_3y = round(sum(yields_3y) / len(yields_3y), 2) if yields_3y else 0

        # Total cumulative DPS as scale metric
        total_dividend = round(sum(d["dps"] for d in dividends), 2)

        ranking_entries.append({
            "code": code,
            "consecutive_years": consecutive_years,
            "latest_dps": latest_dps,
            "latest_yield": latest_yield,
            "avg_yield_3y": avg_yield_3y,
            "total_dividend": round(total_dividend, 2),
        })

    if ranking_entries:
        _calc_composite_scores(ranking_entries)

        cursor.execute("DELETE FROM ranking_cache")
        for entry in ranking_entries:
            cursor.execute(
                """INSERT INTO ranking_cache
                   (stock_code, consecutive_years, latest_dps, latest_yield,
                    avg_yield_3y, total_dividend, composite_score, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (entry["code"], entry["consecutive_years"], entry["latest_dps"],
                 entry["latest_yield"], entry["avg_yield_3y"],
                 entry["total_dividend"], entry["score"], now_str)
            )

    conn.commit()
    logger.info("Calculated rankings for %d stocks", len(ranking_entries))


def _calc_consecutive_years(years: List[int]) -> int:
    if not years:
        return 0
    sorted_years = sorted(set(years), reverse=True)
    consecutive = 1
    for i in range(1, len(sorted_years)):
        if sorted_years[i] == sorted_years[i - 1] - 1:
            consecutive += 1
        else:
            break
    return consecutive


def _calc_composite_scores(entries: List[Dict]) -> None:
    """
    Formula: stability(40%) + yield(35%) + scale(25%)
    Each component normalized to 0-100.
    """
    if not entries:
        return

    years_vals = [e["consecutive_years"] for e in entries]
    yield_vals = [e["avg_yield_3y"] for e in entries]
    total_vals = [e["total_dividend"] for e in entries]

    years_min, years_max = min(years_vals), max(years_vals)
    yield_min, yield_max = min(yield_vals), max(yield_vals)
    total_min, total_max = min(total_vals), max(total_vals)

    for entry in entries:
        stability = _normalize(entry["consecutive_years"], years_min, years_max) * 100
        yield_score = _normalize(entry["avg_yield_3y"], yield_min, yield_max) * 100
        scale_score = _normalize(entry["total_dividend"], total_min, total_max) * 100
        entry["score"] = round(stability * 0.4 + yield_score * 0.35 + scale_score * 0.25, 1)


def _normalize(value: float, min_val: float, max_val: float) -> float:
    if max_val == min_val:
        return 0.5
    return (value - min_val) / (max_val - min_val)


# --- Legacy helpers kept for test compatibility ---

def _store_dividends(cursor, code: str, df) -> None:
    for _, row in df.iterrows():
        try:
            year = _extract_year(row)
            if not year or year < 1990:
                continue
            dps = _extract_dps(row)
            ex_date = _extract_date(row)
            plan = _extract_plan(row)
            total_amount = _extract_total_amount(row)
            if dps > 0:
                cursor.execute(
                    """INSERT INTO dividends (stock_code, year, plan, dps, ex_date, total_amount)
                       VALUES (?, ?, ?, ?, ?, ?)
                       ON CONFLICT(stock_code, year) DO UPDATE SET
                       plan=excluded.plan, dps=excluded.dps,
                       ex_date=excluded.ex_date, total_amount=excluded.total_amount""",
                    (code, year, plan, dps, ex_date, total_amount)
                )
        except Exception:
            continue


def _extract_year(row) -> Optional[int]:
    for col_name in ["年度", "报告期", "分红年度", "公告日期", "除权除息日"]:
        if col_name in row.index:
            val = str(row[col_name])
            try:
                if len(val) >= 4:
                    return int(val[:4])
            except (ValueError, TypeError):
                continue
    return None


def _extract_dps(row) -> float:
    for col_name in ["每股分红", "派息(每股)", "每股派息", "派息", "每股收益"]:
        if col_name in row.index:
            try:
                val = float(row[col_name])
                if val > 0:
                    return round(val, 4)
            except (ValueError, TypeError):
                continue
    for col_name in ["分红方案", "分配方案", "方案"]:
        if col_name in row.index:
            plan = str(row[col_name])
            dps = _parse_dps_from_plan(plan)
            if dps > 0:
                return dps
    return 0.0


def _parse_dps_from_plan(plan: str) -> float:
    match = re.search(r"10[股]?派(\d+\.?\d*)", plan)
    if match:
        try:
            return round(float(match.group(1)) / 10, 4)
        except ValueError:
            pass
    return 0.0


def _extract_date(row) -> str:
    for col_name in ["除权除息日", "除息日", "股权登记日"]:
        if col_name in row.index:
            val = str(row[col_name]).strip()
            if val and val != "nan" and val != "NaT" and len(val) >= 8:
                return val[:10]
    return ""


def _extract_plan(row) -> str:
    for col_name in ["分红方案", "分配方案", "方案"]:
        if col_name in row.index:
            val = str(row[col_name]).strip()
            if val and val != "nan":
                return val
    return ""


def _extract_total_amount(row) -> float:
    for col_name in ["分红总额", "派息总额", "现金分红总额"]:
        if col_name in row.index:
            try:
                val = float(row[col_name])
                return round(val, 2)
            except (ValueError, TypeError):
                continue
    return 0.0
