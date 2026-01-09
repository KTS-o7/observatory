// Server-side API route for fetching aircraft tracking data
// Uses OpenSky Network API with OAuth2 client credentials flow

import { NextRequest, NextResponse } from "next/server";

// Test connectivity to OpenSky servers
async function testConnectivity(): Promise<{
  authServer: { reachable: boolean; latency?: number; error?: string };
  apiServer: { reachable: boolean; latency?: number; error?: string };
}> {
  const results = {
    authServer: { reachable: false } as {
      reachable: boolean;
      latency?: number;
      error?: string;
    },
    apiServer: { reachable: false } as {
      reachable: boolean;
      latency?: number;
      error?: string;
    },
  };

  // Test auth server
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(
      "https://auth.opensky-network.org/auth/realms/opensky-network/.well-known/openid-configuration",
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    results.authServer = { reachable: true, latency: Date.now() - start };
  } catch (e) {
    results.authServer = {
      reachable: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  // Test API server
  try {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch(
      "https://opensky-network.org/api/states/all?lamin=0&lamax=1&lomin=0&lomax=1",
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    results.apiServer = { reachable: true, latency: Date.now() - start };
  } catch (e) {
    results.apiServer = {
      reachable: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }

  return results;
}

// Timeout helper for fetch requests
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Force dynamic rendering - don't call external APIs at build time
export const dynamic = "force-dynamic";

// OpenSky OAuth2 credentials from environment variables
const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID;
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET;

// Token cache to avoid requesting new tokens for every API call
let cachedToken: { token: string; expiresAt: number } | null = null;

// ===========================================
// Types
// ===========================================

interface Aircraft {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  geoAltitude: number | null;
  squawk: string | null;
  category: number;
  lastContact: number;
}

interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | null)[][] | null;
}

interface AircraftStats {
  total: number;
  inFlight: number;
  onGround: number;
  military: number;
  highAltitude: number;
  byCountry: Record<string, number>;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// Military callsign prefixes
const MILITARY_PREFIXES = [
  "RCH",
  "RRR",
  "CNV",
  "NAVY",
  "USAF",
  "ARMY",
  "EVAC",
  "DUKE",
  "KING",
  "PEDRO",
  "JOLLY",
  "FORTE",
  "JAKE",
  "TOPCAT",
  "HAWK",
  "VIPER",
  "COBRA",
  "ROMAN",
  "RAIDER",
  "CODY",
  "DUSTOFF",
  "RAF",
  "ASCOT",
  "NATO",
  "MMF",
  "GAF",
  "IAF",
  "SNTRY",
  "AWACS",
  "IRON",
  "BOMBER",
  "TANKER",
  "GIANT",
  "REACH",
  "NCHO",
  "PLF",
  "CASA",
  "IAM",
  "BAF",
  "RNL",
];

// ===========================================
// OAuth2 Token Management
// ===========================================

async function getAccessToken(): Promise<string | null> {
  // Check if we have a valid cached token (with 60 second buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    console.log("Using cached OpenSky token");
    return cachedToken.token;
  }

  // No credentials configured
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) {
    console.error(
      "OpenSky OAuth2 credentials not configured. OPENSKY_CLIENT_ID:",
      OPENSKY_CLIENT_ID ? "set" : "missing",
      "OPENSKY_CLIENT_SECRET:",
      OPENSKY_CLIENT_SECRET ? "set" : "missing",
    );
    return null;
  }

  console.log("Requesting new OpenSky OAuth2 token...");

  try {
    const tokenUrl =
      "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

    const response = await fetchWithTimeout(
      tokenUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: OPENSKY_CLIENT_ID,
          client_secret: OPENSKY_CLIENT_SECRET,
        }),
      },
      8000, // 8 second timeout for token request
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to get OpenSky token: ${response.status} - ${errorText}`,
      );
      return null;
    }

    const data: TokenResponse = await response.json();
    console.log("Successfully obtained OpenSky OAuth2 token");

    // Cache the token (expires_in is in seconds)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return data.access_token;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("OpenSky token request timed out");
    } else {
      console.error("Error getting OpenSky access token:", error);
    }
    return null;
  }
}

// ===========================================
// Utility Functions
// ===========================================

function isMilitaryCallsign(callsign: string | null): boolean {
  if (!callsign) return false;
  const cs = callsign.trim().toUpperCase();
  return MILITARY_PREFIXES.some(
    (prefix) => cs.startsWith(prefix) || cs.includes(prefix),
  );
}

function transformAircraftState(
  state: (string | number | boolean | null)[],
): Aircraft {
  return {
    icao24: state[0] as string,
    callsign: state[1] as string | null,
    originCountry: state[2] as string,
    lastContact: state[4] as number,
    longitude: state[5] as number | null,
    latitude: state[6] as number | null,
    baroAltitude: state[7] as number | null,
    onGround: state[8] as boolean,
    velocity: state[9] as number | null,
    trueTrack: state[10] as number | null,
    verticalRate: state[11] as number | null,
    geoAltitude: state[13] as number | null,
    squawk: state[14] as string | null,
    category: (state[17] as number) || 0,
  };
}

function formatAltitude(meters: number | null): string {
  if (meters === null) return "N/A";
  const feet = Math.round(meters * 3.28084);
  return `${feet.toLocaleString()} ft`;
}

function formatSpeed(metersPerSecond: number | null): string {
  if (metersPerSecond === null) return "N/A";
  const knots = Math.round(metersPerSecond * 1.94384);
  return `${knots} kts`;
}

function computeStats(aircraft: Aircraft[]): AircraftStats {
  const stats: AircraftStats = {
    total: aircraft.length,
    inFlight: 0,
    onGround: 0,
    military: 0,
    highAltitude: 0,
    byCountry: {},
  };

  for (const ac of aircraft) {
    if (ac.onGround) {
      stats.onGround++;
    } else {
      stats.inFlight++;
    }

    if (
      isMilitaryCallsign(ac.callsign) ||
      ac.category === 7 ||
      ac.category === 14
    ) {
      stats.military++;
    }

    if (ac.geoAltitude && ac.geoAltitude > 12000) {
      stats.highAltitude++;
    }

    stats.byCountry[ac.originCountry] =
      (stats.byCountry[ac.originCountry] || 0) + 1;
  }

  return stats;
}

// ===========================================
// Region Definitions
// ===========================================

const REGIONS: Record<
  string,
  { minLat: number; maxLat: number; minLon: number; maxLon: number }
> = {
  europe: { minLat: 35, maxLat: 72, minLon: -10, maxLon: 40 },
  middle_east: { minLat: 12, maxLat: 42, minLon: 25, maxLon: 75 },
  asia_pacific: { minLat: -10, maxLat: 55, minLon: 100, maxLon: 180 },
  north_america: { minLat: 24, maxLat: 72, minLon: -170, maxLon: -50 },
  black_sea: { minLat: 40, maxLat: 48, minLon: 27, maxLon: 42 },
  baltic: { minLat: 53, maxLat: 66, minLon: 10, maxLon: 30 },
  south_china_sea: { minLat: 0, maxLat: 25, minLon: 105, maxLon: 125 },
  taiwan_strait: { minLat: 22, maxLat: 27, minLon: 117, maxLon: 123 },
  ukraine: { minLat: 44, maxLat: 53, minLon: 22, maxLon: 41 },
  korean_peninsula: { minLat: 33, maxLat: 43, minLon: 124, maxLon: 132 },
};

// ===========================================
// API Route
// ===========================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const region = searchParams.get("region");
  const militaryOnly = searchParams.get("military") === "true";
  const limit = parseInt(searchParams.get("limit") || "500");

  try {
    let url = "https://opensky-network.org/api/states/all";
    const params = new URLSearchParams();

    // Apply region bounds if specified
    if (region && REGIONS[region]) {
      const bounds = REGIONS[region];
      params.set("lamin", String(bounds.minLat));
      params.set("lamax", String(bounds.maxLat));
      params.set("lomin", String(bounds.minLon));
      params.set("lomax", String(bounds.maxLon));
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "Observatory Dashboard/1.0",
    };

    // Try to get OAuth2 token
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetchWithTimeout(
      url,
      {
        headers,
        next: { revalidate: 60 }, // Cache for 1 minute
      },
      15000, // 15 second timeout for aircraft data
    );

    if (!response.ok) {
      // OpenSky might rate limit or block cloud IPs
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: "Rate limited by OpenSky Network. Try again later.",
            aircraft: [],
            stats: null,
          },
          { status: 429 },
        );
      }
      if (response.status === 401) {
        // Token might be expired, clear cache
        cachedToken = null;
        return NextResponse.json(
          {
            error: "OpenSky authentication failed",
            aircraft: [],
            stats: null,
          },
          { status: 401 },
        );
      }
      if (response.status === 403) {
        return NextResponse.json(
          {
            error: "OpenSky blocked request",
            aircraft: [],
            stats: null,
          },
          { status: 403 },
        );
      }
      console.error(
        `OpenSky API error: ${response.status} - ${response.statusText}`,
      );
      return NextResponse.json(
        {
          error: `OpenSky API error: ${response.status}`,
          aircraft: [],
          stats: null,
        },
        { status: response.status },
      );
    }

    const data: OpenSkyResponse = await response.json();

    if (!data.states) {
      return NextResponse.json({
        aircraft: [],
        stats: {
          total: 0,
          inFlight: 0,
          onGround: 0,
          military: 0,
          highAltitude: 0,
          byCountry: {},
        },
        timestamp: data.time,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Transform all aircraft
    let aircraft = data.states
      .map(transformAircraftState)
      .filter((ac) => ac.latitude !== null && ac.longitude !== null);

    // Filter military only if requested
    if (militaryOnly) {
      aircraft = aircraft.filter(
        (ac) =>
          isMilitaryCallsign(ac.callsign) ||
          ac.category === 7 || // High performance
          ac.category === 14 || // UAV
          (ac.geoAltitude && ac.geoAltitude > 15000), // Very high altitude
      );
    }

    // Compute statistics before limiting
    const stats = computeStats(aircraft);

    // Limit results
    aircraft = aircraft.slice(0, limit);

    // Transform for response
    const responseAircraft = aircraft.map((ac) => ({
      icao24: ac.icao24,
      callsign: ac.callsign?.trim() || null,
      originCountry: ac.originCountry,
      position: {
        lat: ac.latitude,
        lng: ac.longitude,
      },
      altitude: ac.geoAltitude || ac.baroAltitude,
      altitudeFormatted: formatAltitude(ac.geoAltitude || ac.baroAltitude),
      speed: ac.velocity,
      speedFormatted: formatSpeed(ac.velocity),
      heading: ac.trueTrack,
      verticalRate: ac.verticalRate,
      onGround: ac.onGround,
      squawk: ac.squawk,
      category: ac.category,
      isMilitary:
        isMilitaryCallsign(ac.callsign) ||
        ac.category === 7 ||
        ac.category === 14,
      lastContact: ac.lastContact,
    }));

    return NextResponse.json({
      aircraft: responseAircraft,
      stats,
      timestamp: data.time,
      region: region || "global",
      militaryFilter: militaryOnly,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Aviation API error:", error);
    const isTimeout = error instanceof Error && error.name === "AbortError";
    const isFetchError =
      error instanceof Error && error.message === "fetch failed";
    const isNetworkError =
      error instanceof Error &&
      (error.cause instanceof Error ? error.cause.message : "").includes(
        "ENOTFOUND",
      );

    let errorType = "unknown";
    let errorMessage = "Unknown error";

    if (isTimeout) {
      errorType = "timeout";
      errorMessage = "Request timed out";
    } else if (isFetchError || isNetworkError) {
      errorType = "network";
      errorMessage = "Network error - could not connect to OpenSky API";
      // Log the underlying cause for debugging
      if (error instanceof Error && error.cause) {
        console.error("Fetch error cause:", error.cause);
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : undefined;

    return NextResponse.json(
      {
        error: isTimeout
          ? "OpenSky API request timed out"
          : isFetchError
            ? "Could not connect to OpenSky API"
            : "Failed to fetch aircraft data",
        details: errorMessage,
        errorType,
        cause: errorCause,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
        aircraft: [],
        stats: null,
        debug: {
          hasClientId: !!OPENSKY_CLIENT_ID,
          hasClientSecret: !!OPENSKY_CLIENT_SECRET,
        },
      },
      { status: isTimeout ? 504 : 500 },
    );
  }
}

// Debug endpoint to test connectivity
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (body.action === "test-connectivity") {
    const connectivity = await testConnectivity();
    return NextResponse.json({
      connectivity,
      env: {
        hasClientId: !!OPENSKY_CLIENT_ID,
        hasClientSecret: !!OPENSKY_CLIENT_SECRET,
      },
      timestamp: new Date().toISOString(),
    });
  }

  if (body.action === "test-token") {
    const token = await getAccessToken();
    return NextResponse.json({
      tokenObtained: !!token,
      tokenLength: token?.length || 0,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
