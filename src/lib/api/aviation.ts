// Aviation Tracking API Service for Observatory Dashboard
// Uses OpenSky Network API - FREE, no authentication required for basic queries

import { fetchWithCache, getRateLimiter } from "./config";

// ===========================================
// TYPES
// ===========================================

export interface Aircraft {
  icao24: string; // ICAO24 transponder address (hex)
  callsign: string | null; // Callsign (8 chars max)
  originCountry: string; // Country of origin
  timePosition: number | null; // Unix timestamp of last position update
  lastContact: number; // Unix timestamp of last contact
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null; // Barometric altitude in meters
  onGround: boolean;
  velocity: number | null; // Ground speed in m/s
  trueTrack: number | null; // Heading in decimal degrees
  verticalRate: number | null; // Vertical rate in m/s
  sensors: number[] | null; // IDs of sensors that contributed to state
  geoAltitude: number | null; // Geometric altitude in meters
  squawk: string | null; // Transponder code
  spi: boolean; // Special purpose indicator
  positionSource: number; // 0=ADS-B, 1=ASTERIX, 2=MLAT
  category: number; // Aircraft category
}

export interface OpenSkyResponse {
  time: number;
  states: (string | number | boolean | null)[][] | null;
}

export interface FlightTrack {
  icao24: string;
  callsign: string;
  startTime: number;
  endTime: number;
  path: FlightPathPoint[];
}

export interface FlightPathPoint {
  time: number;
  latitude: number | null;
  longitude: number | null;
  baroAltitude: number | null;
  trueTrack: number | null;
  onGround: boolean;
}

export interface AircraftCategory {
  code: number;
  description: string;
  type: "light" | "medium" | "heavy" | "helicopter" | "military" | "unknown";
}

// Military callsign prefixes (common ones)
const MILITARY_CALLSIGN_PREFIXES = [
  "RCH", // US Air Force (Reach)
  "RRR", // US Air Force Reserve
  "CNV", // US Navy
  "NAVY",
  "USAF",
  "AIRFORCE",
  "ARMY",
  "EVAC", // Medevac
  "DUKE", // US Special Operations
  "KING", // US Air Force Rescue
  "PEDRO", // USAF Pararescue
  "JOLLY", // HH-60 Rescue
  "TOPCAT",
  "HAWK",
  "VIPER",
  "COBRA",
  "ROMAN", // USMC
  "RAIDER", // USMC
  "CODY", // US Army
  "DUSTOFF", // Army Medevac
  "RAF", // Royal Air Force
  "ASCOT", // RAF
  "NATO",
  "FORTE", // Global Hawk surveillance
  "LAGR", // US Army Golden Knights
  "JAKE", // US Navy P-8
  "TROUT", // US Navy EP-3
  "SNTRY", // AWACS
  "AWACS",
  "DRAGN", // U-2 Dragon Lady
  "IRON", // B-52
  "BOMBER",
  "TANKER",
  "GIANT", // C-5
  "REACH",
  "NCHO", // NATO E-3
  "MMF", // French Air Force
  "GAF", // German Air Force
  "IAF", // Israeli Air Force
  "CHF", // Swiss Air Force
  "FAF", // Finnish Air Force
  "SWF", // Swedish Air Force
  "PLF", // Polish Air Force
  "CASA", // Spanish Air Force
  "IAM", // Italian Air Force
  "BAF", // Belgian Air Force
  "RNL", // Netherlands Air Force
  "ASCOT", // British military
  "VOLT", // Training
  "TOPGUN",
];

// Interesting aircraft types (by category code)
const CATEGORY_MAP: Record<number, AircraftCategory> = {
  0: { code: 0, description: "No info", type: "unknown" },
  1: { code: 1, description: "No ADS-B emitter", type: "unknown" },
  2: { code: 2, description: "Light < 15500 lbs", type: "light" },
  3: { code: 3, description: "Small 15500-75000 lbs", type: "medium" },
  4: { code: 4, description: "Large 75000-300000 lbs", type: "heavy" },
  5: { code: 5, description: "High vortex large", type: "heavy" },
  6: { code: 6, description: "Heavy > 300000 lbs", type: "heavy" },
  7: {
    code: 7,
    description: "High performance > 5g & > 400 kts",
    type: "military",
  },
  8: { code: 8, description: "Rotorcraft", type: "helicopter" },
  9: { code: 9, description: "Glider/sailplane", type: "light" },
  10: { code: 10, description: "Lighter than air", type: "light" },
  11: { code: 11, description: "Parachutist/skydiver", type: "unknown" },
  12: { code: 12, description: "Ultralight/hang-glider", type: "light" },
  13: { code: 13, description: "Reserved", type: "unknown" },
  14: { code: 14, description: "UAV", type: "military" },
  15: { code: 15, description: "Space/transatmospheric", type: "unknown" },
  16: { code: 16, description: "Surface emergency vehicle", type: "unknown" },
  17: { code: 17, description: "Surface service vehicle", type: "unknown" },
  18: { code: 18, description: "Point obstacle", type: "unknown" },
  19: { code: 19, description: "Cluster obstacle", type: "unknown" },
  20: { code: 20, description: "Line obstacle", type: "unknown" },
};

// ===========================================
// API ENDPOINTS
// ===========================================

const OPENSKY_BASE = "https://opensky-network.org/api";

// ===========================================
// API FUNCTIONS
// ===========================================

/**
 * Fetch all aircraft states (global)
 * Rate limited: 10 req/s for anonymous, covers last 10s of data
 */
export async function fetchAllAircraft(
  bounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  },
  extended: boolean = false
): Promise<Aircraft[]> {
  try {
    const rateLimiter = getRateLimiter("opensky");
    await rateLimiter.waitForSlot();

    let url = `${OPENSKY_BASE}/states/all`;
    const params = new URLSearchParams();

    if (bounds) {
      params.set("lamin", String(bounds.minLat));
      params.set("lamax", String(bounds.maxLat));
      params.set("lomin", String(bounds.minLon));
      params.set("lomax", String(bounds.maxLon));
    }

    if (extended) {
      params.set("extended", "1");
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await fetchWithCache<OpenSkyResponse>(
      url,
      { timeout: 30000 },
      60 * 1000 // Cache for 1 minute
    );

    if (response.error || !response.data?.states) {
      console.error("OpenSky error:", response.error);
      return [];
    }

    return response.data.states.map(transformAircraftState);
  } catch (error) {
    console.error("OpenSky fetch error:", error);
    return [];
  }
}

/**
 * Fetch aircraft in a specific region
 */
export async function fetchAircraftInRegion(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number
): Promise<Aircraft[]> {
  return fetchAllAircraft({ minLat, maxLat, minLon, maxLon });
}

/**
 * Fetch aircraft by ICAO24 address(es)
 */
export async function fetchAircraftByIcao(
  icao24: string | string[]
): Promise<Aircraft[]> {
  try {
    const rateLimiter = getRateLimiter("opensky");
    await rateLimiter.waitForSlot();

    const icaoList = Array.isArray(icao24) ? icao24 : [icao24];
    const icaoParam = icaoList.join(",");

    const url = `${OPENSKY_BASE}/states/all?icao24=${icaoParam}`;

    const response = await fetchWithCache<OpenSkyResponse>(
      url,
      { timeout: 30000 },
      30 * 1000
    );

    if (response.error || !response.data?.states) {
      return [];
    }

    return response.data.states.map(transformAircraftState);
  } catch (error) {
    console.error("OpenSky ICAO fetch error:", error);
    return [];
  }
}

/**
 * Identify likely military aircraft
 */
export async function fetchMilitaryAircraft(): Promise<Aircraft[]> {
  const allAircraft = await fetchAllAircraft(undefined, true);

  return allAircraft.filter((aircraft) => {
    // Check callsign for military prefixes
    if (aircraft.callsign) {
      const callsign = aircraft.callsign.trim().toUpperCase();
      const isMilitaryCallsign = MILITARY_CALLSIGN_PREFIXES.some(
        (prefix) =>
          callsign.startsWith(prefix) || callsign.includes(prefix)
      );
      if (isMilitaryCallsign) return true;
    }

    // Check category (high performance or UAV)
    if (aircraft.category === 7 || aircraft.category === 14) {
      return true;
    }

    // Check for high altitude (surveillance aircraft often fly very high)
    if (aircraft.geoAltitude && aircraft.geoAltitude > 15000) {
      // >15km altitude
      return true;
    }

    return false;
  });
}

/**
 * Fetch aircraft over specific interesting regions
 */
export async function fetchAircraftOverRegion(
  region:
    | "europe"
    | "middle_east"
    | "asia_pacific"
    | "north_america"
    | "black_sea"
    | "baltic"
    | "south_china_sea"
    | "taiwan_strait"
): Promise<Aircraft[]> {
  const regions: Record<
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
  };

  const bounds = regions[region];
  if (!bounds) {
    return [];
  }

  return fetchAircraftInRegion(
    bounds.minLat,
    bounds.maxLat,
    bounds.minLon,
    bounds.maxLon
  );
}

/**
 * Get aircraft statistics
 */
export async function getAircraftStats(aircraft: Aircraft[]): Promise<{
  total: number;
  inFlight: number;
  onGround: number;
  military: number;
  highAltitude: number;
  byCountry: Record<string, number>;
  byCategory: Record<string, number>;
}> {
  const stats = {
    total: aircraft.length,
    inFlight: 0,
    onGround: 0,
    military: 0,
    highAltitude: 0,
    byCountry: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
  };

  for (const ac of aircraft) {
    if (ac.onGround) {
      stats.onGround++;
    } else {
      stats.inFlight++;
    }

    // Count military
    if (
      ac.callsign &&
      MILITARY_CALLSIGN_PREFIXES.some((p) =>
        ac.callsign!.toUpperCase().includes(p)
      )
    ) {
      stats.military++;
    }

    // High altitude (>12km)
    if (ac.geoAltitude && ac.geoAltitude > 12000) {
      stats.highAltitude++;
    }

    // By country
    stats.byCountry[ac.originCountry] =
      (stats.byCountry[ac.originCountry] || 0) + 1;

    // By category
    const cat = CATEGORY_MAP[ac.category]?.description || "Unknown";
    stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
  }

  return stats;
}

// ===========================================
// TRANSFORM FUNCTIONS
// ===========================================

function transformAircraftState(
  state: (string | number | boolean | null)[]
): Aircraft {
  return {
    icao24: state[0] as string,
    callsign: state[1] as string | null,
    originCountry: state[2] as string,
    timePosition: state[3] as number | null,
    lastContact: state[4] as number,
    longitude: state[5] as number | null,
    latitude: state[6] as number | null,
    baroAltitude: state[7] as number | null,
    onGround: state[8] as boolean,
    velocity: state[9] as number | null,
    trueTrack: state[10] as number | null,
    verticalRate: state[11] as number | null,
    sensors: state[12] as number[] | null,
    geoAltitude: state[13] as number | null,
    squawk: state[14] as string | null,
    spi: state[15] as boolean,
    positionSource: state[16] as number,
    category: (state[17] as number) || 0,
  };
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

export function isMilitaryCallsign(callsign: string | null): boolean {
  if (!callsign) return false;
  const cs = callsign.trim().toUpperCase();
  return MILITARY_CALLSIGN_PREFIXES.some(
    (prefix) => cs.startsWith(prefix) || cs.includes(prefix)
  );
}

export function getAircraftCategory(code: number): AircraftCategory {
  return CATEGORY_MAP[code] || CATEGORY_MAP[0];
}

export function formatAltitude(meters: number | null): string {
  if (meters === null) return "N/A";
  const feet = Math.round(meters * 3.28084);
  return `${feet.toLocaleString()} ft`;
}

export function formatSpeed(metersPerSecond: number | null): string {
  if (metersPerSecond === null) return "N/A";
  const knots = Math.round(metersPerSecond * 1.94384);
  return `${knots} kts`;
}

export function formatHeading(degrees: number | null): string {
  if (degrees === null) return "N/A";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return `${Math.round(degrees)}° ${directions[index]}`;
}

/**
 * Convert aircraft to map marker format
 */
export function aircraftToMapMarker(aircraft: Aircraft): {
  id: string;
  coordinates: { lat: number; lng: number };
  type: "military" | "cyber" | "intel" | "alert" | "economic" | "political";
  severity: "low" | "medium" | "high" | "critical";
  label: string;
  details: {
    callsign: string;
    altitude: string;
    speed: string;
    heading: string;
    country: string;
    category: string;
  };
} | null {
  if (aircraft.latitude === null || aircraft.longitude === null) {
    return null;
  }

  const isMilitary = isMilitaryCallsign(aircraft.callsign);
  const isHighAltitude = aircraft.geoAltitude && aircraft.geoAltitude > 12000;
  const isHighPerformance = aircraft.category === 7 || aircraft.category === 14;

  let severity: "low" | "medium" | "high" | "critical" = "low";
  let type: "military" | "cyber" | "intel" | "alert" | "economic" | "political" =
    "intel";

  if (isMilitary || isHighPerformance) {
    type = "military";
    severity = "high";
  } else if (isHighAltitude) {
    type = "intel";
    severity = "medium";
  }

  return {
    id: `AC-${aircraft.icao24}`,
    coordinates: {
      lat: aircraft.latitude,
      lng: aircraft.longitude,
    },
    type,
    severity,
    label: aircraft.callsign?.trim() || aircraft.icao24,
    details: {
      callsign: aircraft.callsign?.trim() || "Unknown",
      altitude: formatAltitude(aircraft.geoAltitude || aircraft.baroAltitude),
      speed: formatSpeed(aircraft.velocity),
      heading: formatHeading(aircraft.trueTrack),
      country: aircraft.originCountry,
      category: getAircraftCategory(aircraft.category).description,
    },
  };
}
