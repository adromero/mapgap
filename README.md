# MapGap

**Discover underserved business markets across US counties.**

MapGap is a single-page web application that visualizes business opportunity gaps at the county level. Select a business category and instantly see a choropleth map colored by an "opportunity score" — a composite metric reflecting high demand but low business density. Click any county for detailed demographics, business counts, and comparison charts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Tailwind CSS 3.4 |
| Map | MapLibre GL JS (open-source, no API key) |
| Charts | Recharts |
| Data | Pre-processed static JSON + GeoJSON |
| Linting | ESLint 9 flat config, zero-warning policy |
| Testing | Vitest + React Testing Library |
| Deployment | Vercel (static, CDN-backed) |

## Development Setup

```bash
# Install dependencies
npm install

# Start dev server (port 3034)
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3034 |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint with zero-warning policy |
| `npm run test` | Run unit tests with Vitest |

## Data Pipeline

The `scripts/` directory contains Python scripts that download and preprocess US Census data into the static JSON files served by the frontend.

### Prerequisites

```bash
cd scripts
pip install -r requirements.txt
```

### Pipeline Steps

```bash
python download_census.py    # Download raw Census data (CBP + ACS)
python process_cbp.py        # Process County Business Patterns
python process_acs.py        # Process American Community Survey
python compute_scores.py     # Calculate opportunity scores per industry
python build_geojson.py      # Simplify county boundaries → GeoJSON
```

### Data Sources

- **County Business Patterns (CBP):** Establishment counts by NAICS code per county
- **American Community Survey (ACS) 5-Year:** Population, income, age, household data
- **Census TIGER/Line:** County boundary shapefiles

### Output Files

| File | Description |
|------|-------------|
| `public/data/counties.geojson` | Simplified county boundaries (~2-3 MB) |
| `public/data/industries.json` | Industry category definitions |
| `public/data/scores/*.json` | Per-industry county opportunity scores |
| `public/data/demographics/counties.json` | County-level demographics |

## Build & Deployment

```bash
# Production build
npm run build

# Output: dist/ directory with all static assets
```

### Vercel Deployment

The project includes a `vercel.json` configuration. Deploy by connecting the repository to Vercel — no environment variables or API keys are required.

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## Industry Categories

| Category | NAICS Code | Description |
|----------|-----------|-------------|
| Coffee Shops | 722515 | Coffee & snack bars |
| Pet Grooming | 812910 | Pet care services |
| Gyms & Fitness | 713940 | Fitness centers |
| Laundromats | 812310 | Coin-operated laundries |
| Daycare Centers | 624410 | Child day care services |
| Auto Repair | 811111 | General auto repair |
| Bakeries | 311811 | Retail bakeries |
| Barbershops | 812111 | Barber shops |
| Dentists | 621210 | Offices of dentists |
| Veterinarians | 541940 | Veterinary services |
| Pharmacies | 446110 | Pharmacies & drug stores |
| Florists | 453110 | Florist shops |
| Insurance Agents | 524210 | Insurance agencies |
| Real Estate | 531210 | Real estate agents |
| Restaurants | 722511 | Full-service restaurants |

## Opportunity Score Methodology

The opportunity score identifies counties where consumer demand is high relative to the number of existing businesses.

### Formula

```
score = normalize(
    (population / establishment_count) ×
    median_income_weight ×
    population_growth_weight
)
```

### Scoring Factors

| Factor | Weight | Rationale |
|--------|--------|-----------|
| Population per business | Base metric | Higher ratio = more underserved |
| Median income | 1.0 + 0.3 × normalize(income) | Wealthier areas = more purchasing power |
| Population growth | 1.0 + 0.2 × normalize(growth) | Growing areas = increasing future demand |

### Normalization

All scores are min-max normalized to 0–100 within each industry category. Counties with zero establishments receive a capped maximum raw score (to avoid division by zero) before normalization.

### Limitations

- Scores reflect statistical opportunity, not guaranteed business viability
- Data vintage depends on the most recent Census releases
- County-level granularity may mask sub-county variation
- The model does not account for zoning, competition from adjacent counties, or brand saturation

## Disclaimer

This application is for educational and informational purposes only. Opportunity scores reflect statistical patterns and do not guarantee business viability.

## License

MIT