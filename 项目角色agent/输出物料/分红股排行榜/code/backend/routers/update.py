"""Data update API router."""
import logging
import time
from datetime import datetime

from fastapi import APIRouter, HTTPException

from backend.database import get_connection
from backend.config import UPDATE_COOLDOWN
from backend.services.data_fetcher import fetch_and_store_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["update"])


@router.post("/update")
def trigger_update():
    """Trigger data update from AKShare."""
    # Check cooldown
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT finished_at FROM update_log
            WHERE status = 'success'
            ORDER BY id DESC LIMIT 1
        """)
        last_update = cursor.fetchone()

        if last_update and last_update["finished_at"]:
            last_time = datetime.strptime(last_update["finished_at"], "%Y-%m-%d %H:%M")
            elapsed = (datetime.now() - last_time).total_seconds()
            if elapsed < UPDATE_COOLDOWN:
                remaining = int(UPDATE_COOLDOWN - elapsed)
                raise HTTPException(
                    status_code=429,
                    detail=f"Update cooldown active. Please wait {remaining} seconds."
                )
    finally:
        conn.close()

    # Start update
    start_time = datetime.now()
    start_str = start_time.strftime("%Y-%m-%d %H:%M")

    # Log update start
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO update_log (started_at, status) VALUES (?, ?)",
        (start_str, "running")
    )
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Perform update
    stock_count, error_msg = fetch_and_store_data()

    # Log result
    end_time = datetime.now()
    end_str = end_time.strftime("%Y-%m-%d %H:%M")
    duration = (end_time - start_time).total_seconds()
    status = "success" if not error_msg else "failed"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE update_log SET finished_at=?, status=?, stock_count=?, error_message=?
           WHERE id=?""",
        (end_str, status, stock_count, error_msg, log_id)
    )
    conn.commit()
    conn.close()

    if error_msg:
        raise HTTPException(status_code=500, detail=f"Update failed: {error_msg}")

    return {
        "status": "success",
        "stock_count": stock_count,
        "updated_at": end_str,
        "duration_seconds": round(duration, 1),
    }
