import { lazy, Suspense, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileSheet } from "@/components/layout/MobileSheet";
import { IndustryPicker } from "@/components/controls/IndustryPicker";
import { MetricSelect, type MetricKey } from "@/components/controls/MetricSelect";
import { StateFilter } from "@/components/controls/StateFilter";
import { TopCountiesList } from "@/components/sidebar/TopCountiesList";
import { MapLegend } from "@/components/map/MapLegend";
import { DetailPanel } from "@/components/detail/DetailPanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { WelcomeDialog } from "@/components/WelcomeDialog";

const MapView = lazy(() =>
  import("@/components/map/MapView").then((m) => ({ default: m.MapView }))
);
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useMapState } from "@/hooks/useMapState";
import { useIndustryData } from "@/hooks/useIndustryData";
import { useCountyData } from "@/hooks/useCountyData";

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("score");

  const {
    selectedIndustryId,
    selectedCountyFips,
    stateFilter,
    selectIndustry,
    selectCounty,
    filterByState,
  } = useMapState();

  const {
    industries,
    industriesLoading,
    scores,
    scoresLoading,
    topCounties,
  } = useIndustryData(selectedIndustryId, stateFilter);

  const {
    loading: demographicsLoading,
    error: demographicsError,
    ensureLoaded,
    lookupByFips,
    retry: retryDemographics,
  } = useCountyData();

  const selectedScore = selectedCountyFips && scores ? scores[selectedCountyFips] ?? null : null;
  const selectedDemographics = selectedCountyFips ? lookupByFips(selectedCountyFips) : null;

  const sidebarContent = (
    <div className="space-y-4">
      <IndustryPicker
        industries={industries}
        selectedId={selectedIndustryId}
        onSelect={selectIndustry}
        loading={industriesLoading}
      />
      <MetricSelect value={metric} onChange={setMetric} />
      <StateFilter value={stateFilter} onChange={filterByState} />
      {selectedIndustryId && (
        <>
          <MapLegend />
          <TopCountiesList
            counties={topCounties}
            loading={scoresLoading}
          />
        </>
      )}
    </div>
  );

  const detailPanelProps = {
    countyFips: selectedCountyFips,
    countyScore: selectedScore,
    demographics: selectedDemographics,
    loading: demographicsLoading,
    error: demographicsError,
    onClose: () => selectCounty(null),
    onRetry: retryDemographics,
    onEnsureLoaded: ensureLoaded,
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <WelcomeDialog />
      <Header onMenuClick={() => setMobileOpen(true)} />

      <MobileSheet open={mobileOpen} onOpenChange={setMobileOpen}>
        {sidebarContent}
      </MobileSheet>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar>{sidebarContent}</Sidebar>

        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Map */}
          <div className="flex-1">
            <MapErrorBoundary>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <span className="text-muted-foreground">Loading map...</span>
                  </div>
                }
              >
                <MapView scores={scores} metric={metric} onCountyClick={selectCounty} stateFilter={stateFilter} />
              </Suspense>
            </MapErrorBoundary>
          </div>

          {/* Detail panel - desktop: inline */}
          <div className="hidden md:block">
            <DetailPanel {...detailPanelProps} />
          </div>
        </main>
      </div>

      {/* Detail panel - mobile: bottom drawer */}
      <Drawer
        open={!!selectedCountyFips}
        onOpenChange={(open) => { if (!open) selectCounty(null); }}
      >
        <DrawerContent className="max-h-[85vh] md:hidden">
          <div className="overflow-y-auto">
            <DetailPanel {...detailPanelProps} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default App;
