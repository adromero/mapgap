import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AboutDialogProps {
  children: React.ReactNode;
}

export function AboutDialog({ children }: AboutDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]" data-testid="about-dialog">
        <DialogHeader>
          <DialogTitle>About MapGap</DialogTitle>
          <DialogDescription>
            Understanding the opportunity score methodology
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="mb-1 font-semibold">What is MapGap?</h3>
            <p className="text-muted-foreground">
              MapGap visualizes underserved business markets across US counties.
              Select a business category to see a county-level choropleth map
              colored by an &ldquo;opportunity score&rdquo; — a composite metric
              reflecting high demand but low business density.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Opportunity Score Formula</h3>
            <p className="text-muted-foreground">
              The score combines three factors for each county within an industry:
            </p>
            <div className="mt-2 rounded bg-muted p-3 font-mono text-xs">
              score = normalize( (population / establishments) × income_weight × growth_weight )
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>Population per business</strong> — higher means more
                underserved (base metric)
              </li>
              <li>
                <strong>Income weight</strong> — 1.0 + 0.3 × normalize(median
                income). Wealthier areas have more purchasing power.
              </li>
              <li>
                <strong>Growth weight</strong> — 1.0 + 0.2 × normalize(population
                growth). Growing areas indicate future demand.
              </li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              All scores are min-max normalized to 0–100 within each industry.
              Counties with zero establishments receive a capped maximum raw score.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Data Sources</h3>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>County Business Patterns (CBP)</strong> — U.S. Census
                Bureau. Provides establishment counts by NAICS code per county.
              </li>
              <li>
                <strong>American Community Survey (ACS) 5-Year Estimates</strong>{' '}
                — U.S. Census Bureau. Provides population, income, age, and
                household demographics.
              </li>
              <li>
                <strong>TIGER/Line Shapefiles</strong> — U.S. Census Bureau.
                County boundary geometries.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-semibold">Limitations</h3>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Census data has a 1–2 year lag; business counts may not reflect
                recent openings or closures.
              </li>
              <li>
                The score does not account for competition from neighboring
                counties, online businesses, or brand franchises.
              </li>
              <li>
                NAICS codes may not perfectly capture all businesses in a category
                (e.g., a gas station with a coffee counter may not be coded as a
                coffee shop).
              </li>
              <li>
                Scores compare counties within an industry, not across industries.
                A score of 80 in &ldquo;Coffee Shops&rdquo; is not directly
                comparable to 80 in &ldquo;Pet Grooming.&rdquo;
              </li>
              <li>
                This tool is for exploratory research only and should not be the
                sole basis for business investment decisions.
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
