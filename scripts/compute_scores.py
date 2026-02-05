"""
Compute opportunity scores per county per industry.

Joins CBP establishment counts with ACS demographics, applies the
opportunity score formula, and outputs one JSON per industry into
public/data/scores/.

Formula:
  raw_score = (population / establishment_count) * income_weight * growth_weight
  income_weight = 1.0 + 0.3 * normalize(median_income)
  growth_weight = 1.0 + 0.2 * normalize(population_growth)
  final_score = min-max normalize to [0, 100] within each industry

Counties with zero establishments get a capped maximum raw score
(95th percentile of non-zero counties) before normalization.

Input:
  scripts/processed/cbp_by_industry.json
  scripts/processed/acs_demographics.json
  public/data/industries.json
Output:
  public/data/scores/{industry-id}.json (one per industry)
"""

import json
import logging
import os
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(SCRIPT_DIR, "processed")
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INDUSTRIES_PATH = os.path.join(PROJECT_DIR, "public", "data", "industries.json")
SCORES_DIR = os.path.join(PROJECT_DIR, "public", "data", "scores")
DEMOGRAPHICS_PATH = os.path.join(PROJECT_DIR, "public", "data", "demographics", "counties.json")

CBP_PATH = os.path.join(PROCESSED_DIR, "cbp_by_industry.json")
ACS_PATH = os.path.join(PROCESSED_DIR, "acs_demographics.json")

# State FIPS to abbreviation (same as process_acs.py)
STATE_FIPS_TO_ABBR = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
    "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
    "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
    "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
    "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
    "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY", "72": "PR",
}

# County names from CBP data (FIPS -> name), populated from demographics
COUNTY_NAMES = {}


def normalize_values(values: list[float]) -> list[float]:
    """Min-max normalize a list of values to [0, 1]."""
    if not values:
        return []
    min_val = min(values)
    max_val = max(values)
    if max_val == min_val:
        return [0.5] * len(values)
    return [(v - min_val) / (max_val - min_val) for v in values]


def normalize_scores(raw_scores: list[float]) -> list[float]:
    """Min-max normalize raw scores to [0, 100] range."""
    if not raw_scores:
        return []
    min_val = min(raw_scores)
    max_val = max(raw_scores)
    if max_val == min_val:
        return [50.0] * len(raw_scores)
    return [
        round((v - min_val) / (max_val - min_val) * 100)
        for v in raw_scores
    ]


def compute_capped_score(pop_per_biz_values: list[float]) -> float:
    """Compute the cap for zero-establishment counties (95th percentile)."""
    if not pop_per_biz_values:
        return 1.0
    sorted_vals = sorted(pop_per_biz_values)
    idx = int(len(sorted_vals) * 0.95)
    idx = min(idx, len(sorted_vals) - 1)
    return sorted_vals[idx]


def compute_industry_scores(
    industry_id: str,
    cbp_data: dict,
    demographics: dict,
) -> dict:
    """
    Compute opportunity scores for one industry.

    Returns: Record<fips, CountyScore> matching the TypeScript interface.
    """
    establishment_counts = cbp_data.get(industry_id, {})

    if not establishment_counts and not demographics:
        logger.warning("No data for industry %s — skipping", industry_id)
        return {}

    # Gather all FIPS codes from both sources
    all_fips = set(establishment_counts.keys()) | set(demographics.keys())
    # Filter to valid county FIPS (5 digits, state <= 56 to exclude territories beyond PR)
    all_fips = {f for f in all_fips if len(f) == 5 and f[:2] in STATE_FIPS_TO_ABBR}

    if not all_fips:
        logger.warning("No valid FIPS for industry %s", industry_id)
        return {}

    # Collect income and growth values for normalization
    incomes = []
    growths = []
    for fips in all_fips:
        demo = demographics.get(fips, {})
        income = demo.get("medianIncome", 0)
        growth = demo.get("populationGrowth", 0)
        if income > 0:
            incomes.append(income)
        growths.append(growth)

    # Normalize income and growth across all counties
    income_min = min(incomes) if incomes else 0
    income_max = max(incomes) if incomes else 1
    income_range = income_max - income_min if income_max != income_min else 1

    growth_min = min(growths) if growths else 0
    growth_max = max(growths) if growths else 1
    growth_range = growth_max - growth_min if growth_max != growth_min else 1

    # Compute pop/biz for non-zero establishment counties
    pop_per_biz_nonzero = []
    for fips in all_fips:
        demo = demographics.get(fips, {})
        pop = demo.get("population", 0)
        est = establishment_counts.get(fips, 0)
        if est > 0 and pop > 0:
            pop_per_biz_nonzero.append(pop / est)

    cap = compute_capped_score(pop_per_biz_nonzero)

    # Compute raw scores
    county_raw = {}
    county_info = {}
    for fips in all_fips:
        demo = demographics.get(fips, {})
        pop = demo.get("population", 0)
        est = establishment_counts.get(fips, 0)
        income = demo.get("medianIncome", 0)
        growth = demo.get("populationGrowth", 0)
        name = demo.get("name", "")
        state = demo.get("state", STATE_FIPS_TO_ABBR.get(fips[:2], ""))

        if pop <= 0:
            continue

        # Pop per biz ratio (capped for zero establishments)
        if est > 0:
            pop_per_biz = pop / est
        else:
            pop_per_biz = cap  # Capped score for zero-establishment counties

        # Income weight: 1.0 + 0.3 * normalize(income)
        norm_income = (income - income_min) / income_range if income > 0 else 0.0
        income_weight = 1.0 + 0.3 * norm_income

        # Growth weight: 1.0 + 0.2 * normalize(growth)
        norm_growth = (growth - growth_min) / growth_range
        growth_weight = 1.0 + 0.2 * norm_growth

        raw = pop_per_biz * income_weight * growth_weight

        county_raw[fips] = raw
        county_info[fips] = {
            "name": name,
            "state": state,
            "est": est,
            "pop_per_biz": round(pop_per_biz),
        }

    if not county_raw:
        logger.warning("No counties with valid data for %s", industry_id)
        return {}

    # Normalize to 0-100
    fips_list = list(county_raw.keys())
    raw_list = [county_raw[f] for f in fips_list]
    normalized = normalize_scores(raw_list)

    # Build output matching CountyScore TypeScript interface
    result = {}
    for fips, score in zip(fips_list, normalized):
        info = county_info[fips]
        result[fips] = {
            "fips": fips,
            "name": info["name"],
            "state": info["state"],
            "score": score,
            "establishmentCount": info["est"],
            "populationPerBiz": info["pop_per_biz"],
        }

    return result


def main():
    os.makedirs(SCORES_DIR, exist_ok=True)

    # Load industries
    with open(INDUSTRIES_PATH, "r") as f:
        industries = json.load(f)
    logger.info("Loaded %d industries", len(industries))

    # Load CBP data
    if not os.path.exists(CBP_PATH):
        logger.error("CBP data not found at %s. Run process_cbp.py first.", CBP_PATH)
        sys.exit(1)
    with open(CBP_PATH, "r") as f:
        cbp_data = json.load(f)
    logger.info("Loaded CBP data: %d industries", len(cbp_data))

    # Load ACS demographics (may be empty if Census download failed)
    demographics = {}
    if os.path.exists(ACS_PATH):
        with open(ACS_PATH, "r") as f:
            demographics = json.load(f)
    logger.info("Loaded ACS demographics: %d counties", len(demographics))

    # If ACS data is empty, try using the existing demographics file
    if not demographics and os.path.exists(DEMOGRAPHICS_PATH):
        logger.info("ACS processed data empty, falling back to existing demographics file")
        with open(DEMOGRAPHICS_PATH, "r") as f:
            demographics = json.load(f)
        logger.info("Loaded fallback demographics: %d counties", len(demographics))

    if not demographics:
        logger.warning(
            "No demographics data available. "
            "Scores will use establishment counts only (no income/growth weighting). "
            "Run download_census.py and process_acs.py to get full scoring."
        )

    # Compute scores for each industry
    total_written = 0
    for industry in industries:
        industry_id = industry["id"]
        scores = compute_industry_scores(industry_id, cbp_data, demographics)

        output_path = os.path.join(SCORES_DIR, f"{industry_id}.json")
        with open(output_path, "w") as f:
            json.dump(scores, f, indent=2)

        logger.info(
            "  %s: %d counties scored -> %s",
            industry_id, len(scores), output_path,
        )
        total_written += 1

    logger.info("Wrote %d industry score files to %s", total_written, SCORES_DIR)


if __name__ == "__main__":
    main()
