"""
Download County Business Patterns (CBP) and American Community Survey (ACS)
5-Year bulk CSV files from the Census Bureau into scripts/raw/.
"""

import os
import sys
import time
import logging
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(SCRIPT_DIR, "raw")

# Census Bureau bulk data URLs
# CBP: County Business Patterns 2021 (most recent complete year available as bulk CSV)
# ACS: American Community Survey 5-Year Estimates 2022
DOWNLOADS = {
    "cbp": {
        "url": "https://www2.census.gov/programs-surveys/cbp/datasets/2021/cbp21co.zip",
        "filename": "cbp21co.zip",
        "description": "County Business Patterns 2021 (county-level)",
    },
    "acs_demographics": {
        "url": "https://data.census.gov/api/access/table/download?tableId=DP05&vintage=2022&geography=county&format=csv",
        "filename": "acs_dp05_demographics.csv",
        "description": "ACS 5-Year 2022 Demographic Profiles (DP05)",
    },
    "acs_economics": {
        "url": "https://data.census.gov/api/access/table/download?tableId=DP03&vintage=2022&geography=county&format=csv",
        "filename": "acs_dp03_economics.csv",
        "description": "ACS 5-Year 2022 Economic Profiles (DP03)",
    },
}

MAX_RETRIES = 3
BACKOFF_BASE = 5  # seconds


def download_file(url: str, dest_path: str, description: str) -> bool:
    """Download a file with retry logic and backoff."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(
                "Downloading %s (attempt %d/%d): %s",
                description, attempt, MAX_RETRIES, url,
            )
            response = requests.get(url, timeout=120, stream=True)

            if response.status_code == 200:
                with open(dest_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                file_size = os.path.getsize(dest_path)
                logger.info(
                    "Successfully downloaded %s (%d bytes) -> %s",
                    description, file_size, dest_path,
                )
                return True
            else:
                logger.warning(
                    "HTTP %d for %s from URL: %s",
                    response.status_code, description, url,
                )
        except requests.RequestException as e:
            logger.warning(
                "Request failed for %s (attempt %d/%d): %s | URL: %s",
                description, attempt, MAX_RETRIES, e, url,
            )

        if attempt < MAX_RETRIES:
            wait = BACKOFF_BASE * (2 ** (attempt - 1))
            logger.info("Retrying in %d seconds...", wait)
            time.sleep(wait)

    logger.error(
        "FAILED to download %s after %d attempts. "
        "Expected URL: %s. "
        "The Census Bureau may be unavailable or URLs may have changed. "
        "Mock data remains in place for frontend functionality.",
        description, MAX_RETRIES, url,
    )
    return False


def extract_zip(zip_path: str, extract_dir: str) -> bool:
    """Extract a zip file to the given directory."""
    import zipfile
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)
            names = zf.namelist()
            logger.info("Extracted %d files from %s: %s", len(names), zip_path, names)
        return True
    except zipfile.BadZipFile as e:
        logger.error("Failed to extract %s: %s", zip_path, e)
        return False


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    failures = []

    for key, info in DOWNLOADS.items():
        dest_path = os.path.join(RAW_DIR, info["filename"])

        # Skip if already downloaded
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
            logger.info("Already exists, skipping: %s", dest_path)
        else:
            success = download_file(info["url"], dest_path, info["description"])
            if not success:
                failures.append(key)
                continue

        # Extract zip files
        if dest_path.endswith(".zip"):
            if not extract_zip(dest_path, RAW_DIR):
                failures.append(key)

    if failures:
        logger.error(
            "Some downloads failed: %s. "
            "The Census Bureau may be unavailable or URLs may have changed. "
            "Mock data from T2 remains in place so the frontend stays functional. "
            "Manual URL research may be needed to unblock.",
            failures,
        )
        # Exit with code 0 — failures are logged but not fatal per task spec.
        # The frontend does not depend on real data.
        sys.exit(0)
    else:
        logger.info("All downloads completed successfully.")


if __name__ == "__main__":
    main()
