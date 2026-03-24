"""Ranking API router."""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from backend.services.ranking import get_ranking

router = APIRouter(prefix="/api", tags=["ranking"])


@router.get("/ranking/{tab_type}")
def ranking(
    tab_type: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
):
    """Get ranking data by tab type: comprehensive, stable, or highest."""
    valid_tabs = ["comprehensive", "stable", "highest"]
    if tab_type not in valid_tabs:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid tab_type. Must be one of: {', '.join(valid_tabs)}",
        )

    result = get_ranking(tab_type, page, page_size, search)
    return result
