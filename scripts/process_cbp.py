"""
Process County Business Patterns (CBP) data.

Parses the CBP CSV, maps NAICS codes to the 15 industry categories
defined in industries.json, and outputs establishment counts per county
per industry.

Output: scripts/processed/cbp_by_industry.json
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
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
INDUSTRIES_PATH = os.path.join(PROJECT_DIR, "public", "data", "industries.json")

# CBP CSV file — the 2021 county-level file
CBP_CSV_CANDIDATES = [
    os.path.join(RAW_DIR, "cbp21co.txt"),
    os.path.join(RAW_DIR, "CBP2021.CB2100CBP-Data.csv"),
]


def load_industries():
    """Load industry definitions from industries.json."""
    with open(INDUSTRIES_PATH, "r") as f:
        industries = json.load(f)
    logger.info("Loaded %d industry categories from %s", len(industries), INDUSTRIES_PATH)
    return industries


def build_naics_map(industries):
    """Build a mapping from NAICS code -> list of industry IDs."""
    naics_to_industries = {}
    for ind in industries:
        for code in ind["naicsCodes"]:
            naics_to_industries.setdefault(code, []).append(ind["id"])
    logger.info("NAICS mapping: %d codes -> %d industries", len(naics_to_industries), len(industries))
    return naics_to_industries


def find_cbp_file():
    """Find the CBP data file in raw/."""
    for candidate in CBP_CSV_CANDIDATES:
        if os.path.exists(candidate):
            logger.info("Found CBP data file: %s", candidate)
            return candidate

    # Check for any CSV/txt files in raw/ that might be CBP data
    if os.path.exists(RAW_DIR):
        for fname in os.listdir(RAW_DIR):
            lower = fname.lower()
            if "cbp" in lower and (lower.endswith(".txt") or lower.endswith(".csv")):
                path = os.path.join(RAW_DIR, fname)
                logger.info("Found CBP data file by name match: %s", path)
                return path

    return None


def process_cbp_classic(cbp_path, naics_map):
    """Process classic CBP format (cbp21co.txt — pipe or comma delimited)."""
    # Try reading with different delimiters
    try:
        df = pd.read_csv(cbp_path, dtype=str, low_memory=False)
    except Exception:
        df = pd.read_csv(cbp_path, dtype=str, low_memory=False, sep="|")

    logger.info("CBP data loaded: %d rows, columns: %s", len(df), list(df.columns))

    # Normalize column names to uppercase
    df.columns = [c.strip().upper() for c in df.columns]

    # Identify FIPS columns
    if "FIPSTATE" in df.columns and "FIPSCTY" in df.columns:
        df["FIPS"] = df["FIPSTATE"].str.zfill(2) + df["FIPSCTY"].str.zfill(3)
    elif "GEO_ID" in df.columns:
        # Format: 0500000US01001
        df["FIPS"] = df["GEO_ID"].str[-5:]
    else:
        logger.error("Cannot identify FIPS columns. Available: %s", list(df.columns))
        return None

    # Identify NAICS column
    naics_col = None
    for candidate in ["NAICS", "NAICS2017", "NAICS2012"]:
        if candidate in df.columns:
            naics_col = candidate
            break
    if naics_col is None:
        logger.error("Cannot identify NAICS column. Available: %s", list(df.columns))
        return None

    # Identify establishment count column
    est_col = None
    for candidate in ["EST", "ESTAB", "ESTABLISHMENT"]:
        if candidate in df.columns:
            est_col = candidate
            break
    if est_col is None:
        logger.error("Cannot identify establishment column. Available: %s", list(df.columns))
        return None

    logger.info("Using columns: FIPS from FIPSTATE+FIPSCTY, NAICS=%s, EST=%s", naics_col, est_col)

    # Filter to our NAICS codes and aggregate
    target_naics = set(naics_map.keys())
    # CBP NAICS field may have trailing slashes or dashes for ranges
    df["NAICS_CLEAN"] = df[naics_col].str.strip().str.rstrip("/").str.rstrip("-")

    matched = df[df["NAICS_CLEAN"].isin(target_naics)].copy()
    logger.info("Matched %d rows to target NAICS codes (out of %d total)", len(matched), len(df))

    # Convert establishment count to numeric
    matched[est_col] = pd.to_numeric(matched[est_col], errors="coerce").fillna(0).astype(int)

    # Build result: {industry_id: {fips: count}}
    result = {}
    for _, row in matched.iterrows():
        fips = row["FIPS"]
        naics = row["NAICS_CLEAN"]
        est = int(row[est_col])
        for industry_id in naics_map.get(naics, []):
            result.setdefault(industry_id, {})
            result[industry_id][fips] = result[industry_id].get(fips, 0) + est

    return result


def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    industries = load_industries()
    naics_map = build_naics_map(industries)

    cbp_path = find_cbp_file()
    if cbp_path is None:
        logger.warning(
            "No CBP data file found in %s. "
            "Run download_census.py first, or the Census Bureau download may have failed. "
            "Mock data remains in place for frontend functionality.",
            RAW_DIR,
        )
        # Write empty result so downstream scripts don't break
        output_path = os.path.join(PROCESSED_DIR, "cbp_by_industry.json")
        with open(output_path, "w") as f:
            json.dump({}, f)
        logger.info("Wrote empty CBP result to %s", output_path)
        sys.exit(0)

    result = process_cbp_classic(cbp_path, naics_map)
    if result is None:
        logger.error("Failed to process CBP data. Check column format.")
        # Write empty result
        output_path = os.path.join(PROCESSED_DIR, "cbp_by_industry.json")
        with open(output_path, "w") as f:
            json.dump({}, f)
        sys.exit(0)

    # Log summary
    for industry_id, counties in result.items():
        total_est = sum(counties.values())
        logger.info("  %s: %d counties, %d total establishments", industry_id, len(counties), total_est)

    output_path = os.path.join(PROCESSED_DIR, "cbp_by_industry.json")
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    logger.info("Wrote CBP results to %s", output_path)


if __name__ == "__main__":
    main()
