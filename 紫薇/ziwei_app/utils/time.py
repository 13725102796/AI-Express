"""时间工具（统一 Asia/Shanghai +08:00）."""
from __future__ import annotations

from datetime import date, datetime, timezone, timedelta

CST = timezone(timedelta(hours=8))


def now_cst() -> datetime:
    return datetime.now(CST)


def today_cst() -> date:
    return now_cst().date()


def yesterday_cst() -> date:
    return today_cst() - timedelta(days=1)


def to_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=CST)
    return dt.astimezone(CST).isoformat()
