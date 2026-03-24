"""Data models - plain dataclasses for internal use."""
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Stock:
    code: str
    name: str
    industry: str = ""
    current_price: float = 0.0
    updated_at: str = ""


@dataclass
class Dividend:
    stock_code: str
    year: int
    plan: str = ""
    dps: float = 0.0
    ex_date: str = ""
    total_amount: float = 0.0


@dataclass
class RankingEntry:
    stock_code: str
    consecutive_years: int = 0
    latest_dps: float = 0.0
    latest_yield: float = 0.0
    avg_yield_3y: float = 0.0
    total_dividend: float = 0.0
    composite_score: float = 0.0
    updated_at: str = ""
