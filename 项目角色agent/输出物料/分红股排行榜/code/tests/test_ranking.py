"""Tests for ranking calculation logic."""
import pytest
from backend.services.data_fetcher import _calc_consecutive_years, _calc_composite_scores, _normalize, _parse_dps_from_plan


class TestConsecutiveYears:
    """Tests for consecutive dividend year calculation."""

    def test_empty_years(self):
        assert _calc_consecutive_years([]) == 0

    def test_single_year(self):
        assert _calc_consecutive_years([2024]) == 1

    def test_consecutive(self):
        assert _calc_consecutive_years([2024, 2023, 2022, 2021]) == 4

    def test_gap_in_middle(self):
        """Years with a gap should only count the recent consecutive run."""
        assert _calc_consecutive_years([2024, 2023, 2021, 2020]) == 2

    def test_unordered_input(self):
        """Input may not be sorted."""
        assert _calc_consecutive_years([2021, 2024, 2022, 2023]) == 4

    def test_duplicates(self):
        """Duplicate years should be handled."""
        assert _calc_consecutive_years([2024, 2024, 2023, 2022]) == 3

    def test_old_gap(self):
        """Gap far back - only count from most recent."""
        assert _calc_consecutive_years([2024, 2023, 2022, 2020, 2019, 2018]) == 3

    def test_long_streak(self):
        years = list(range(2024, 1997, -1))  # 27 years
        assert _calc_consecutive_years(years) == 27


class TestNormalize:
    """Tests for normalization function."""

    def test_basic(self):
        assert _normalize(5, 0, 10) == 0.5

    def test_min_value(self):
        assert _normalize(0, 0, 10) == 0.0

    def test_max_value(self):
        assert _normalize(10, 0, 10) == 1.0

    def test_equal_min_max(self):
        """When min == max, return 0.5."""
        assert _normalize(5, 5, 5) == 0.5


class TestCompositeScore:
    """Tests for composite score calculation."""

    def test_single_entry(self):
        entries = [{"consecutive_years": 10, "avg_yield_3y": 3.0, "total_dividend": 100}]
        _calc_composite_scores(entries)
        # Single entry: all normalized to 0.5 (since min==max)
        expected = 0.5 * 100 * 0.4 + 0.5 * 100 * 0.35 + 0.5 * 100 * 0.25
        assert entries[0]["score"] == pytest.approx(expected, abs=0.1)

    def test_two_entries_ordering(self):
        entries = [
            {"consecutive_years": 20, "avg_yield_3y": 5.0, "total_dividend": 1000},
            {"consecutive_years": 5, "avg_yield_3y": 1.0, "total_dividend": 100},
        ]
        _calc_composite_scores(entries)
        assert entries[0]["score"] > entries[1]["score"]
        # First entry should have max score (100 * 0.4 + 100 * 0.35 + 100 * 0.25 = 100)
        assert entries[0]["score"] == pytest.approx(100.0, abs=0.1)
        # Second entry should have min score (0)
        assert entries[1]["score"] == pytest.approx(0.0, abs=0.1)

    def test_empty_entries(self):
        entries = []
        _calc_composite_scores(entries)  # Should not raise


class TestParseDpsFromPlan:
    """Tests for parsing DPS from dividend plan text."""

    def test_standard_format(self):
        assert _parse_dps_from_plan("每10股派25.98元") == pytest.approx(2.598, abs=0.001)

    def test_short_format(self):
        assert _parse_dps_from_plan("10派3.00") == pytest.approx(0.3, abs=0.001)

    def test_no_match(self):
        assert _parse_dps_from_plan("不分配") == 0.0

    def test_empty_string(self):
        assert _parse_dps_from_plan("") == 0.0
