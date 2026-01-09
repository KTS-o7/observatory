// Server-side API route for fetching aircraft tracking data
// Uses OpenSky Network API - FREE, no authentication required for basic queries

import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering - don't call external APIs at build time
export const dynamic = "force-dynamic";

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

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Observatory Dashboard/1.0",
      },
      next: { revalidate: 300 }, // Cache for 1 minute
    });

    if (!response.ok) {
      // OpenSky might rate limit - return cached/empty data gracefully
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: "Rate limited by OpenSky Network",
            aircraft: [],
            stats: null,
          },
          { status: 429 },
        );
      }
      throw new Error(`OpenSky API error: ${response.status}`);
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
    return NextResponse.json(
      { error: "Failed to fetch aircraft data", aircraft: [], stats: null },
      { status: 500 },
    );
  }
}
