"""Stock detail API router."""
import os
import urllib.request
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query

from backend.services.stock_service import get_stock_detail, get_stats

router = APIRouter(prefix="/api", tags=["stock"])


@router.get("/stock/{code}")
def stock_detail(code: str):
    """Get stock detail with dividend history."""
    if not code or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid stock code. Must be 6 digits.")

    result = get_stock_detail(code)
    if result is None:
        raise HTTPException(status_code=404, detail="Stock not found")

    return result


@router.get("/stock/{code}/price")
def stock_price(code: str, months: int = Query(default=6, ge=1, le=24)):
    """Get recent stock price history for chart display."""
    if not code or len(code) != 6 or not code.isdigit():
        raise HTTPException(status_code=400, detail="Invalid stock code.")

    # Bypass system proxy
    urllib.request.getproxies = lambda: {}
    os.environ.setdefault("NO_PROXY", "*")

    try:
        import akshare as ak
    except ImportError:
        raise HTTPException(status_code=500, detail="AKShare not installed")

    end_date = datetime.now().strftime("%Y%m%d")
    start_date = (datetime.now() - timedelta(days=months * 30)).strftime("%Y%m%d")

    # Determine exchange prefix for sina source
    if code.startswith("6"):
        symbol = f"sh{code}"
    else:
        symbol = f"sz{code}"

    try:
        df = ak.stock_zh_a_daily(
            symbol=symbol, start_date=start_date, end_date=end_date, adjust="qfq"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch price: {e}")

    if df is None or df.empty:
        return {"code": code, "prices": []}

    prices = []
    for _, row in df.iterrows():
        prices.append({
            "date": str(row["date"])[:10],
            "close": round(float(row["close"]), 2),
            "high": round(float(row["high"]), 2),
            "low": round(float(row["low"]), 2),
            "volume": int(row["volume"]),
        })

    return {"code": code, "prices": prices}


@router.get("/stats")
def stats():
    """Get overall statistics."""
    return get_stats()
