// API Configuration for Observatory Dashboard
// Only includes APIs that require NO authentication/API keys

// ===========================================
// API ENDPOINTS (No Auth Required)
// ===========================================

export const API_ENDPOINTS = {
  // Cryptocurrency - CoinGecko (completely free, no key)
  coingecko: {
    base: "https://api.coingecko.com/api/v3",
    prices: "/simple/price",
    markets: "/coins/markets",
    trending: "/search/trending",
    global: "/global",
  },

  // Exchange Rates - ExchangeRate-API (free tier, no key)
  exchangerate: {
    base: "https://api.exchangerate-api.com/v4/latest",
  },

  // News/Events - GDELT Project (completely free, no key)
  gdelt: {
    base: "https://api.gdeltproject.org/api/v2",
    doc: "/doc/doc",
    geo: "/geo/geo",
  },

  // Earthquakes - USGS (completely free, no key)
  usgsEarthquake: {
    base: "https://earthquake.usgs.gov/fdsnws/event/1",
    query: "/query",
    feeds: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary",
  },

  // Natural Events - NASA EONET (completely free, no key)
  eonet: {
    base: "https://eonet.gsfc.nasa.gov/api/v3",
    events: "/events",
    categories: "/categories",
  },

  // Fear & Greed Index - Alternative.me (completely free, no key)
  fearGreed: {
    base: "https://api.alternative.me/fng",
  },

  // IP Geolocation - ip-api.com (free, no key, 45 req/min)
  ipApi: {
    base: "http://ip-api.com/json",
  },

  // World Bank Open Data (completely free, no key)
  worldBank: {
    base: "https://api.worldbank.org/v2",
  },

  // Open-Meteo Weather (completely free, no key)
  openMeteo: {
    base: "https://api.open-meteo.com/v1",
    forecast: "/forecast",
  },

  // GitHub API (free without auth, 60 req/hour)
  github: {
    base: "https://api.github.com",
    events: "/events",
  },

  // Wikipedia/Wikimedia (completely free, no key)
  wikipedia: {
    base: "https://en.wikipedia.org/api/rest_v1",
    feed: "/feed/featured",
  },

  // Hacker News (completely free, no key)
  hackerNews: {
    base: "https://hacker-news.firebaseio.com/v0",
    topStories: "/topstories.json",
    newStories: "/newstories.json",
    item: "/item",
  },

  // Reddit (public JSON endpoints, no key)
  reddit: {
    base: "https://www.reddit.com",
  },

  // CVE Security Vulnerabilities (completely free, no key)
  cveCircl: {
    base: "https://cve.circl.lu/api",
    last: "/last",
    search: "/search",
  },

  // ===========================================
  // NEW OSINT SOURCES
  // ===========================================

  // OpenSky Network - Aircraft tracking (free, no key for basic)
  opensky: {
    base: "https://opensky-network.org/api",
    states: "/states/all",
    flights: "/flights/all",
    tracks: "/tracks/all",
  },

  // URLhaus - Malware URL database (free, no key)
  urlhaus: {
    base: "https://urlhaus-api.abuse.ch/v1",
    recent: "/urls/recent",
    host: "/host",
    payload: "/payload",
  },

  // ThreatFox - IOC database (free, no key)
  threatfox: {
    base: "https://threatfox-api.abuse.ch/api/v1",
  },

  // Feodo Tracker - Botnet C2 (free, no key)
  feodo: {
    base: "https://feodotracker.abuse.ch",
    ipblocklist: "/downloads/ipblocklist_recommended.json",
  },

  // Shodan InternetDB - Fast IP lookup (free, no key)
  shodanInternetdb: {
    base: "https://internetdb.shodan.io",
  },

  // Ransomware.live - Ransomware tracking (free, no key)
  ransomwareLive: {
    base: "https://api.ransomware.live/v1",
    victims: "/recentvictims",
    groups: "/groups",
  },

  // IODA - Internet outage detection (free, no key)
  ioda: {
    base: "https://api.ioda.inetintel.cc.gatech.edu/v2",
    alerts: "/alerts",
    signals: "/signals",
  },

  // NOAA SWPC - Space weather (free, no key)
  swpc: {
    base: "https://services.swpc.noaa.gov",
    kpIndex: "/products/noaa-planetary-k-index.json",
    solarWind: "/products/solar-wind/plasma-7-day.json",
    alerts: "/products/alerts.json",
    scales: "/products/noaa-scales.json",
  },

  // OpenSanctions - Sanctions database (free for non-commercial)
  opensanctions: {
    base: "https://api.opensanctions.org",
    search: "/search/default",
    match: "/match/default",
    datasets: "/datasets",
  },

  // Tor Project - Exit node list (free, no key)
  torProject: {
    exitList: "https://check.torproject.org/torbulkexitlist",
  },
} as const;

// ===========================================
// RATE LIMITING
// ===========================================

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  minIntervalMs: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  coingecko: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    minIntervalMs: 2000,
  },
  exchangerate: {
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    minIntervalMs: 2000,
  },
  gdelt: { requestsPerMinute: 30, requestsPerHour: 500, minIntervalMs: 2000 },
  usgs: { requestsPerMinute: 60, requestsPerHour: 1000, minIntervalMs: 1000 },

  // New OSINT rate limits
  opensky: { requestsPerMinute: 10, requestsPerHour: 400, minIntervalMs: 6000 },
  urlhaus: { requestsPerMinute: 20, requestsPerHour: 300, minIntervalMs: 3000 },
  threatfox: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    minIntervalMs: 6000,
  },
  feodo: { requestsPerMinute: 10, requestsPerHour: 100, minIntervalMs: 6000 },
  shodanInternetdb: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    minIntervalMs: 2000,
  },
  ransomware: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    minIntervalMs: 6000,
  },
  ioda: { requestsPerMinute: 20, requestsPerHour: 300, minIntervalMs: 3000 },
  swpc: { requestsPerMinute: 30, requestsPerHour: 500, minIntervalMs: 2000 },
  opensanctions: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    minIntervalMs: 6000,
  },
  bgp: { requestsPerMinute: 10, requestsPerHour: 100, minIntervalMs: 6000 },
  eonet: { requestsPerMinute: 30, requestsPerHour: 500, minIntervalMs: 2000 },
  fearGreed: {
    requestsPerMinute: 10,
    requestsPerHour: 100,
    minIntervalMs: 6000,
  },
  hackerNews: {
    requestsPerMinute: 30,
    requestsPerHour: 500,
    minIntervalMs: 2000,
  },
  reddit: { requestsPerMinute: 10, requestsPerHour: 100, minIntervalMs: 6000 },
  github: { requestsPerMinute: 10, requestsPerHour: 60, minIntervalMs: 6000 },
  cve: { requestsPerMinute: 30, requestsPerHour: 500, minIntervalMs: 2000 },
};

// Simple rate limiter class
export class RateLimiter {
  private lastRequest: number = 0;
  private requestCount: number = 0;
  private hourStart: number = Date.now();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Reset hourly counter if needed
    if (now - this.hourStart > 60 * 60 * 1000) {
      this.hourStart = now;
      this.requestCount = 0;
    }

    // Check hourly limit
    if (this.requestCount >= this.config.requestsPerHour) {
      throw new Error("Hourly rate limit exceeded");
    }

    // Wait for minimum interval
    const elapsed = now - this.lastRequest;
    if (elapsed < this.config.minIntervalMs) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.minIntervalMs - elapsed),
      );
    }

    this.lastRequest = Date.now();
    this.requestCount++;
  }
}

// Global rate limiters
const rateLimiters: Record<string, RateLimiter> = {};

export function getRateLimiter(apiName: string): RateLimiter {
  if (!rateLimiters[apiName]) {
    rateLimiters[apiName] = new RateLimiter(
      RATE_LIMITS[apiName] || {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        minIntervalMs: 6000,
      },
    );
  }
  return rateLimiters[apiName];
}

// ===========================================
// FETCH UTILITIES
// ===========================================

// Domains that need proxying due to CORS restrictions
const CORS_RESTRICTED_DOMAINS = [
  "api.gdeltproject.org",
  "www.reddit.com",
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
];

// Check if URL needs proxying
function needsProxy(url: string): boolean {
  if (typeof window === "undefined") return false; // Server-side doesn't need proxy
  try {
    const parsedUrl = new URL(url);
    return CORS_RESTRICTED_DOMAINS.some(
      (domain) =>
        parsedUrl.hostname === domain ||
        parsedUrl.hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

// Get the URL to use (proxied or direct)
function getProxiedUrl(url: string): string {
  if (needsProxy(url)) {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export interface FetchOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  cached: boolean;
}

// Simple cache for API responses
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes default

export async function fetchWithCache<T>(
  url: string,
  options: FetchOptions = {},
  cacheTtl: number = CACHE_TTL,
): Promise<ApiResponse<T>> {
  const cacheKey = `${options.method || "GET"}-${url}`;

  // Check cache
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cacheTtl) {
    return {
      data: cached.data as T,
      error: null,
      status: 200,
      cached: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || 15000,
    );

    // Use proxy for CORS-restricted domains
    const fetchUrl = getProxiedUrl(url);

    const response = await fetch(fetchUrl, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        cached: false,
      };
    }

    const data = await response.json();

    // Cache successful response
    responseCache.set(cacheKey, { data, timestamp: Date.now() });

    return {
      data,
      error: null,
      status: response.status,
      cached: false,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`API fetch error for ${url}:`, errorMessage);
    return {
      data: null,
      error: errorMessage,
      status: 0,
      cached: false,
    };
  }
}

// Clear old cache entries periodically
if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 2) {
        responseCache.delete(key);
      }
    }
  }, 60000);
}

// ===========================================
// DATA TRANSFORMATION UTILITIES
// ===========================================

export type EventCategory =
  | "military"
  | "political"
  | "economic"
  | "cyber"
  | "intel"
  | "alert";
export type SeverityLevel = "low" | "medium" | "high" | "critical";

export function mapToIntelCategory(keywords: string[]): EventCategory {
  const text = keywords.join(" ").toLowerCase();

  if (
    /military|army|navy|air force|defense|weapon|war|troops|missile|tank|soldier/.test(
      text,
    )
  ) {
    return "military";
  }
  if (
    /cyber|hack|breach|malware|ransomware|security|vulnerability|cve|exploit/.test(
      text,
    )
  ) {
    return "cyber";
  }
  if (
    /politic|government|election|president|minister|parliament|diplomat|sanction|vote|law/.test(
      text,
    )
  ) {
    return "political";
  }
  if (
    /economy|market|stock|trade|gdp|inflation|finance|bank|currency|crypto|bitcoin/.test(
      text,
    )
  ) {
    return "economic";
  }
  if (
    /earthquake|hurricane|flood|wildfire|disaster|emergency|evacuat|storm|volcano|tsunami/.test(
      text,
    )
  ) {
    return "alert";
  }

  return "intel";
}

export function calculateSeverity(factors: {
  magnitude?: number;
  impact?: string;
  urgency?: string;
  score?: number;
}): SeverityLevel {
  let score = factors.score || 0;

  if (factors.magnitude) {
    if (factors.magnitude >= 7) score += 4;
    else if (factors.magnitude >= 5) score += 2;
    else score += 1;
  }

  if (factors.impact === "global") score += 3;
  else if (factors.impact === "regional") score += 2;
  else score += 1;

  if (factors.urgency === "immediate") score += 3;
  else if (factors.urgency === "developing") score += 2;

  if (score >= 8) return "critical";
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

export function formatApiTimestamp(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  return date.toISOString();
}

// ===========================================
// API STATUS CHECK
// ===========================================

export function getApiStatus(): Record<string, boolean> {
  // All these APIs work without authentication
  return {
    coingecko: true,
    gdelt: true,
    usgs: true,
    eonet: true,
    exchangerate: true,
    fearGreed: true,
    hackerNews: true,
    reddit: true,
    github: true,
    cve: true,
    openMeteo: true,
  };
}
