"""Tests for API endpoints."""
import pytest

from backend.database import get_connection


@pytest.fixture
def seed_data(temp_db):
    """Seed the database with test data."""
    conn = get_connection()
    cursor = conn.cursor()

    # Insert test stocks
    stocks = [
        ("600519", "贵州茅台", "白酒", 1800.0),
        ("601398", "工商银行", "银行", 5.50),
        ("000858", "五粮液", "白酒", 150.0),
    ]
    for code, name, industry, price in stocks:
        cursor.execute(
            "INSERT OR REPLACE INTO stocks (code, name, industry, current_price, updated_at) VALUES (?, ?, ?, ?, ?)",
            (code, name, industry, price, "2026-03-24 10:00")
        )

    # Insert test dividends
    dividends = [
        # 贵州茅台 - 5 consecutive years
        ("600519", 2024, "每10股派259.80元", 25.98, "2024-07-12", 326.52),
        ("600519", 2023, "每10股派240.00元", 24.00, "2023-07-14", 301.42),
        ("600519", 2022, "每10股派222.60元", 22.26, "2022-07-08", 279.68),
        ("600519", 2021, "每10股派216.75元", 21.68, "2021-07-16", 272.38),
        ("600519", 2020, "每10股派192.93元", 19.29, "2020-07-10", 242.36),
        # 工商银行 - 3 consecutive years
        ("601398", 2024, "每10股派3.064元", 0.31, "2024-07-05", 1092.68),
        ("601398", 2023, "每10股派2.933元", 0.29, "2023-07-07", 1045.86),
        ("601398", 2022, "每10股派2.933元", 0.29, "2022-07-08", 1045.86),
        # 五粮液 - 4 consecutive years
        ("000858", 2024, "每10股派45.60元", 4.56, "2024-07-10", 175.23),
        ("000858", 2023, "每10股派42.00元", 4.20, "2023-07-12", 161.38),
        ("000858", 2022, "每10股派38.50元", 3.85, "2022-07-15", 147.92),
        ("000858", 2021, "每10股派35.00元", 3.50, "2021-07-09", 134.56),
    ]
    for d in dividends:
        cursor.execute(
            "INSERT OR REPLACE INTO dividends (stock_code, year, plan, dps, ex_date, total_amount) VALUES (?, ?, ?, ?, ?, ?)",
            d
        )

    conn.commit()

    # Build ranking cache
    from backend.services.data_fetcher import _calculate_rankings
    _calculate_rankings(conn)

    conn.close()


class TestRankingAPI:
    """Tests for /api/ranking/{tab_type} endpoint."""

    def test_comprehensive_ranking(self, client, seed_data):
        res = client.get("/api/ranking/comprehensive")
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] == 3
        assert len(data["items"]) == 3
        # Items should have rank
        assert data["items"][0]["rank"] == 1

    def test_stable_ranking(self, client, seed_data):
        res = client.get("/api/ranking/stable")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 3
        # Should be sorted by consecutive years descending
        items = data["items"]
        assert items[0]["consecutive_years"] >= items[1]["consecutive_years"]

    def test_highest_ranking(self, client, seed_data):
        res = client.get("/api/ranking/highest")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 3

    def test_invalid_tab_type(self, client, seed_data):
        res = client.get("/api/ranking/invalid")
        assert res.status_code == 400

    def test_pagination(self, client, seed_data):
        res = client.get("/api/ranking/comprehensive?page=1&page_size=2")
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) == 2
        assert data["total_pages"] == 2

    def test_search(self, client, seed_data):
        res = client.get("/api/ranking/comprehensive?search=茅台")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "贵州茅台"

    def test_search_by_code(self, client, seed_data):
        res = client.get("/api/ranking/comprehensive?search=600519")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1

    def test_search_no_results(self, client, seed_data):
        res = client.get("/api/ranking/comprehensive?search=不存在的股票")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 0
        assert len(data["items"]) == 0

    def test_empty_database(self, client):
        res = client.get("/api/ranking/comprehensive")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 0


class TestStockDetailAPI:
    """Tests for /api/stock/{code} endpoint."""

    def test_existing_stock(self, client, seed_data):
        res = client.get("/api/stock/600519")
        assert res.status_code == 200
        data = res.json()
        assert data["code"] == "600519"
        assert data["name"] == "贵州茅台"
        assert "history" in data
        assert len(data["history"]) == 5

    def test_nonexistent_stock(self, client, seed_data):
        res = client.get("/api/stock/999999")
        assert res.status_code == 404

    def test_invalid_code_format(self, client, seed_data):
        res = client.get("/api/stock/abc")
        assert res.status_code == 400

    def test_history_ordered_descending(self, client, seed_data):
        res = client.get("/api/stock/600519")
        data = res.json()
        years = [h["year"] for h in data["history"]]
        assert years == sorted(years, reverse=True)


class TestStatsAPI:
    """Tests for /api/stats endpoint."""

    def test_stats_with_data(self, client, seed_data):
        res = client.get("/api/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["total_stocks"] == 3
        assert data["avg_dividend_yield"] > 0
        assert data["max_consecutive_years"] == 5
        assert data["max_consecutive_stock"] == "贵州茅台"

    def test_stats_empty(self, client):
        res = client.get("/api/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["total_stocks"] == 0


class TestUpdateAPI:
    """Tests for /api/update endpoint."""

    def test_update_cooldown(self, client, seed_data):
        """After a successful update log, subsequent calls within cooldown should fail."""
        conn = get_connection()
        cursor = conn.cursor()
        from datetime import datetime
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        cursor.execute(
            "INSERT INTO update_log (started_at, finished_at, status, stock_count) VALUES (?, ?, ?, ?)",
            (now, now, "success", 100)
        )
        conn.commit()
        conn.close()

        res = client.post("/api/update")
        assert res.status_code == 429


class TestFrontendRoutes:
    """Tests for frontend page serving."""

    def test_home_page(self, client):
        res = client.get("/")
        assert res.status_code == 200
        assert "分红股排行榜" in res.text

    def test_detail_page(self, client):
        res = client.get("/detail.html")
        assert res.status_code == 200

    def test_css_served(self, client):
        res = client.get("/css/style.css")
        assert res.status_code == 200

    def test_js_served(self, client):
        res = client.get("/js/api.js")
        assert res.status_code == 200
