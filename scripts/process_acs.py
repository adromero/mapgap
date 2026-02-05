"""
Process American Community Survey (ACS) 5-Year data.

Extracts demographics per county (population, income, age, household data)
and computes state averages for comparison charts.

Input: scripts/raw/acs_dp05_demographics.csv, acs_dp03_economics.csv
Output: scripts/processed/acs_demographics.json
"""

import json
import logging
import os
import sys

import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(SCRIPT_DIR, "raw")
PROCESSED_DIR = os.path.join(SCRIPT_DIR, "processed")

# Expected ACS files
ACS_DP05_PATH = os.path.join(RAW_DIR, "acs_dp05_demographics.csv")
ACS_DP03_PATH = os.path.join(RAW_DIR, "acs_dp03_economics.csv")


def load_acs_csv(path: str) -> pd.DataFrame | None:
    """Load an ACS CSV file, handling the Census Bureau's dual-header format."""
    if not os.path.exists(path):
        logger.warning("ACS file not found: %s", path)
        return None

    try:
        # Census data.census.gov CSVs have a header row and a label row
        df = pd.read_csv(path, dtype=str, low_memory=False)
        # If the second row looks like labels (non-numeric), skip it
        if len(df) > 0 and "Label" in str(df.iloc[0].values):
            df = df.iloc[1:].reset_index(drop=True)
        logger.info("Loaded %s: %d rows, %d columns", path, len(df), len(df.columns))
        return df
    except Exception as e:
        logger.error("Failed to load %s: %s", path, e)
        return None


def extract_fips(geo_id: str) -> str | None:
    """Extract 5-digit FIPS from GEO_ID like '0500000US01001'."""
    if not isinstance(geo_id, str):
        return None
    if "US" in geo_id:
        return geo_id.split("US")[-1].zfill(5)
    # Already a FIPS code
    if len(geo_id) == 5 and geo_id.isdigit():
        return geo_id
    return None


def fips_to_state(fips: str) -> str:
    """Get 2-digit state FIPS from county FIPS."""
    return fips[:2]


# State FIPS to abbreviation mapping
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


def process_demographics(dp05: pd.DataFrame | None, dp03: pd.DataFrame | None) -> dict:
    """
    Process ACS DP05 (demographics) and DP03 (economic) data into
    county demographics keyed by FIPS.
    """
    counties = {}

    if dp05 is not None:
        logger.info("Processing DP05 (demographic) data...")
        process_dp05(dp05, counties)

    if dp03 is not None:
        logger.info("Processing DP03 (economic) data...")
        process_dp03(dp03, counties)

    return counties


def safe_float(val, default=0.0):
    """Safely convert a value to float."""
    try:
        if val is None or (isinstance(val, str) and val.strip() in ("", "-", "(X)", "N", "null")):
            return default
        return float(str(val).replace(",", "").replace("+", "").replace("%", ""))
    except (ValueError, TypeError):
        return default


def find_column(df: pd.DataFrame, patterns: list[str]) -> str | None:
    """Find a column matching one of the patterns (case-insensitive partial match)."""
    cols = list(df.columns)
    for pattern in patterns:
        for col in cols:
            if pattern.upper() in col.upper():
                return col
    return None


def process_dp05(df: pd.DataFrame, counties: dict):
    """Extract population, age distribution from DP05."""
    # Identify GEO_ID column
    geo_col = find_column(df, ["GEO_ID", "GEOID", "Geography"])
    name_col = find_column(df, ["NAME", "Geographic Area Name"])

    if geo_col is None:
        logger.warning("Could not find GEO_ID column in DP05. Columns: %s", list(df.columns)[:20])
        return

    # Common DP05 variable patterns
    pop_col = find_column(df, ["DP05_0001E", "SEX AND AGE!!Total population"])
    median_age_col = find_column(df, ["DP05_0018E", "SEX AND AGE!!Median age"])
    under18_col = find_column(df, ["DP05_0019E"])
    age18to34_cols = [find_column(df, [f"DP05_00{i}E"]) for i in range(20, 25)]
    age35to54_cols = [find_column(df, [f"DP05_00{i}E"]) for i in range(25, 30)]
    age55to74_cols = [find_column(df, [f"DP05_00{i}E"]) for i in range(30, 35)]
    age75plus_col = find_column(df, ["DP05_0035E", "DP05_0036E"])

    for _, row in df.iterrows():
        fips = extract_fips(str(row.get(geo_col, "")))
        if fips is None or len(fips) != 5:
            continue

        state_fips = fips_to_state(fips)
        state_abbr = STATE_FIPS_TO_ABBR.get(state_fips, "")

        name = str(row.get(name_col, "")) if name_col else ""
        # Clean county name: "Autauga County, Alabama" -> "Autauga County"
        if "," in name:
            name = name.split(",")[0].strip()

        population = safe_float(row.get(pop_col)) if pop_col else 0
        median_age = safe_float(row.get(median_age_col)) if median_age_col else 0

        county = counties.setdefault(fips, {
            "fips": fips,
            "name": name,
            "state": state_abbr,
            "population": 0,
            "medianIncome": 0,
            "medianAge": 0,
            "householdSize": 0,
            "populationGrowth": 0,
            "ageDistribution": {
                "under18": 0, "age18to34": 0, "age35to54": 0,
                "age55to74": 0, "age75plus": 0,
            },
            "incomeDistribution": {
                "under25k": 0, "income25kTo50k": 0, "income50kTo75k": 0,
                "income75kTo100k": 0, "over100k": 0,
            },
            "stateAverages": {
                "medianIncome": 0, "medianAge": 0, "populationPerSqMi": 0,
            },
        })

        county["population"] = int(population)
        county["medianAge"] = round(median_age, 1)
        if name:
            county["name"] = name
        if state_abbr:
            county["state"] = state_abbr

    logger.info("Processed DP05: %d counties", len(counties))


def process_dp03(df: pd.DataFrame, counties: dict):
    """Extract income and economic data from DP03."""
    geo_col = find_column(df, ["GEO_ID", "GEOID", "Geography"])
    if geo_col is None:
        logger.warning("Could not find GEO_ID column in DP03. Columns: %s", list(df.columns)[:20])
        return

    # DP03 variable patterns
    median_income_col = find_column(df, ["DP03_0062E", "INCOME AND BENEFITS!!Median household income"])
    hh_size_col = find_column(df, ["DP03_0010E"])

    # Income distribution columns (percentages)
    under25k_col = find_column(df, ["DP03_0052E"])  # Less than $10,000
    # We'll aggregate multiple income brackets if available

    for _, row in df.iterrows():
        fips = extract_fips(str(row.get(geo_col, "")))
        if fips is None or len(fips) != 5:
            continue

        state_fips = fips_to_state(fips)
        state_abbr = STATE_FIPS_TO_ABBR.get(state_fips, "")

        median_income = safe_float(row.get(median_income_col)) if median_income_col else 0
        hh_size = safe_float(row.get(hh_size_col)) if hh_size_col else 0

        county = counties.setdefault(fips, {
            "fips": fips,
            "name": "",
            "state": state_abbr,
            "population": 0,
            "medianIncome": 0,
            "medianAge": 0,
            "householdSize": 0,
            "populationGrowth": 0,
            "ageDistribution": {
                "under18": 0, "age18to34": 0, "age35to54": 0,
                "age55to74": 0, "age75plus": 0,
            },
            "incomeDistribution": {
                "under25k": 0, "income25kTo50k": 0, "income50kTo75k": 0,
                "income75kTo100k": 0, "over100k": 0,
            },
            "stateAverages": {
                "medianIncome": 0, "medianAge": 0, "populationPerSqMi": 0,
            },
        })

        county["medianIncome"] = int(median_income)
        if hh_size > 0:
            county["householdSize"] = round(hh_size, 1)

    logger.info("Processed DP03: updated %d counties with economic data", len(counties))


def compute_state_averages(counties: dict):
    """Compute state averages for comparison charts."""
    state_data = {}
    for fips, county in counties.items():
        state = county.get("state", "")
        if not state:
            continue
        state_data.setdefault(state, {"incomes": [], "ages": [], "populations": []})
        if county["medianIncome"] > 0:
            state_data[state]["incomes"].append(county["medianIncome"])
        if county["medianAge"] > 0:
            state_data[state]["ages"].append(county["medianAge"])
        if county["population"] > 0:
            state_data[state]["populations"].append(county["population"])

    state_averages = {}
    for state, data in state_data.items():
        avg_income = sum(data["incomes"]) / len(data["incomes"]) if data["incomes"] else 0
        avg_age = sum(data["ages"]) / len(data["ages"]) if data["ages"] else 0
        state_averages[state] = {
            "medianIncome": round(avg_income),
            "medianAge": round(avg_age, 1),
            "populationPerSqMi": 0,  # Would need area data to compute
        }

    # Apply state averages back to each county
    for fips, county in counties.items():
        state = county.get("state", "")
        if state in state_averages:
            county["stateAverages"] = state_averages[state]

    logger.info("Computed state averages for %d states", len(state_averages))


def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    dp05 = load_acs_csv(ACS_DP05_PATH)
    dp03 = load_acs_csv(ACS_DP03_PATH)

    if dp05 is None and dp03 is None:
        logger.warning(
            "No ACS data files found in %s. "
            "Run download_census.py first, or the Census Bureau download may have failed. "
            "Mock data remains in place for frontend functionality.",
            RAW_DIR,
        )
        # Write empty result so downstream scripts don't break
        output_path = os.path.join(PROCESSED_DIR, "acs_demographics.json")
        with open(output_path, "w") as f:
            json.dump({}, f)
        logger.info("Wrote empty ACS result to %s", output_path)
        sys.exit(0)

    counties = process_demographics(dp05, dp03)
    compute_state_averages(counties)

    # Log summary
    logger.info("Total counties processed: %d", len(counties))
    populated = sum(1 for c in counties.values() if c["population"] > 0)
    with_income = sum(1 for c in counties.values() if c["medianIncome"] > 0)
    logger.info("Counties with population: %d, with income: %d", populated, with_income)

    output_path = os.path.join(PROCESSED_DIR, "acs_demographics.json")
    with open(output_path, "w") as f:
        json.dump(counties, f, indent=2)
    logger.info("Wrote ACS demographics to %s", output_path)


if __name__ == "__main__":
    main()
