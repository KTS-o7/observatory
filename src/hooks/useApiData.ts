// Custom hook for fetching and caching API data
// Provides loading states, error handling, and auto-refresh functionality
// All APIs used here are FREE and require NO authentication

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchDashboardData,
  fetchMapMarkerData,
  fetchDisasterIntelEvents,
  fetchNaturalEventsOverview,
  generateSystemMetrics,
  type DashboardData,
  type CryptoPrice,
  type FearGreedIndex,
  type NaturalEventsOverview,
  type IntelEvent,
  type CyberThreat,
  type Aircraft,
  type InternetOutage,
  type InfrastructureAlert,
  type SpaceWeatherSummary,
  type SpaceWeatherAlert,
  type SanctionedEntity,
} from "@/lib/api";
import type { MapMarker, SystemMetric } from "@/lib/data";

// ===========================================
// SERVER API FETCHERS
// ===========================================

/**
 * Fetch intel feed from server API route
 */
async function fetchIntelFromServer(): Promise<IntelEvent[]> {
  try {
    const response = await fetch("/api/intel");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error("Intel API error:", error);
    return [];
  }
}

/**
 * Fetch finance data from server API route
 */
interface FinanceApiResponse {
  crypto: CryptoPrice[];
  fearGreed: FearGreedIndex | null;
  indices: Array<{
    symbol: string;
    name: string;
    value: number;
    change: number;
    changePercent: number;
    timestamp: string;
  }>;
  commodities: Array<{
    symbol: string;
    name: string;
    value: number;
    change: number;
    changePercent: number;
    timestamp: string;
  }>;
  exchangeRates: Array<{
    base: string;
    target: string;
    rate: number;
    timestamp: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    asset: string;
    message: string;
    value: number;
    timestamp: string;
  }>;
  lastUpdated: string;
}

async function fetchFinanceFromServer(): Promise<FinanceApiResponse> {
  try {
    const response = await fetch("/api/finance");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Finance API error:", error);
    return {
      crypto: [],
      fearGreed: null,
      indices: [],
      commodities: [],
      exchangeRates: [],
      alerts: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

// ===========================================
// TYPES
// ===========================================

export interface UseApiDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
}

export interface UseApiDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

// ===========================================
// OSINT API RESPONSE TYPES
// ===========================================

export interface CyberThreatApiResponse {
  threats: CyberThreat[];
  stats: {
    malwareUrls: { total: number; online: number };
    ransomware: {
      total: number;
      last24h: number;
      byGroup: Record<string, number>;
    };
    botnets: {
      total: number;
      online: number;
      byMalware: Record<string, number>;
    };
  } | null;
  sources: {
    urlhaus: number;
    ransomware: number;
    feodo: number;
  };
  lastUpdated: string;
}

export interface AviationApiResponse {
  aircraft: Array<{
    icao24: string;
    callsign: string | null;
    originCountry: string;
    position: { lat: number; lng: number };
    altitude: number | null;
    altitudeFormatted: string;
    speed: number | null;
    speedFormatted: string;
    heading: number | null;
    verticalRate: number | null;
    onGround: boolean;
    squawk: string | null;
    category: number;
    isMilitary: boolean;
    lastContact: number;
  }>;
  stats: {
    total: number;
    inFlight: number;
    onGround: number;
    military: number;
    highAltitude: number;
    byCountry: Record<string, number>;
  } | null;
  timestamp: number;
  region: string;
  militaryFilter: boolean;
  lastUpdated: string;
}

export interface InfrastructureApiResponse {
  alerts: InfrastructureAlert[];
  outages: InternetOutage[];
  services: Array<{
    name: string;
    url: string;
    status:
      | "operational"
      | "degraded"
      | "partial_outage"
      | "major_outage"
      | "unknown";
    lastChecked: string;
    incidents: Array<{
      id: string;
      title: string;
      status: string;
      impact: string;
      createdAt: string;
    }>;
  }>;
  stats: {
    outages: {
      total: number;
      critical: number;
      warning: number;
      byRegion: Record<string, number>;
    };
    services: {
      total: number;
      operational: number;
      degraded: number;
      outage: number;
      unknown: number;
    };
  } | null;
  lastUpdated: string;
}

export interface SpaceWeatherApiResponse {
  summary: SpaceWeatherSummary | null;
  alerts: SpaceWeatherAlert[];
  flares: Array<{
    id: string;
    beginTime: string;
    peakTime: string | null;
    endTime: string | null;
    classType: string;
    intensity: number;
  }>;
  kp: {
    current: {
      value: string;
      description: string;
      status: string;
    } | null;
    history: Array<{
      timestamp: string;
      kpValue: number;
      kpText: string;
    }>;
  } | null;
  solarWind: {
    current: {
      speed: string;
      status: string;
    } | null;
    history: Array<{
      timestamp: string;
      speed: number;
      density: number;
    }>;
  } | null;
  stats: {
    activeAlerts: number;
    criticalAlerts: number;
    recentFlares: number;
  } | null;
  lastUpdated: string;
}

export interface SanctionsApiResponse {
  query: string;
  results: Array<
    SanctionedEntity & {
      typeLabel: string;
      risk: {
        level: "low" | "medium" | "high" | "critical";
        score: number;
        factors: string[];
      };
      datasetDetails: Array<{
        fullName: string;
        country: string;
        severity: "high" | "medium" | "low";
      }>;
      displayName: string;
      displayCountry: string;
      displayAliases: string[];
    }
  >;
  total: number;
  limit: number;
  offset: number;
  stats: {
    totalResults: number;
    returnedResults: number;
    bySchema: Record<string, number>;
    byRiskLevel: Record<string, number>;
    topDatasets: Record<string, number>;
  };
  lastUpdated: string;
}

// ===========================================
// GENERIC API DATA HOOK
// ===========================================

export function useApiData<T>(
  fetcher: () => Promise<T>,
  options: UseApiDataOptions = {},
): UseApiDataResult<T> {
  const {
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute default
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current || !enabled) {
      if (!enabled) {
        setIsLoading(false);
      }
      return;
    }

    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
        setIsStale(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [fetcher, enabled]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      setIsStale(true);
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData, enabled]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchData,
    isStale,
  };
}

// ===========================================
// SPECIALIZED HOOKS
// ===========================================

/**
 * Hook for fetching complete dashboard data
 */
export function useDashboardData(
  options: UseApiDataOptions = {},
): UseApiDataResult<DashboardData> {
  return useApiData(fetchDashboardData, {
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook for fetching intel feed events from server API
 */
export function useIntelFeed(
  options: UseApiDataOptions = {},
): UseApiDataResult<IntelEvent[]> {
  return useApiData(fetchIntelFromServer, {
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook for fetching map markers
 */
export function useMapMarkers(
  options: UseApiDataOptions = {},
): UseApiDataResult<MapMarker[]> {
  return useApiData(fetchMapMarkerData, {
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook for fetching crypto market data from server API
 */
export function useCryptoData(
  _limit: number = 10,
  options: UseApiDataOptions = {},
): UseApiDataResult<CryptoPrice[]> {
  const fetcher = useCallback(async () => {
    const data = await fetchFinanceFromServer();
    return data.crypto;
  }, []);
  return useApiData(fetcher, {
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook for fetching Fear & Greed Index from server API
 */
export function useFearGreedIndex(
  options: UseApiDataOptions = {},
): UseApiDataResult<FearGreedIndex | null> {
  const fetcher = useCallback(async () => {
    const data = await fetchFinanceFromServer();
    return data.fearGreed;
  }, []);
  return useApiData(fetcher, {
    autoRefresh: true,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

/**
 * Hook for fetching full finance data from server API
 */
export function useFinanceData(
  options: UseApiDataOptions = {},
): UseApiDataResult<FinanceApiResponse> {
  return useApiData(fetchFinanceFromServer, {
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook for fetching natural disasters data
 */
export function useNaturalEvents(
  options: UseApiDataOptions = {},
): UseApiDataResult<NaturalEventsOverview> {
  return useApiData(fetchNaturalEventsOverview, {
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Hook for fetching disaster intel events
 */
export function useDisasterEvents(
  options: UseApiDataOptions = {},
): UseApiDataResult<IntelEvent[]> {
  return useApiData(fetchDisasterIntelEvents, {
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

// ===========================================
// COMBINED HOOKS
// ===========================================

interface SystemMetricsData {
  metrics: SystemMetric[];
  fearGreed: FearGreedIndex | null;
}

/**
 * Hook for generating system metrics from live data
 */
export function useSystemMetrics(
  options: UseApiDataOptions = {},
): UseApiDataResult<SystemMetricsData> {
  const cryptoResult = useCryptoData(6, options);
  const fearGreedResult = useFearGreedIndex(options);
  const eventsResult = useIntelFeed(options);

  const [data, setData] = useState<SystemMetricsData | null>(null);

  useEffect(() => {
    if (cryptoResult.data) {
      const metrics = generateSystemMetrics(
        cryptoResult.data,
        fearGreedResult.data || null,
        eventsResult.data?.length || 0,
      );
      setData({
        metrics,
        fearGreed: fearGreedResult.data || null,
      });
    }
  }, [cryptoResult.data, fearGreedResult.data, eventsResult.data]);

  return {
    data,
    isLoading: cryptoResult.isLoading || fearGreedResult.isLoading,
    error: cryptoResult.error || fearGreedResult.error,
    lastUpdated: cryptoResult.lastUpdated,
    refetch: async () => {
      await Promise.all([
        cryptoResult.refetch(),
        fearGreedResult.refetch(),
        eventsResult.refetch(),
      ]);
    },
    isStale: cryptoResult.isStale || fearGreedResult.isStale,
  };
}

// ===========================================
// UTILITY HOOKS
// ===========================================

/**
 * Hook for tracking API refresh status
 */
export function useApiRefreshStatus() {
  const [lastGlobalRefresh, setLastGlobalRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerGlobalRefresh = useCallback(() => {
    setIsRefreshing(true);
    setLastGlobalRefresh(new Date());
    // Allow time for API calls to complete
    setTimeout(() => setIsRefreshing(false), 3000);
  }, []);

  return {
    lastGlobalRefresh,
    isRefreshing,
    triggerGlobalRefresh,
  };
}

/**
 * Hook for polling an API at a specific interval
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled: boolean = true,
): { data: T | null; isPolling: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const poll = async () => {
      setIsPolling(true);
      try {
        const result = await fetcher();
        if (mounted) setData(result);
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        if (mounted) setIsPolling(false);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const interval = setInterval(poll, intervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fetcher, intervalMs, enabled]);

  return { data, isPolling };
}

// ===========================================
// OSINT HOOKS
// ===========================================

/**
 * Fetch cyber threat data from server API
 */
async function fetchCyberThreatsFromServer(): Promise<CyberThreatApiResponse> {
  try {
    const response = await fetch("/api/cyber");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Cyber threats API error:", error);
    return {
      threats: [],
      stats: null,
      sources: { urlhaus: 0, ransomware: 0, feodo: 0 },
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Hook for fetching cyber threat intelligence data
 */
export function useCyberThreats(
  options: UseApiDataOptions = {},
): UseApiDataResult<CyberThreatApiResponse> {
  return useApiData(fetchCyberThreatsFromServer, {
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Fetch aviation data from server API
 */
async function fetchAviationFromServer(
  region?: string,
  militaryOnly?: boolean,
): Promise<AviationApiResponse> {
  try {
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (militaryOnly) params.set("military", "true");

    const url = `/api/aviation${params.toString() ? `?${params}` : ""}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Aviation API error:", error);
    return {
      aircraft: [],
      stats: null,
      timestamp: Date.now(),
      region: region || "global",
      militaryFilter: militaryOnly || false,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Hook for fetching aircraft tracking data
 */
export function useAviationData(
  region?: string,
  militaryOnly?: boolean,
  options: UseApiDataOptions = {},
): UseApiDataResult<AviationApiResponse> {
  const fetcher = useCallback(
    () => fetchAviationFromServer(region, militaryOnly),
    [region, militaryOnly],
  );

  return useApiData(fetcher, {
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Fetch infrastructure data from server API
 */
async function fetchInfrastructureFromServer(): Promise<InfrastructureApiResponse> {
  try {
    const response = await fetch("/api/infrastructure");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Infrastructure API error:", error);
    return {
      alerts: [],
      outages: [],
      services: [],
      stats: null,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Hook for fetching infrastructure monitoring data
 */
export function useInfrastructureData(
  options: UseApiDataOptions = {},
): UseApiDataResult<InfrastructureApiResponse> {
  return useApiData(fetchInfrastructureFromServer, {
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Fetch space weather data from server API
 */
async function fetchSpaceWeatherFromServer(): Promise<SpaceWeatherApiResponse> {
  try {
    const response = await fetch("/api/space");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Space weather API error:", error);
    return {
      summary: null,
      alerts: [],
      flares: [],
      kp: null,
      solarWind: null,
      stats: null,
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Hook for fetching space weather data
 */
export function useSpaceWeather(
  options: UseApiDataOptions = {},
): UseApiDataResult<SpaceWeatherApiResponse> {
  return useApiData(fetchSpaceWeatherFromServer, {
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

/**
 * Fetch sanctions search results from server API
 */
async function fetchSanctionsFromServer(
  query: string,
  schema?: string,
): Promise<SanctionsApiResponse> {
  try {
    const params = new URLSearchParams({ q: query });
    if (schema) params.set("schema", schema);

    const response = await fetch(`/api/sanctions?${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Sanctions API error:", error);
    return {
      query,
      results: [],
      total: 0,
      limit: 20,
      offset: 0,
      stats: {
        totalResults: 0,
        returnedResults: 0,
        bySchema: {},
        byRiskLevel: {},
        topDatasets: {},
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Hook for searching sanctions database
 */
export function useSanctionsSearch(
  query: string,
  schema?: string,
  options: UseApiDataOptions = {},
): UseApiDataResult<SanctionsApiResponse> {
  const fetcher = useCallback(
    () => fetchSanctionsFromServer(query, schema),
    [query, schema],
  );

  return useApiData(fetcher, {
    autoRefresh: false, // Don't auto-refresh searches
    ...options,
    enabled: options.enabled !== false && query.length > 0,
  });
}

/**
 * Combined OSINT dashboard data hook
 */
export interface OsintDashboardData {
  cyber: CyberThreatApiResponse | null;
  aviation: AviationApiResponse | null;
  infrastructure: InfrastructureApiResponse | null;
  space: SpaceWeatherApiResponse | null;
}

export function useOsintDashboard(
  options: UseApiDataOptions = {},
): UseApiDataResult<OsintDashboardData> {
  const cyberResult = useCyberThreats({ ...options, autoRefresh: false });
  const aviationResult = useAviationData(undefined, true, {
    ...options,
    autoRefresh: false,
  });
  const infraResult = useInfrastructureData({ ...options, autoRefresh: false });
  const spaceResult = useSpaceWeather({ ...options, autoRefresh: false });

  const [data, setData] = useState<OsintDashboardData | null>(null);

  useEffect(() => {
    setData({
      cyber: cyberResult.data,
      aviation: aviationResult.data,
      infrastructure: infraResult.data,
      space: spaceResult.data,
    });
  }, [
    cyberResult.data,
    aviationResult.data,
    infraResult.data,
    spaceResult.data,
  ]);

  const isLoading =
    cyberResult.isLoading ||
    aviationResult.isLoading ||
    infraResult.isLoading ||
    spaceResult.isLoading;

  const error =
    cyberResult.error ||
    aviationResult.error ||
    infraResult.error ||
    spaceResult.error;

  const refetch = async () => {
    await Promise.all([
      cyberResult.refetch(),
      aviationResult.refetch(),
      infraResult.refetch(),
      spaceResult.refetch(),
    ]);
  };

  return {
    data,
    isLoading,
    error,
    lastUpdated: cyberResult.lastUpdated,
    refetch,
    isStale:
      cyberResult.isStale ||
      aviationResult.isStale ||
      infraResult.isStale ||
      spaceResult.isStale,
  };
}

// ===========================================
// OSINT METRICS HOOK
// ===========================================

export interface OsintMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  delta: number;
  deltaType: "positive" | "negative" | "neutral";
  status: "normal" | "warning" | "critical";
  category: "cyber" | "infrastructure" | "space" | "aviation" | "intel";
  icon?: string;
}

export interface OsintMapMarker {
  id: string;
  coordinates: { lat: number; lng: number };
  type: "cyber" | "military" | "alert" | "intel" | "political" | "economic";
  severity: "low" | "medium" | "high" | "critical";
  label: string;
  eventCount: number;
  lastUpdate: string;
  source: string;
}

export interface OsintIntelEvent {
  id: string;
  timestamp: string;
  category: "cyber" | "military" | "alert" | "intel" | "political" | "economic";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  summary: string;
  location?: string;
  source: string;
  status: "active" | "monitoring" | "resolved" | "archived";
  tags: string[];
}

export interface OsintMetricsApiResponse {
  metrics: OsintMetric[];
  mapMarkers: OsintMapMarker[];
  intelEvents: OsintIntelEvent[];
  summary: {
    totalThreats: number;
    criticalCount: number;
    activeOutages: number;
    spaceWeatherLevel: number;
  };
  sources: Record<string, boolean>;
  lastUpdated: string;
}

/**
 * Fetch OSINT metrics from server API
 */
async function fetchOsintMetricsFromServer(): Promise<OsintMetricsApiResponse> {
  try {
    const response = await fetch("/api/osint");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("OSINT metrics API error:", error);
    return {
      metrics: [],
      mapMarkers: [],
      intelEvents: [],
      summary: {
        totalThreats: 0,
        criticalCount: 0,
        activeOutages: 0,
        spaceWeatherLevel: 0,
      },
      sources: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Hook for fetching unified OSINT metrics
 * Provides metrics, map markers, and intel events from all OSINT sources
 */
export function useOsintMetrics(
  options: UseApiDataOptions = {},
): UseApiDataResult<OsintMetricsApiResponse> {
  return useApiData(fetchOsintMetricsFromServer, {
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

export default useApiData;
