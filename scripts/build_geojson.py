"""
Download Census TIGER/Line county shapefiles, simplify geometry,
and output public/data/counties.geojson.

Target file size: 2-3 MB (hard ceiling: 5 MB).
GeoJSON properties must include GEOID, NAME, and STATE per architecture spec.

If TIGER/Line download fails after retries, a mock GeoJSON with minimal
geometry is generated so the frontend remains functional.
"""

import json
import logging
import os
import sys
import time
import zipfile

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(SCRIPT_DIR, "raw")
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "counties.geojson")

# Census TIGER/Line county shapefile URL (2022 vintage)
TIGER_URL = "https://www2.census.gov/geo/tiger/TIGER2022/COUNTY/tl_2022_us_county.zip"
TIGER_ZIP = os.path.join(RAW_DIR, "tl_2022_us_county.zip")
TIGER_DIR = os.path.join(RAW_DIR, "tiger_county")

MAX_RETRIES = 3
BACKOFF_BASE = 5
DOWNLOAD_TIMEOUT = 180

# Target sizes in bytes
TARGET_SIZE = 3 * 1024 * 1024  # 3 MB ideal
MAX_SIZE = 5 * 1024 * 1024     # 5 MB hard ceiling


def download_tiger() -> bool:
    """Download TIGER/Line county shapefile with retry logic."""
    os.makedirs(RAW_DIR, exist_ok=True)

    if os.path.exists(TIGER_ZIP) and os.path.getsize(TIGER_ZIP) > 1000:
        logger.info("TIGER shapefile already downloaded: %s", TIGER_ZIP)
        return True

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(
                "Downloading TIGER/Line counties (attempt %d/%d): %s",
                attempt, MAX_RETRIES, TIGER_URL,
            )
            response = requests.get(TIGER_URL, timeout=DOWNLOAD_TIMEOUT, stream=True)
            if response.status_code == 200:
                with open(TIGER_ZIP, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                size_mb = os.path.getsize(TIGER_ZIP) / (1024 * 1024)
                logger.info("Downloaded TIGER shapefile: %.1f MB", size_mb)
                return True
            else:
                logger.warning("HTTP %d from TIGER URL", response.status_code)
        except requests.RequestException as e:
            logger.warning(
                "TIGER download failed (attempt %d/%d): %s",
                attempt, MAX_RETRIES, e,
            )

        if attempt < MAX_RETRIES:
            wait = BACKOFF_BASE * (2 ** (attempt - 1))
            logger.info("Retrying in %d seconds...", wait)
            time.sleep(wait)

    logger.error(
        "FAILED to download TIGER shapefile after %d attempts. "
        "Census TIGER servers may be unavailable. "
        "Will generate mock GeoJSON.",
        MAX_RETRIES,
    )
    return False


def extract_tiger() -> bool:
    """Extract the TIGER zip file."""
    os.makedirs(TIGER_DIR, exist_ok=True)

    # Check if already extracted
    shp_files = [f for f in os.listdir(TIGER_DIR) if f.endswith(".shp")] if os.path.exists(TIGER_DIR) else []
    if shp_files:
        logger.info("TIGER shapefile already extracted: %s", shp_files[0])
        return True

    try:
        with zipfile.ZipFile(TIGER_ZIP, "r") as zf:
            zf.extractall(TIGER_DIR)
            logger.info("Extracted TIGER shapefile to %s", TIGER_DIR)
        return True
    except (zipfile.BadZipFile, Exception) as e:
        logger.error("Failed to extract TIGER zip: %s", e)
        return False


def round_coords(coords, precision=4):
    """Recursively round coordinate values to given decimal precision."""
    if isinstance(coords, (int, float)):
        return round(coords, precision)
    return [round_coords(c, precision) for c in coords]


def geometry_to_dict(geom, precision=4):
    """Convert a shapely geometry to a GeoJSON-compatible dict with rounded coords."""
    import shapely
    mapping = shapely.geometry.mapping(geom)
    mapping["coordinates"] = round_coords(mapping["coordinates"], precision)
    return mapping


def build_geojson_from_shapefile() -> bool:
    """Read shapefile, simplify with shapely, and write compact GeoJSON."""
    try:
        import geopandas as gpd
        import shapely
    except ImportError as e:
        logger.error(
            "Required packages not installed: %s. "
            "Run: pip install geopandas shapely",
            e,
        )
        return False

    # Find the .shp file
    shp_file = None
    for fname in os.listdir(TIGER_DIR):
        if fname.endswith(".shp"):
            shp_file = os.path.join(TIGER_DIR, fname)
            break

    if shp_file is None:
        logger.error("No .shp file found in %s", TIGER_DIR)
        return False

    logger.info("Reading shapefile: %s", shp_file)
    gdf = gpd.read_file(shp_file)
    logger.info("Loaded %d county features", len(gdf))

    # Keep only FIPS 01-56 (50 states + DC)
    conus_states = {str(i).zfill(2) for i in range(1, 57)}
    gdf = gdf[gdf["STATEFP"].isin(conus_states)].copy()
    logger.info("Filtered to %d CONUS+DC counties", len(gdf))

    # Ensure CRS is WGS84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)

    # Try increasing simplification tolerance until under target size
    # Use shapely simplify (Douglas-Peucker) + coordinate rounding
    tolerances = [0.005, 0.008, 0.01, 0.015, 0.02, 0.03, 0.05]
    precisions = [4, 4, 4, 4, 3, 3, 3]

    for tolerance, precision in zip(tolerances, precisions):
        logger.info("Simplifying with tolerance=%.4f, precision=%d...", tolerance, precision)

        features = []
        for _, row in gdf.iterrows():
            geoid = str(row.get("GEOID", "")).zfill(5)
            name = str(row.get("NAME", ""))
            statefp = str(row.get("STATEFP", geoid[:2]))

            simplified_geom = row.geometry.simplify(tolerance, preserve_topology=True)
            if simplified_geom.is_empty:
                continue

            feature = {
                "type": "Feature",
                "properties": {
                    "GEOID": geoid,
                    "NAME": name,
                    "STATE": statefp,
                },
                "geometry": geometry_to_dict(simplified_geom, precision),
            }
            features.append(feature)

        geojson = {
            "type": "FeatureCollection",
            "features": features,
        }

        # Use separators to minimize whitespace
        geojson_str = json.dumps(geojson, separators=(",", ":"))
        size_bytes = len(geojson_str.encode("utf-8"))
        size_mb = size_bytes / (1024 * 1024)
        logger.info(
            "Result: %.2f MB (%d features) [tolerance=%.4f, precision=%d]",
            size_mb, len(features), tolerance, precision,
        )

        if size_bytes <= MAX_SIZE:
            if size_bytes > TARGET_SIZE:
                logger.warning(
                    "GeoJSON is %.2f MB — above 3 MB target but below 5 MB ceiling",
                    size_mb,
                )
            os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
            with open(OUTPUT_PATH, "w") as f:
                f.write(geojson_str)
            logger.info("Wrote counties.geojson: %.2f MB (%d features)", size_mb, len(features))
            return True

        logger.info("File too large (%.2f MB), trying more aggressive simplification...", size_mb)

    logger.error("Could not simplify GeoJSON below 5 MB ceiling after multiple attempts")
    return False


def generate_mock_geojson():
    """Generate a minimal mock GeoJSON for frontend development."""
    logger.info("Generating mock counties.geojson for frontend fallback...")

    # Load demographics to get county list
    demo_path = os.path.join(PROJECT_DIR, "public", "data", "demographics", "counties.json")
    counties = {}
    if os.path.exists(demo_path):
        with open(demo_path, "r") as f:
            counties = json.load(f)

    # State FIPS to approximate centroids (lon, lat) for mock points
    state_centroids = {
        "AL": [-86.9, 32.3], "AK": [-153.5, 64.2], "AZ": [-111.1, 34.0],
        "AR": [-91.8, 34.7], "CA": [-119.4, 36.8], "CO": [-105.3, 39.1],
        "CT": [-72.8, 41.6], "DE": [-75.5, 39.0], "DC": [-77.0, 38.9],
        "FL": [-81.5, 27.6], "GA": [-83.5, 32.2], "HI": [-155.5, 19.9],
        "ID": [-114.5, 44.1], "IL": [-89.4, 40.6], "IN": [-86.1, 40.3],
        "IA": [-93.1, 42.0], "KS": [-98.5, 38.5], "KY": [-84.3, 37.8],
        "LA": [-92.0, 31.2], "ME": [-69.4, 45.3], "MD": [-76.6, 39.0],
        "MA": [-71.5, 42.2], "MI": [-84.5, 44.3], "MN": [-94.7, 46.7],
        "MS": [-89.7, 32.3], "MO": [-91.8, 38.6], "MT": [-109.1, 46.8],
        "NE": [-99.9, 41.1], "NV": [-116.4, 38.8], "NH": [-71.6, 43.2],
        "NJ": [-74.4, 40.1], "NM": [-105.9, 34.0], "NY": [-75.0, 43.0],
        "NC": [-80.0, 35.6], "ND": [-101.0, 47.5], "OH": [-82.9, 40.4],
        "OK": [-97.1, 35.0], "OR": [-120.6, 43.8], "PA": [-77.2, 41.2],
        "RI": [-71.5, 41.6], "SC": [-81.2, 34.0], "SD": [-99.9, 43.9],
        "TN": [-86.6, 35.5], "TX": [-99.9, 31.1], "UT": [-111.1, 39.3],
        "VT": [-72.6, 44.0], "VA": [-79.5, 37.4], "WA": [-120.7, 47.7],
        "WV": [-80.5, 38.6], "WI": [-89.6, 43.8], "WY": [-107.3, 43.1],
    }

    features = []
    for fips, data in counties.items():
        state = data.get("state", "")
        centroid = state_centroids.get(state, [-98.5, 39.8])
        # Create a tiny polygon around the centroid
        lon, lat = centroid
        # Add small offset based on FIPS to spread points
        offset = int(fips) % 100 * 0.01
        d = 0.05  # Small square ~5km
        polygon = [
            [
                [lon + offset - d, lat + offset - d],
                [lon + offset + d, lat + offset - d],
                [lon + offset + d, lat + offset + d],
                [lon + offset - d, lat + offset + d],
                [lon + offset - d, lat + offset - d],
            ]
        ]
        features.append({
            "type": "Feature",
            "properties": {
                "GEOID": fips,
                "NAME": data.get("name", ""),
                "STATE": fips[:2],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": polygon,
            },
        })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(geojson, f)

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    logger.info(
        "Wrote mock counties.geojson: %.1f KB (%d features). "
        "NOTE: This is mock data — real geometry requires TIGER/Line download.",
        size_kb, len(features),
    )


def main():
    success = download_tiger()

    if success:
        success = extract_tiger()

    if success:
        success = build_geojson_from_shapefile()

    if not success:
        logger.warning(
            "TIGER/Line processing failed. Generating mock GeoJSON fallback. "
            "BLOCKED: Real county geometry requires successful TIGER download."
        )
        generate_mock_geojson()


if __name__ == "__main__":
    main()
