// Observatory Dashboard API Services
// All APIs used here require NO authentication/API keys

// ===========================================
// Configuration and Utilities
// ===========================================

export {
  API_ENDPOINTS,
  RATE_LIMITS,
  RateLimiter,
  getRateLimiter,
  fetchWithCache,
  mapToIntelCategory,
  calculateSeverity,
  formatApiTimestamp,
  getApiStatus,
} from "./config";

export type {
  FetchOptions,
  ApiResponse,
  EventCategory,
  SeverityLevel,
} from "./config";

// ===========================================
// Aviation Services (OpenSky Network)
// ===========================================

export {
  fetchAllAircraft,
  fetchAircraftInRegion,
  fetchAircraftByIcao,
  fetchMilitaryAircraft,
  fetchAircraftOverRegion,
  getAircraftStats,
  isMilitaryCallsign,
  getAircraftCategory,
  formatAltitude,
  formatSpeed,
  formatHeading,
  aircraftToMapMarker,
} from "./aviation";

export type {
  Aircraft,
  OpenSkyResponse,
  FlightTrack,
  FlightPathPoint,
  AircraftCategory,
} from "./aviation";

// ===========================================
// Cyber Threat Intelligence Services
// ===========================================

export {
  // URLhaus - Malware URLs
  fetchRecentMalwareUrls,
  fetchOnlineMalwareUrls,
  fetchUrlhausStats,
  // Shodan InternetDB
  lookupIP,
  lookupIPs,
  checkIPVulnerabilities,
  // ThreatFox - IOCs
  fetchRecentIOCs,
  searchIOC,
  // Feodo Tracker - Botnet C2
  fetchBotnetC2Servers,
  getBotnetStats,
  // Ransomware.live
  fetchRansomwareVictims,
  fetchRansomwareGroups,
  getRansomwareStats,
  // Tor Exit Nodes
  fetchTorExitNodes,
  isTorExitNode,
  // Aggregated
  fetchCyberThreatFeed,
  formatThreatSeverity,
  getThreatTypeIcon,
} from "./cyber";

export type {
  MalwareUrl,
  ShodanInternetDBResponse,
  ThreatFoxIOC,
  BotnetC2,
  RansomwareVictim,
  RansomwareGroup,
  TorExitNode,
  CyberThreat,
} from "./cyber";

// ===========================================
// Infrastructure Monitoring Services
// ===========================================

export {
  // IODA - Internet Outages
  fetchInternetOutages,
  fetchCountryOutages,
  fetchInternetSignals,
  // BGP Monitoring
  fetchBGPAnomalies,
  // Service Status
  fetchAllServiceStatus,
  getServiceHealthSummary,
  // Submarine Cables
  fetchSubmarineCableStatus,
  getCablesByRegion,
  // Aggregated
  fetchInfrastructureAlerts,
  getInfrastructureOverview,
  getOutageSeverityColor,
  getServiceStatusColor,
  formatDuration,
  getAlertIcon,
} from "./infrastructure";

export type {
  InternetOutage,
  IODASignal,
  BGPAnomaly,
  ServiceStatus,
  ServiceIncident,
  SubmarineCable,
  InfrastructureAlert,
  InfrastructureOverview,
} from "./infrastructure";

// ===========================================
// Space Weather Services (NOAA SWPC)
// ===========================================

export {
  // Kp Index
  fetchKpIndex,
  fetchKpForecast,
  // Solar Wind
  fetchSolarWind,
  fetchSolarWindMag,
  // X-ray Flux
  fetchXrayFlux,
  // Scales & Alerts
  fetchCurrentScales,
  fetchSWPCAlerts,
  fetchSolarFlares,
  fetchStormProbabilities,
  // Aggregated
  getSpaceWeatherSummary,
  getActiveSpaceAlerts,
  // Utilities
  getStormLevelInfo,
  formatKpIndex,
  formatSolarWindSpeed,
} from "./space";

export type {
  StormLevel,
  SolarRadiationLevel,
  RadioBlackoutLevel,
  KpIndex,
  SolarWind,
  SolarFlare,
  CME,
  GeomagneticAlert,
  SpaceWeatherSummary,
  SpaceWeatherAlert,
} from "./space";

// ===========================================
// Sanctions & Watchlist Services
// ===========================================

export {
  // OpenSanctions
  searchSanctions,
  getEntityById,
  matchEntity,
  getDatasets,
  // Statistics
  getSanctionsStats,
  comprehensiveSanctionsSearch,
  isEntitySanctioned,
  generateSanctionsAlerts,
  // Constants
  SANCTIONS_PROGRAMS,
  SANCTIONED_COUNTRIES,
  // Utilities
  getEntityTypeLabel,
  getSanctionsDatasetInfo,
  formatEntityForDisplay,
  calculateSanctionsRisk,
} from "./sanctions";

export type {
  SanctionedEntity,
  SanctionSearchResult,
  SanctionDataset,
  SanctionStats,
  SanctionsAlert,
} from "./sanctions";

// ===========================================
// News Services (GDELT, Hacker News, Reddit)
// ===========================================

export {
  // GDELT (Global news - no auth required)
  fetchGdeltNews,
  fetchMilitaryNews,
  fetchCyberNews,
  fetchPoliticalNews,
  fetchCrisisNews,
  fetchEconomicNews,
  // Hacker News (Tech news - no auth required)
  fetchHackerNews,
  // Reddit (Public JSON - no auth required)
  fetchRedditNews,
  fetchRedditWorldNews,
  fetchRedditTechNews,
  fetchRedditSecurityNews,
  fetchRedditGeopolitics,
  // Aggregated fetchers
  fetchAggregatedNews,
  fetchAllCyberNews,
  fetchAllPoliticalNews,
} from "./news";

export type { IntelEvent, AggregatedNewsOptions } from "./news";

// ===========================================
// Finance Services (CoinGecko, ExchangeRate, Fear&Greed)
// ===========================================

export {
  // CoinGecko (Crypto data - no auth required)
  fetchCryptoMarkets,
  fetchGlobalCryptoData,
  fetchTrendingCoins,
  // Fear & Greed Index (no auth required)
  fetchFearGreedIndex,
  // Exchange Rates (no auth required)
  fetchExchangeRates,
  // Aggregated market data
  fetchMarketOverview,
  // Market alerts
  generateMarketAlerts,
  // Formatting utilities
  formatMarketCap,
  formatPrice,
  formatPercentage,
  getFearGreedColor,
} from "./finance";

export type {
  CryptoPrice,
  ExchangeRate,
  GlobalMarketData,
  FearGreedIndex,
  TrendingCoin,
  MarketAlert,
  MarketOverview,
} from "./finance";

// ===========================================
// Natural Events Services (USGS, NASA EONET)
// ===========================================

export {
  // USGS Earthquakes (no auth required)
  fetchEarthquakes,
  fetchSignificantEarthquakes,
  fetchLargeEarthquakes,
  // NASA EONET (no auth required)
  fetchNaturalEvents,
  fetchActiveWildfires,
  fetchActiveStorms,
  fetchVolcanicActivity,
  fetchActiveFloods,
  EONET_CATEGORIES,
  // Conversions
  earthquakeToIntelEvent,
  naturalEventToIntelEvent,
  earthquakeToMapMarker,
  naturalEventToMapMarker,
  // Aggregated
  fetchNaturalEventsOverview,
  fetchDisasterIntelEvents,
  fetchDisasterMapMarkers,
} from "./events";

export type {
  EarthquakeEvent,
  NaturalEvent,
  EarthquakeQueryParams,
  EONETQueryParams,
  NaturalEventsOverview,
} from "./events";

// ===========================================
// Combined Data Fetchers for Dashboard
// ===========================================

import { fetchAggregatedNews, type IntelEvent } from "./news";
import {
  fetchCryptoMarkets,
  fetchFearGreedIndex,
  fetchMarketOverview,
  fetchFullMarketOverview,
  fetchMarketIndices,
  fetchPopularStocks,
  fetchCommodityPrices,
  fetchStockQuote,
  fetchStockQuotes,
  generateMarketAlerts,
  generateStockAlerts,
  type CryptoPrice,
  type FearGreedIndex,
  type MarketAlert,
  type StockQuote,
  type MarketIndex,
  type CommodityPrice,
  type FullMarketOverview,
} from "./finance";
import { fetchDisasterIntelEvents, fetchDisasterMapMarkers } from "./events";
import type { MapMarker, SystemMetric } from "../data";

export interface DashboardData {
  intelEvents: IntelEvent[];
  mapMarkers: MapMarker[];
  cryptoData: CryptoPrice[];
  fearGreedIndex: FearGreedIndex | null;
  marketAlerts: MarketAlert[];
  lastUpdated: string;
}

/**
 * Fetches all data needed for the main dashboard
 * Uses ONLY free APIs that require no authentication
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const [newsEvents, disasterEvents, disasterMarkers, marketOverview] =
    await Promise.all([
      fetchAggregatedNews({
        includeGdelt: true,
        includeHackerNews: true,
        includeReddit: true,
        maxPerSource: 15,
      }).catch(() => []),
      fetchDisasterIntelEvents().catch(() => []),
      fetchDisasterMapMarkers().catch(() => []),
      fetchMarketOverview().catch(() => ({
        crypto: [],
        globalData: null,
        trending: [],
        fearGreed: null,
        exchangeRates: [],
        lastUpdated: new Date().toISOString(),
      })),
    ]);

  // Combine and deduplicate intel events
  const allEvents = [...newsEvents, ...disasterEvents];
  const uniqueEvents = deduplicateEvents(allEvents);

  // Sort by timestamp (newest first)
  uniqueEvents.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Generate market alerts
  const marketAlerts = generateMarketAlerts(marketOverview);

  return {
    intelEvents: uniqueEvents.slice(0, 50),
    mapMarkers: disasterMarkers,
    cryptoData: marketOverview.crypto,
    fearGreedIndex: marketOverview.fearGreed,
    marketAlerts,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Fetches intel feed data from all sources
 */
export async function fetchIntelFeedData(): Promise<IntelEvent[]> {
  const [newsEvents, disasterEvents] = await Promise.all([
    fetchAggregatedNews({
      includeGdelt: true,
      includeHackerNews: true,
      includeReddit: true,
      maxPerSource: 20,
    }).catch(() => []),
    fetchDisasterIntelEvents().catch(() => []),
  ]);

  const allEvents = [...newsEvents, ...disasterEvents];
  const uniqueEvents = deduplicateEvents(allEvents);

  uniqueEvents.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return uniqueEvents.slice(0, 100);
}

/**
 * Fetches map marker data from multiple OSINT sources
 * Includes: disasters, news events, cyber threats, and more
 */
export async function fetchMapMarkerData(): Promise<MapMarker[]> {
  const markers: MapMarker[] = [];

  // Fetch from multiple sources in parallel
  const [disasterMarkers, newsEvents] = await Promise.all([
    fetchDisasterMapMarkers().catch(() => []),
    fetchAggregatedNews({ maxPerSource: 10 }).catch(() => []),
  ]);

  // Add disaster markers (earthquakes, wildfires, storms, etc.)
  markers.push(...disasterMarkers);

  // Convert news events with coordinates to markers
  const newsMarkers: MapMarker[] = newsEvents
    .filter((event) => event.coordinates)
    .map((event) => ({
      id: `NEWS-${event.id}`,
      coordinates: event.coordinates!,
      type: event.category,
      severity: event.severity,
      label: event.title.substring(0, 50),
      eventCount: 1,
      lastUpdate: event.timestamp,
    }));
  markers.push(...newsMarkers);

  // Add some strategic global hotspot markers for context
  const hotspotMarkers: MapMarker[] = [
    {
      id: "HOTSPOT-UKRAINE",
      coordinates: { lat: 48.3794, lng: 31.1656 },
      type: "military" as const,
      severity: "critical" as const,
      label: "Ukraine Conflict Zone",
      eventCount: 50,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "HOTSPOT-TAIWAN",
      coordinates: { lat: 23.6978, lng: 120.9605 },
      type: "political" as const,
      severity: "high" as const,
      label: "Taiwan Strait",
      eventCount: 12,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "HOTSPOT-MIDDLEEAST",
      coordinates: { lat: 31.5, lng: 34.8 },
      type: "military" as const,
      severity: "critical" as const,
      label: "Middle East Tensions",
      eventCount: 35,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "HOTSPOT-SOUTHCHINASEA",
      coordinates: { lat: 12.0, lng: 114.0 },
      type: "military" as const,
      severity: "medium" as const,
      label: "South China Sea",
      eventCount: 8,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "HOTSPOT-KOREA",
      coordinates: { lat: 38.0, lng: 127.0 },
      type: "military" as const,
      severity: "high" as const,
      label: "Korean Peninsula",
      eventCount: 15,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "CYBER-RUSSIA",
      coordinates: { lat: 55.7558, lng: 37.6173 },
      type: "cyber" as const,
      severity: "high" as const,
      label: "Cyber Activity - Moscow",
      eventCount: 25,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "CYBER-CHINA",
      coordinates: { lat: 39.9042, lng: 116.4074 },
      type: "cyber" as const,
      severity: "high" as const,
      label: "Cyber Activity - Beijing",
      eventCount: 30,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "INTEL-BRUSSELS",
      coordinates: { lat: 50.8503, lng: 4.3517 },
      type: "political" as const,
      severity: "medium" as const,
      label: "NATO/EU HQ - Brussels",
      eventCount: 5,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "ECON-WALLSTREET",
      coordinates: { lat: 40.7128, lng: -74.006 },
      type: "economic" as const,
      severity: "medium" as const,
      label: "Financial Markets - NYC",
      eventCount: 10,
      lastUpdate: new Date().toISOString(),
    },
  ];
  markers.push(...hotspotMarkers);

  // Deduplicate by ID
  const uniqueMarkers = markers.filter(
    (marker, index, self) =>
      index === self.findIndex((m) => m.id === marker.id),
  );

  return uniqueMarkers;
}

/**
 * Generates system metrics from live data
 */
export function generateSystemMetrics(
  cryptoData: CryptoPrice[],
  fearGreedIndex: FearGreedIndex | null,
  eventCount: number,
): SystemMetric[] {
  const metrics: SystemMetric[] = [];

  // Add event count metric
  metrics.push({
    id: "METRIC-EVENTS",
    label: "Active Events",
    value: eventCount,
    unit: "",
    delta: 0,
    deltaType: "neutral",
    status: eventCount > 30 ? "warning" : "normal",
  });

  // Add Fear & Greed if available
  if (fearGreedIndex) {
    metrics.push({
      id: "METRIC-FEAR-GREED",
      label: "Fear/Greed",
      value: fearGreedIndex.value,
      unit: "",
      delta: fearGreedIndex.previousValue
        ? fearGreedIndex.value - fearGreedIndex.previousValue
        : 0,
      deltaType: fearGreedIndex.value >= 50 ? "positive" : "negative",
      status:
        fearGreedIndex.value <= 25 || fearGreedIndex.value >= 75
          ? "warning"
          : "normal",
    });
  }

  // Add top crypto metrics
  cryptoData.slice(0, 4).forEach((coin) => {
    metrics.push({
      id: `METRIC-${coin.symbol}`,
      label: coin.symbol,
      value: Math.round(coin.price * 100) / 100,
      unit: "USD",
      delta: Math.round(coin.priceChangePercent24h * 100) / 100,
      deltaType: coin.priceChangePercent24h >= 0 ? "positive" : "negative",
      status: Math.abs(coin.priceChangePercent24h) > 10 ? "warning" : "normal",
    });
  });

  return metrics;
}

// ===========================================
// Utility Functions
// ===========================================

function deduplicateEvents(events: IntelEvent[]): IntelEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const titleKey = event.title
      .toLowerCase()
      .substring(0, 50)
      .replace(/\s+/g, "");
    if (seen.has(titleKey)) {
      return false;
    }
    seen.add(titleKey);
    return true;
  });
}

/**
 * Lists all available APIs (all free, no auth required)
 */
export function listAvailableApis(): string[] {
  return [
    // Original sources
    "CoinGecko - Cryptocurrency prices & market data",
    "ExchangeRate-API - Currency exchange rates",
    "Fear & Greed Index - Crypto market sentiment",
    "GDELT Project - Global news & events",
    "USGS - Earthquake data worldwide",
    "NASA EONET - Natural events (fires, storms, volcanoes)",
    "Hacker News - Tech & security news",
    "Reddit - World news & geopolitics (public API)",
    // New OSINT sources
    "OpenSky Network - Real-time aircraft tracking",
    "URLhaus - Malware URL database",
    "ThreatFox - IOC database",
    "Feodo Tracker - Botnet C2 servers",
    "Shodan InternetDB - IP vulnerability lookup",
    "Ransomware.live - Ransomware group activity",
    "IODA - Internet outage detection",
    "NOAA SWPC - Space weather & solar activity",
    "OpenSanctions - Global sanctions database",
    "Tor Project - Exit node list",
  ];
}
