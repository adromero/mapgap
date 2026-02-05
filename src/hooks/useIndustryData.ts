import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Industry, CountyScore, IndustryScores } from '@/types';

interface UseIndustryDataReturn {
  industries: Industry[];
  industriesLoading: boolean;
  industriesError: string | null;
  scores: IndustryScores | null;
  scoresLoading: boolean;
  scoresError: string | null;
  topCounties: CountyScore[];
  isValidIndustryId: (id: string) => boolean;
}

const ID_FORMAT = /^[a-zA-Z0-9_-]+$/;

export function useIndustryData(
  selectedIndustryId: string | null,
  stateFilter: string | null,
): UseIndustryDataReturn {
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [industriesLoading, setIndustriesLoading] = useState(true);
  const [industriesError, setIndustriesError] = useState<string | null>(null);

  const [rawScores, setRawScores] = useState<IndustryScores | null>(null);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresError, setScoresError] = useState<string | null>(null);

  const scoreCache = useRef<Map<string, IndustryScores>>(new Map());
  const industriesRef = useRef<Industry[]>([]);

  // Load industries list once on mount
  useEffect(() => {
    let cancelled = false;

    async function loadIndustries() {
      try {
        const res = await fetch('/data/industries.json');
        if (!res.ok) {
          throw new Error(`Failed to load industries: ${res.status}`);
        }
        const data: Industry[] = await res.json();
        if (!cancelled) {
          setIndustries(data);
          industriesRef.current = data;
          setIndustriesLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setIndustriesError(
            err instanceof Error ? err.message : 'Failed to load industries',
          );
          setIndustriesLoading(false);
        }
      }
    }

    loadIndustries();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load score data when industry selection changes
  useEffect(() => {
    if (!selectedIndustryId || industriesLoading) {
      setRawScores(null);
      setScoresError(null);
      setScoresLoading(false);
      return;
    }

    // Validate ID format (defense-in-depth)
    if (!ID_FORMAT.test(selectedIndustryId)) {
      setScoresError('Unknown industry ID');
      setRawScores(null);
      setScoresLoading(false);
      return;
    }

    // Validate against loaded industry list
    const valid = industriesRef.current.some(
      (ind) => ind.id === selectedIndustryId,
    );
    if (!valid) {
      setScoresError(`Unknown industry ID: ${selectedIndustryId}`);
      setRawScores(null);
      setScoresLoading(false);
      return;
    }

    // Check cache
    const cached = scoreCache.current.get(selectedIndustryId);
    if (cached) {
      setRawScores(cached);
      setScoresError(null);
      setScoresLoading(false);
      return;
    }

    let cancelled = false;
    setScoresLoading(true);
    setScoresError(null);

    async function loadScores() {
      try {
        const res = await fetch(
          `/data/scores/${encodeURIComponent(selectedIndustryId!)}.json`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load scores: ${res.status}`);
        }
        const data: IndustryScores = await res.json();
        if (!cancelled) {
          scoreCache.current.set(selectedIndustryId!, data);
          setRawScores(data);
          setScoresLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setScoresError(
            err instanceof Error ? err.message : 'Failed to load scores',
          );
          setScoresLoading(false);
        }
      }
    }

    loadScores();
    return () => {
      cancelled = true;
    };
  }, [selectedIndustryId, industriesLoading]);

  // Filter scores by state
  const scores = useMemo(() => {
    if (!rawScores) return null;
    if (!stateFilter) return rawScores;

    const filtered: IndustryScores = {};
    for (const [fips, entry] of Object.entries(rawScores)) {
      if (entry.state === stateFilter) {
        filtered[fips] = entry;
      }
    }
    return filtered;
  }, [rawScores, stateFilter]);

  // Compute top 10 counties sorted by score descending
  const topCounties = useMemo(() => {
    if (!scores) return [];
    return Object.values(scores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [scores]);

  const isValidIndustryId = useCallback(
    (id: string) => industries.some((ind) => ind.id === id),
    [industries],
  );

  return {
    industries,
    industriesLoading,
    industriesError,
    scores,
    scoresLoading,
    scoresError,
    topCounties,
    isValidIndustryId,
  };
}
