"""Pydantic schemas for API request/response validation."""
from pydantic import BaseModel
from typing import List, Optional


class RankingItem(BaseModel):
    rank: int
    code: str
    name: str
    industry: str
    score: Optional[float] = None
    consecutive_years: Optional[int] = None
    dividend_yield: Optional[float] = None
    avg_yield_3y: Optional[float] = None
    dps: Optional[float] = None
    total_dividend: Optional[float] = None


class RankingResponse(BaseModel):
    items: List[RankingItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class DividendHistory(BaseModel):
    year: int
    plan: str
    dps: float
    dividend_yield: float
    ex_date: str
    total_amount: float


class StockDetail(BaseModel):
    code: str
    name: str
    industry: str
    score: float
    comprehensive_rank: int
    consecutive_years: int
    dividend_yield: float
    avg_yield_3y: float
    total_dividend: float
    history: List[DividendHistory]


class StatsResponse(BaseModel):
    total_stocks: int
    avg_dividend_yield: float
    max_consecutive_years: int
    max_consecutive_stock: str
    last_updated: str


class UpdateResponse(BaseModel):
    status: str
    stock_count: int
    updated_at: str
    duration_seconds: float
