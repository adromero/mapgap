import { useState, useCallback } from 'react';

export interface MapViewport {
  center: [number, number];
  zoom: number;
}

export interface MapState {
  selectedIndustryId: string | null;
  selectedCountyFips: string | null;
  hoveredCountyFips: string | null;
  viewport: MapViewport;
  stateFilter: string | null;
}

const DEFAULT_VIEWPORT: MapViewport = {
  center: [-98.5, 39.8],
  zoom: 4,
};

export function useMapState() {
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [selectedCountyFips, setSelectedCountyFips] = useState<string | null>(null);
  const [hoveredCountyFips, setHoveredCountyFips] = useState<string | null>(null);
  const [viewport, setViewport] = useState<MapViewport>(DEFAULT_VIEWPORT);
  const [stateFilter, setStateFilter] = useState<string | null>(null);

  const selectIndustry = useCallback((id: string | null) => {
    setSelectedIndustryId(id);
  }, []);

  const selectCounty = useCallback((fips: string | null) => {
    setSelectedCountyFips(fips);
  }, []);

  const hoverCounty = useCallback((fips: string | null) => {
    setHoveredCountyFips(fips);
  }, []);

  const updateViewport = useCallback((v: MapViewport) => {
    setViewport(v);
  }, []);

  const filterByState = useCallback((abbr: string | null) => {
    setStateFilter(abbr);
  }, []);

  return {
    selectedIndustryId,
    selectedCountyFips,
    hoveredCountyFips,
    viewport,
    stateFilter,
    selectIndustry,
    selectCounty,
    hoverCounty,
    updateViewport,
    filterByState,
  };
}
