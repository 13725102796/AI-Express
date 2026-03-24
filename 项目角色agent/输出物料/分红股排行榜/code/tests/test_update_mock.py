"""Tests for data update flow with mocked AKShare calls."""
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd

from backend.database import get_connection
from backend.services.data_fetcher import (
    fetch_and_store_data,
    _fetch_stock_dividends,
    _store_dividends,
    _extract_year,
    _extract_dps,
    _extract_date,
    _extract_plan,
    _extract_total_amount,
)


# --- Mock data fixtures ---

def make_stock_df():
    """Create a mock stock list DataFrame mimicking ak.stock_zh_a_spot_em()."""
    return pd.DataFrame({
        "代码": ["600519", "601398", "000858"],
        "名称": ["贵州茅台", "工商银行", "五粮液"],
        "最新价": [1800.0, 5.50, 150.0],
        "行业": ["白酒", "银行", "白酒"],
    })


def make_dividend_df(code: str):
    """Create a mock dividend DataFrame mimicking ak.stock_history_dividend_detail()."""
    data = {
        "600519": pd.DataFrame({
            "年度": ["2024", "2023", "2022"],
            "每股分红": [25.98, 24.00, 22.26],
            "除权除息日": ["2024-07-12", "2023-07-14", "2022-07-08"],
            "分红方案": ["每10股派259.80元", "每10股派240.00元", "每10股派222.60元"],
            "分红总额": [326.52, 301.42, 279.68],
        }),
        "601398": pd.DataFrame({
            "年度": ["2024", "2023"],
            "每股分红": [0.31, 0.29],
            "除权除息日": ["2024-07-05", "2023-07-07"],
            "分红方案": ["每10股派3.064元", "每10股派2.933元"],
            "分红总额": [1092.68, 1045.86],
        }),
        "000858": pd.DataFrame({
            "年度": ["2024", "2023", "2022", "2021"],
            "每股分红": [4.56, 4.20, 3.85, 3.50],
            "除权除息日": ["2024-07-10", "2023-07-12", "2022-07-15", "2021-07-09"],
            "分红方案": ["每10股派45.60元", "每10股派42.00元", "每10股派38.50元", "每10股派35.00元"],
            "分红总额": [175.23, 161.38, 147.92, 134.56],
        }),
    }
    return data.get(code)


# --- Tests for full update flow with mocks ---

class TestFetchAndStoreWithMock:
    """Test the complete fetch_and_store_data flow with mocked AKShare."""

    @patch("backend.services.data_fetcher.ak", create=True)
    def test_full_update_success(self, mock_ak, temp_db):
        """Complete update flow: fetch stocks -> fetch dividends -> calculate rankings."""
        # Mock akshare import inside the function
        with patch.dict("sys.modules", {"akshare": mock_ak, "pandas": pd}):
            mock_ak.stock_zh_a_spot_em.return_value = make_stock_df()
            mock_ak.stock_history_dividend_detail.side_effect = lambda symbol, indicator: make_dividend_df(symbol)

            count, error = fetch_and_store_data()

        assert error == ""
        assert count == 3

        # Verify stocks were stored
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM stocks")
        assert cursor.fetchone()["cnt"] == 3

        # Verify dividends were stored
        cursor.execute("SELECT COUNT(*) as cnt FROM dividends")
        assert cursor.fetchone()["cnt"] > 0

        # Verify ranking cache was built
        cursor.execute("SELECT COUNT(*) as cnt FROM ranking_cache")
        assert cursor.fetchone()["cnt"] == 3

        # Verify composite scores are calculated
        cursor.execute("SELECT composite_score FROM ranking_cache ORDER BY composite_score DESC")
        scores = [row["composite_score"] for row in cursor.fetchall()]
        assert all(s >= 0 for s in scores)
        assert scores == sorted(scores, reverse=True)

        conn.close()

    @patch("backend.services.data_fetcher.ak", create=True)
    def test_update_with_empty_stock_list(self, mock_ak, temp_db):
        """Should handle empty stock list gracefully."""
        with patch.dict("sys.modules", {"akshare": mock_ak, "pandas": pd}):
            mock_ak.stock_zh_a_spot_em.return_value = pd.DataFrame()

            count, error = fetch_and_store_data()

        assert count == 0
        assert "Empty stock list" in error

    @patch("backend.services.data_fetcher.ak", create=True)
    def test_update_with_stock_list_failure(self, mock_ak, temp_db):
        """Should handle stock list fetch failure."""
        with patch.dict("sys.modules", {"akshare": mock_ak, "pandas": pd}):
            mock_ak.stock_zh_a_spot_em.side_effect = Exception("Network error")

            count, error = fetch_and_store_data()

        assert count == 0
        assert "Network error" in error

    @patch("backend.services.data_fetcher.ak", create=True)
    def test_update_with_partial_dividend_failure(self, mock_ak, temp_db):
        """Some stocks fail to fetch dividends but others succeed."""
        def mock_dividend(symbol, indicator):
            if symbol == "601398":
                raise Exception("Timeout")
            return make_dividend_df(symbol)

        with patch.dict("sys.modules", {"akshare": mock_ak, "pandas": pd}):
            mock_ak.stock_zh_a_spot_em.return_value = make_stock_df()
            mock_ak.stock_history_dividend_detail.side_effect = mock_dividend

            count, error = fetch_and_store_data()

        # Should still process the other 2 stocks
        assert count == 2
        assert error == ""

    @patch("backend.services.data_fetcher.ak", create=True)
    def test_update_filters_st_stocks(self, mock_ak, temp_db):
        """ST stocks should be filtered out."""
        stock_df = pd.DataFrame({
            "代码": ["600519", "000001", "600123"],
            "名称": ["贵州茅台", "*ST某某", "ST退市"],
            "最新价": [1800.0, 3.0, 1.0],
        })

        with patch.dict("sys.modules", {"akshare": mock_ak, "pandas": pd}):
            mock_ak.stock_zh_a_spot_em.return_value = stock_df
            mock_ak.stock_history_dividend_detail.side_effect = lambda symbol, indicator: make_dividend_df(symbol)

            count, error = fetch_and_store_data()

        # Only 贵州茅台 should remain (ST stocks filtered)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM stocks")
        assert cursor.fetchone()["cnt"] == 1
        conn.close()

    @patch("backend.services.data_fetcher.ak", create=True)
    def test_update_idempotent(self, mock_ak, temp_db):
        """Running update twice should not create duplicate records."""
        with patch.dict("sys.modules", {"akshare": mock_ak, "pandas": pd}):
            mock_ak.stock_zh_a_spot_em.return_value = make_stock_df()
            mock_ak.stock_history_dividend_detail.side_effect = lambda symbol, indicator: make_dividend_df(symbol)

            fetch_and_store_data()
            fetch_and_store_data()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM stocks")
        assert cursor.fetchone()["cnt"] == 3  # No duplicates

        cursor.execute("SELECT COUNT(*) as cnt FROM ranking_cache")
        assert cursor.fetchone()["cnt"] == 3  # No duplicates
        conn.close()

    def test_akshare_not_installed(self, temp_db):
        """Should handle AKShare not being installed."""
        with patch.dict("sys.modules", {"akshare": None}):
            count, error = fetch_and_store_data()

        assert count == 0
        assert "not installed" in error or "No module" in error or count == 0


class TestUpdateAPIWithMock:
    """Test the /api/update endpoint with mocked AKShare."""

    @patch("backend.routers.update.fetch_and_store_data")
    def test_update_endpoint_success(self, mock_fetch, client):
        """POST /api/update should return success with stock count."""
        mock_fetch.return_value = (150, "")

        res = client.post("/api/update")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["stock_count"] == 150
        assert "updated_at" in data
        assert "duration_seconds" in data

    @patch("backend.routers.update.fetch_and_store_data")
    def test_update_endpoint_failure(self, mock_fetch, client):
        """POST /api/update should return 500 on fetch failure."""
        mock_fetch.return_value = (0, "AKShare network timeout")

        res = client.post("/api/update")
        assert res.status_code == 500
        assert "AKShare network timeout" in res.json()["detail"]

    @patch("backend.routers.update.fetch_and_store_data")
    def test_update_endpoint_cooldown(self, mock_fetch, client):
        """POST /api/update should enforce 5-minute cooldown."""
        mock_fetch.return_value = (100, "")

        # First call succeeds
        res1 = client.post("/api/update")
        assert res1.status_code == 200

        # Second call within cooldown should be rejected
        res2 = client.post("/api/update")
        assert res2.status_code == 429
        assert "cooldown" in res2.json()["detail"].lower()

    @patch("backend.routers.update.fetch_and_store_data")
    def test_update_endpoint_zero_stocks(self, mock_fetch, client):
        """POST /api/update with zero stocks but no error is still success."""
        mock_fetch.return_value = (0, "")

        res = client.post("/api/update")
        assert res.status_code == 200
        assert res.json()["stock_count"] == 0


class TestStoreDividends:
    """Test the _store_dividends helper with various DataFrame formats."""

    def test_standard_format(self, temp_db):
        """Standard column names from akshare."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO stocks (code, name, updated_at) VALUES (?, ?, ?)",
            ("600519", "贵州茅台", "2026-01-01")
        )
        conn.commit()

        df = pd.DataFrame({
            "年度": ["2024", "2023"],
            "每股分红": [25.98, 24.00],
            "除权除息日": ["2024-07-12", "2023-07-14"],
            "分红方案": ["每10股派259.80元", "每10股派240.00元"],
            "分红总额": [326.52, 301.42],
        })
        _store_dividends(cursor, "600519", df)
        conn.commit()

        cursor.execute("SELECT COUNT(*) as cnt FROM dividends WHERE stock_code = '600519'")
        assert cursor.fetchone()["cnt"] == 2
        conn.close()

    def test_plan_only_format(self, temp_db):
        """Only plan text available, DPS parsed from plan."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO stocks (code, name, updated_at) VALUES (?, ?, ?)",
            ("600519", "贵州茅台", "2026-01-01")
        )
        conn.commit()

        df = pd.DataFrame({
            "年度": ["2024"],
            "分红方案": ["每10股派25.98元"],
        })
        _store_dividends(cursor, "600519", df)
        conn.commit()

        cursor.execute("SELECT dps FROM dividends WHERE stock_code = '600519' AND year = 2024")
        row = cursor.fetchone()
        assert row is not None
        assert row["dps"] == pytest.approx(2.598, abs=0.001)
        conn.close()

    def test_skip_zero_dps(self, temp_db):
        """Rows with zero DPS should be skipped."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO stocks (code, name, updated_at) VALUES (?, ?, ?)",
            ("600519", "贵州茅台", "2026-01-01")
        )
        conn.commit()

        df = pd.DataFrame({
            "年度": ["2024"],
            "分红方案": ["不分配"],
        })
        _store_dividends(cursor, "600519", df)
        conn.commit()

        cursor.execute("SELECT COUNT(*) as cnt FROM dividends WHERE stock_code = '600519'")
        assert cursor.fetchone()["cnt"] == 0
        conn.close()

    def test_alternate_column_names(self, temp_db):
        """Test with alternate column names that akshare may return."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO stocks (code, name, updated_at) VALUES (?, ?, ?)",
            ("601398", "工商银行", "2026-01-01")
        )
        conn.commit()

        df = pd.DataFrame({
            "报告期": ["2024-12-31"],
            "派息(每股)": [0.31],
            "除息日": ["2024-07-05"],
            "方案": ["每10股派3.064元"],
            "派息总额": [1092.68],
        })
        _store_dividends(cursor, "601398", df)
        conn.commit()

        cursor.execute("SELECT dps, total_amount FROM dividends WHERE stock_code = '601398'")
        row = cursor.fetchone()
        assert row is not None
        assert row["dps"] == pytest.approx(0.31, abs=0.01)
        assert row["total_amount"] == pytest.approx(1092.68, abs=0.01)
        conn.close()


class TestExtractHelpers:
    """Test individual extraction helper functions."""

    def test_extract_year_standard(self):
        row = pd.Series({"年度": "2024"})
        assert _extract_year(row) == 2024

    def test_extract_year_date_format(self):
        row = pd.Series({"报告期": "2024-12-31"})
        assert _extract_year(row) == 2024

    def test_extract_year_missing(self):
        row = pd.Series({"其他列": "abc"})
        assert _extract_year(row) is None

    def test_extract_dps_direct(self):
        row = pd.Series({"每股分红": 2.5})
        assert _extract_dps(row) == 2.5

    def test_extract_dps_from_plan(self):
        row = pd.Series({"分红方案": "每10股派25.00元"})
        assert _extract_dps(row) == pytest.approx(2.5, abs=0.001)

    def test_extract_dps_zero(self):
        row = pd.Series({"分红方案": "不分配"})
        assert _extract_dps(row) == 0.0

    def test_extract_date_standard(self):
        row = pd.Series({"除权除息日": "2024-07-12"})
        assert _extract_date(row) == "2024-07-12"

    def test_extract_date_nan(self):
        row = pd.Series({"除权除息日": "nan"})
        assert _extract_date(row) == ""

    def test_extract_plan(self):
        row = pd.Series({"分红方案": "每10股派25.98元"})
        assert _extract_plan(row) == "每10股派25.98元"

    def test_extract_total_amount(self):
        row = pd.Series({"分红总额": 326.52})
        assert _extract_total_amount(row) == 326.52

    def test_extract_total_amount_missing(self):
        row = pd.Series({"其他列": 100})
        assert _extract_total_amount(row) == 0.0
