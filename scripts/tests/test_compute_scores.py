"""Unit tests for compute_scores.py score normalization."""

import sys
import os

# Add parent directory to path so we can import compute_scores
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compute_scores import (
    normalize_scores,
    compute_capped_score,
    compute_industry_scores,
)


def test_normalize_scores_range():
    """All normalized scores must be in [0, 100]."""
    raw = [10, 20, 50, 100, 200, 500, 1000]
    result = normalize_scores(raw)
    assert len(result) == len(raw)
    for score in result:
        assert 0 <= score <= 100, f"Score {score} out of [0, 100] range"


def test_normalize_scores_min_max():
    """Minimum raw value maps to 0, maximum to 100."""
    raw = [5, 50, 100]
    result = normalize_scores(raw)
    assert result[0] == 0
    assert result[-1] == 100


def test_normalize_scores_single_value():
    """A single unique value normalizes to 50 (midpoint)."""
    result = normalize_scores([42.0])
    assert result == [50.0]


def test_normalize_scores_identical_values():
    """All identical values normalize to 50."""
    result = normalize_scores([7.0, 7.0, 7.0])
    assert all(s == 50.0 for s in result)


def test_normalize_scores_empty():
    """Empty input returns empty output."""
    assert normalize_scores([]) == []


def test_normalize_scores_two_values():
    """Two distinct values map to 0 and 100."""
    result = normalize_scores([10, 20])
    assert result[0] == 0
    assert result[1] == 100


def test_capped_score_95th_percentile():
    """Capped score should be approximately the 95th percentile."""
    values = list(range(1, 101))  # 1 to 100
    cap = compute_capped_score(values)
    # int(100 * 0.95) = 95 index in 0-based sorted list -> value 96
    assert cap == 96


def test_capped_score_empty():
    """Empty input gives default cap of 1.0."""
    assert compute_capped_score([]) == 1.0


def test_zero_establishment_counties_get_capped_score():
    """Counties with zero establishments should get a capped score, not infinity."""
    demographics = {
        "01001": {
            "population": 50000,
            "medianIncome": 50000,
            "populationGrowth": 1.5,
            "name": "County A",
            "state": "AL",
        },
        "01003": {
            "population": 100000,
            "medianIncome": 60000,
            "populationGrowth": 2.0,
            "name": "County B",
            "state": "AL",
        },
        "01005": {
            "population": 30000,
            "medianIncome": 40000,
            "populationGrowth": 0.5,
            "name": "County C",
            "state": "AL",
        },
    }
    cbp_data = {
        "test-industry": {
            "01001": 10,
            "01003": 20,
            # 01005 has zero establishments (not in CBP data)
        }
    }

    scores = compute_industry_scores("test-industry", cbp_data, demographics)

    # All counties should have scores
    assert "01001" in scores
    assert "01003" in scores
    assert "01005" in scores  # Zero-establishment county should still appear

    # All scores must be in [0, 100]
    for fips, county_score in scores.items():
        assert 0 <= county_score["score"] <= 100, (
            f"FIPS {fips} score {county_score['score']} out of range"
        )

    # Zero-establishment county should have a valid (non-infinite) score
    zero_est = scores["01005"]
    assert zero_est["establishmentCount"] == 0
    assert isinstance(zero_est["score"], (int, float))
    assert zero_est["score"] <= 100


def test_output_matches_typescript_interface():
    """Output CountyScore must have exact fields matching TypeScript interface."""
    demographics = {
        "06037": {
            "population": 10000000,
            "medianIncome": 70000,
            "populationGrowth": 1.0,
            "name": "Los Angeles County",
            "state": "CA",
        },
    }
    cbp_data = {"test-industry": {"06037": 500}}

    scores = compute_industry_scores("test-industry", cbp_data, demographics)
    assert "06037" in scores

    county = scores["06037"]
    # Verify exact field names from TypeScript CountyScore interface
    required_fields = {"fips", "name", "state", "score", "establishmentCount", "populationPerBiz"}
    assert set(county.keys()) == required_fields, (
        f"Fields mismatch: got {set(county.keys())}, expected {required_fields}"
    )

    # Verify types
    assert isinstance(county["fips"], str)
    assert isinstance(county["name"], str)
    assert isinstance(county["state"], str)
    assert isinstance(county["score"], (int, float))
    assert isinstance(county["establishmentCount"], int)
    assert isinstance(county["populationPerBiz"], (int, float))


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
