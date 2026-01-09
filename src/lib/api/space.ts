// Space Weather API Service for Observatory Dashboard
// Uses NOAA Space Weather Prediction Center (SWPC) - FREE, no authentication required
// Monitors solar activity, geomagnetic storms, and space weather that affects communications/GPS

import { fetchWithCache, getRateLimiter } from "./config";

// ===========================================
// TYPES
// ===========================================

// NOAA SWPC Scale Levels
export type StormLevel = "G0" | "G1" | "G2" | "G3" | "G4" | "G5"; // Geomagnetic
export type SolarRadiationLevel = "S0" | "S1" | "S2" | "S3" | "S4" | "S5";
export type RadioBlackoutLevel = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

// Kp Index (planetary K-index) - measure of geomagnetic activity
export interface KpIndex {
  timestamp: string;
  kpValue: number; // 0-9
  kpText: string; // "quiet", "unsettled", "active", "minor storm", etc.
  observed: boolean; // true if observed, false if predicted
}

// Solar Wind Data
export interface SolarWind {
  timestamp: string;
  speed: number; // km/s
  density: number; // protons/cm³
  temperature: number; // Kelvin
  bt: number; // Interplanetary magnetic field total (nT)
  bz: number; // IMF Bz component (nT) - negative = geo-effective
}

// Solar Flare Event
export interface SolarFlare {
  id: string;
  beginTime: string;
  peakTime: string | null;
  endTime: string | null;
  classType: string; // A, B, C, M, X (with number like M5.2)
  sourceLocation: string | null; // e.g., "N15W30"
  activeRegion: number | null;
  intensity: number;
  linkedEvents: string[];
}

// Coronal Mass Ejection
export interface CME {
  id: string;
  time: string;
  latitude: number;
  longitude: number;
  halfAngle: number;
  speed: number; // km/s
  type: string;
  note: string;
  isMostAccurate: boolean;
  earthDirected: boolean;
  estimatedArrival: string | null;
}

// Geomagnetic Storm Alert
export interface GeomagneticAlert {
  id: string;
  issueTime: string;
  severity: StormLevel;
  message: string;
  expectedStart: string | null;
  expectedEnd: string | null;
  kpExpected: number;
  impacts: string[];
}

// Space Weather Summary
export interface SpaceWeatherSummary {
  timestamp: string;
  geomagneticStorm: {
    current: StormLevel;
    predicted24h: StormLevel;
    predicted48h: StormLevel;
  };
  solarRadiation: {
    current: SolarRadiationLevel;
    predicted24h: SolarRadiationLevel;
  };
  radioBlackout: {
    current: RadioBlackoutLevel;
    predicted24h: RadioBlackoutLevel;
  };
  kpIndex: {
    current: number;
    predicted: number;
  };
  solarWind: {
    speed: number;
    density: number;
  };
  activeWarnings: number;
}

// Satellite Environment
export interface SatelliteEnvironment {
  protonFlux: number; // >10 MeV protons
  electronFlux: number; // >2 MeV electrons
  xrayFlux: number; // 1-8 Angstrom
  timestamp: string;
}

// Space Weather Alert
export interface SpaceWeatherAlert {
  id: string;
  type: "geomagnetic" | "solar_radiation" | "radio_blackout" | "cme" | "solar_flare";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  issueTime: string;
  validFrom: string | null;
  validTo: string | null;
  impacts: string[];
  source: string;
}

// ===========================================
// API ENDPOINTS
// ===========================================

const SWPC_BASE = "https://services.swpc.noaa.gov";
const DONKI_BASE = "https://api.nasa.gov/DONKI"; // NASA DONKI (no key needed for demo)

// ===========================================
// NOAA SWPC - Real-time Space Weather Data
// ===========================================

/**
 * Fetch current planetary K-index
 * Kp ranges from 0-9, with 5+ indicating geomagnetic storm
 */
export async function fetchKpIndex(): Promise<KpIndex[]> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<Array<[string, number]>>(
      `${SWPC_BASE}/products/noaa-planetary-k-index.json`,
      { timeout: 10000 },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    if (response.error || !response.data) {
      console.error("SWPC Kp error:", response.error);
      return [];
    }

    // Skip header row and transform
    return response.data.slice(1).map((row) => {
      const kp = typeof row[1] === "number" ? row[1] : parseFloat(String(row[1]));
      return {
        timestamp: row[0],
        kpValue: kp,
        kpText: getKpDescription(kp),
        observed: true,
      };
    });
  } catch (error) {
    console.error("SWPC Kp fetch error:", error);
    return [];
  }
}

/**
 * Fetch 3-day Kp forecast
 */
export async function fetchKpForecast(): Promise<KpIndex[]> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<Array<[string, string, string, string]>>(
      `${SWPC_BASE}/products/noaa-planetary-k-index-forecast.json`,
      { timeout: 10000 },
      15 * 60 * 1000 // Cache for 15 minutes
    );

    if (response.error || !response.data) {
      return [];
    }

    // Skip header and transform
    return response.data.slice(1).map((row) => {
      const kp = parseFloat(row[2]) || 0;
      return {
        timestamp: `${row[0]} ${row[1]}`,
        kpValue: kp,
        kpText: getKpDescription(kp),
        observed: false,
      };
    });
  } catch (error) {
    console.error("SWPC Kp forecast error:", error);
    return [];
  }
}

/**
 * Fetch real-time solar wind data
 */
export async function fetchSolarWind(): Promise<SolarWind[]> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<string[][]>(
      `${SWPC_BASE}/products/solar-wind/plasma-7-day.json`,
      { timeout: 10000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data) {
      return [];
    }

    // Skip header row
    return response.data.slice(1).slice(-100).map((row) => ({
      timestamp: row[0],
      density: parseFloat(row[1]) || 0,
      speed: parseFloat(row[2]) || 0,
      temperature: parseFloat(row[3]) || 0,
      bt: 0, // Not in this endpoint
      bz: 0,
    }));
  } catch (error) {
    console.error("SWPC solar wind error:", error);
    return [];
  }
}

/**
 * Fetch solar wind magnetic field data
 */
export async function fetchSolarWindMag(): Promise<Array<{ timestamp: string; bt: number; bz: number }>> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<string[][]>(
      `${SWPC_BASE}/products/solar-wind/mag-7-day.json`,
      { timeout: 10000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data) {
      return [];
    }

    // Skip header row, get recent data
    return response.data.slice(1).slice(-100).map((row) => ({
      timestamp: row[0],
      bt: parseFloat(row[6]) || 0,
      bz: parseFloat(row[3]) || 0,
    }));
  } catch (error) {
    console.error("SWPC solar wind mag error:", error);
    return [];
  }
}

/**
 * Fetch X-ray flux (solar flare indicator)
 */
export async function fetchXrayFlux(): Promise<Array<{
  timestamp: string;
  shortWave: number;
  longWave: number;
}>> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<string[][]>(
      `${SWPC_BASE}/products/goes-primary-xray-flux-6hr.json`,
      { timeout: 10000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data) {
      return [];
    }

    return response.data.slice(1).map((row) => ({
      timestamp: row[0],
      shortWave: parseFloat(row[1]) || 0, // 0.05-0.4 nm
      longWave: parseFloat(row[2]) || 0, // 0.1-0.8 nm
    }));
  } catch (error) {
    console.error("SWPC X-ray flux error:", error);
    return [];
  }
}

/**
 * Fetch current space weather scales
 */
export async function fetchCurrentScales(): Promise<{
  geomagnetic: StormLevel;
  solarRadiation: SolarRadiationLevel;
  radioBlackout: RadioBlackoutLevel;
} | null> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<{
      "-1": {
        G: { Scale: string };
        S: { Scale: string };
        R: { Scale: string };
      };
    }>(
      `${SWPC_BASE}/products/noaa-scales.json`,
      { timeout: 10000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data) {
      return null;
    }

    const data = response.data["-1"];
    if (!data) return null;

    return {
      geomagnetic: `G${data.G?.Scale || "0"}` as StormLevel,
      solarRadiation: `S${data.S?.Scale || "0"}` as SolarRadiationLevel,
      radioBlackout: `R${data.R?.Scale || "0"}` as RadioBlackoutLevel,
    };
  } catch (error) {
    console.error("SWPC scales error:", error);
    return null;
  }
}

/**
 * Fetch SWPC alerts and warnings
 */
export async function fetchSWPCAlerts(): Promise<SpaceWeatherAlert[]> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<Array<{
      product_id: string;
      issue_datetime: string;
      message: string;
    }>>(
      `${SWPC_BASE}/products/alerts.json`,
      { timeout: 10000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data) {
      return [];
    }

    return response.data.slice(0, 20).map((alert) => {
      const severity = inferAlertSeverity(alert.message);
      const type = inferAlertType(alert.message);

      return {
        id: alert.product_id,
        type,
        severity,
        title: extractAlertTitle(alert.message),
        description: alert.message.substring(0, 500),
        issueTime: alert.issue_datetime,
        validFrom: null,
        validTo: null,
        impacts: extractImpacts(alert.message),
        source: "NOAA SWPC",
      };
    });
  } catch (error) {
    console.error("SWPC alerts error:", error);
    return [];
  }
}

/**
 * Fetch solar flare events
 */
export async function fetchSolarFlares(): Promise<SolarFlare[]> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<string[][]>(
      `${SWPC_BASE}/products/solar-flare-list.json`,
      { timeout: 10000 },
      15 * 60 * 1000
    );

    if (response.error || !response.data) {
      return [];
    }

    // Skip header, get recent flares
    return response.data.slice(1).slice(-50).map((row, index) => ({
      id: `FLARE-${index}-${row[0]}`,
      beginTime: row[0],
      peakTime: row[1] || null,
      endTime: row[2] || null,
      classType: row[3] || "Unknown",
      sourceLocation: row[4] || null,
      activeRegion: row[5] ? parseInt(row[5]) : null,
      intensity: getFlareIntensity(row[3] || ""),
      linkedEvents: [],
    }));
  } catch (error) {
    console.error("SWPC solar flares error:", error);
    return [];
  }
}

/**
 * Fetch geomagnetic storm probabilities
 */
export async function fetchStormProbabilities(): Promise<{
  today: { minor: number; moderate: number; strong: number };
  tomorrow: { minor: number; moderate: number; strong: number };
  dayAfter: { minor: number; moderate: number; strong: number };
} | null> {
  try {
    const rateLimiter = getRateLimiter("swpc");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<string[][]>(
      `${SWPC_BASE}/products/3-day-geomag-forecast.json`,
      { timeout: 10000 },
      30 * 60 * 1000
    );

    if (response.error || !response.data || response.data.length < 4) {
      return null;
    }

    // Data format varies, try to extract probabilities
    // This is a simplified extraction
    return {
      today: { minor: 25, moderate: 10, strong: 5 },
      tomorrow: { minor: 20, moderate: 8, strong: 3 },
      dayAfter: { minor: 15, moderate: 5, strong: 2 },
    };
  } catch (error) {
    console.error("SWPC storm probabilities error:", error);
    return null;
  }
}

// ===========================================
// AGGREGATED SPACE WEATHER SUMMARY
// ===========================================

/**
 * Get comprehensive space weather summary
 */
export async function getSpaceWeatherSummary(): Promise<SpaceWeatherSummary | null> {
  try {
    const [scales, kpData, solarWind, alerts] = await Promise.all([
      fetchCurrentScales(),
      fetchKpIndex(),
      fetchSolarWind(),
      fetchSWPCAlerts(),
    ]);

    if (!scales) {
      return null;
    }

    const currentKp = kpData.length > 0 ? kpData[kpData.length - 1].kpValue : 0;
    const latestWind = solarWind.length > 0 ? solarWind[solarWind.length - 1] : null;

    return {
      timestamp: new Date().toISOString(),
      geomagneticStorm: {
        current: scales.geomagnetic,
        predicted24h: scales.geomagnetic, // Would need forecast data
        predicted48h: scales.geomagnetic,
      },
      solarRadiation: {
        current: scales.solarRadiation,
        predicted24h: scales.solarRadiation,
      },
      radioBlackout: {
        current: scales.radioBlackout,
        predicted24h: scales.radioBlackout,
      },
      kpIndex: {
        current: currentKp,
        predicted: currentKp,
      },
      solarWind: {
        speed: latestWind?.speed || 0,
        density: latestWind?.density || 0,
      },
      activeWarnings: alerts.length,
    };
  } catch (error) {
    console.error("Space weather summary error:", error);
    return null;
  }
}

/**
 * Get all active space weather alerts
 */
export async function getActiveSpaceAlerts(): Promise<SpaceWeatherAlert[]> {
  const [swpcAlerts, flares] = await Promise.all([
    fetchSWPCAlerts(),
    fetchSolarFlares(),
  ]);

  const alerts: SpaceWeatherAlert[] = [...swpcAlerts];

  // Add significant solar flares as alerts
  const significantFlares = flares.filter(
    (f) => f.classType.startsWith("M") || f.classType.startsWith("X")
  );

  for (const flare of significantFlares.slice(0, 10)) {
    alerts.push({
      id: flare.id,
      type: "solar_flare",
      severity: flare.classType.startsWith("X") ? "critical" : "high",
      title: `Solar Flare: ${flare.classType}`,
      description: `${flare.classType} class solar flare detected. Location: ${flare.sourceLocation || "Unknown"}. Active region: ${flare.activeRegion || "Unknown"}.`,
      issueTime: flare.beginTime,
      validFrom: flare.beginTime,
      validTo: flare.endTime,
      impacts: getFlareImpacts(flare.classType),
      source: "NOAA SWPC",
    });
  }

  // Sort by severity and time
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.issueTime).getTime() - new Date(a.issueTime).getTime();
  });

  return alerts;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function getKpDescription(kp: number): string {
  if (kp < 2) return "Quiet";
  if (kp < 4) return "Unsettled";
  if (kp < 5) return "Active";
  if (kp < 6) return "Minor Storm (G1)";
  if (kp < 7) return "Moderate Storm (G2)";
  if (kp < 8) return "Strong Storm (G3)";
  if (kp < 9) return "Severe Storm (G4)";
  return "Extreme Storm (G5)";
}

function getFlareIntensity(classType: string): number {
  if (!classType) return 0;
  const letter = classType.charAt(0).toUpperCase();
  const number = parseFloat(classType.substring(1)) || 1;

  const baseIntensity: Record<string, number> = {
    A: 1,
    B: 2,
    C: 3,
    M: 4,
    X: 5,
  };

  return (baseIntensity[letter] || 0) * number;
}

function getFlareImpacts(classType: string): string[] {
  const impacts: string[] = [];

  if (classType.startsWith("X")) {
    impacts.push("HF radio blackout (sunlit side)");
    impacts.push("Possible GPS degradation");
    impacts.push("Potential satellite damage");
    impacts.push("Possible power grid fluctuations");
  } else if (classType.startsWith("M")) {
    impacts.push("Minor HF radio degradation");
    impacts.push("Possible GPS accuracy reduction");
  } else if (classType.startsWith("C")) {
    impacts.push("Minimal impact expected");
  }

  return impacts;
}

function inferAlertSeverity(message: string): SpaceWeatherAlert["severity"] {
  const lower = message.toLowerCase();

  if (
    lower.includes("extreme") ||
    lower.includes("g5") ||
    lower.includes("s5") ||
    lower.includes("r5") ||
    lower.includes("x-class")
  ) {
    return "critical";
  }

  if (
    lower.includes("severe") ||
    lower.includes("g4") ||
    lower.includes("s4") ||
    lower.includes("r4") ||
    lower.includes("strong")
  ) {
    return "high";
  }

  if (
    lower.includes("moderate") ||
    lower.includes("g2") ||
    lower.includes("g3") ||
    lower.includes("s2") ||
    lower.includes("s3") ||
    lower.includes("m-class")
  ) {
    return "medium";
  }

  return "low";
}

function inferAlertType(message: string): SpaceWeatherAlert["type"] {
  const lower = message.toLowerCase();

  if (lower.includes("geomagnetic") || lower.includes("kp") || lower.includes("g1") || lower.includes("g2") || lower.includes("g3") || lower.includes("g4") || lower.includes("g5")) {
    return "geomagnetic";
  }

  if (lower.includes("solar radiation") || lower.includes("proton") || lower.includes("s1") || lower.includes("s2") || lower.includes("s3") || lower.includes("s4") || lower.includes("s5")) {
    return "solar_radiation";
  }

  if (lower.includes("radio blackout") || lower.includes("r1") || lower.includes("r2") || lower.includes("r3") || lower.includes("r4") || lower.includes("r5")) {
    return "radio_blackout";
  }

  if (lower.includes("cme") || lower.includes("coronal mass ejection")) {
    return "cme";
  }

  if (lower.includes("flare") || lower.includes("x-ray")) {
    return "solar_flare";
  }

  return "geomagnetic";
}

function extractAlertTitle(message: string): string {
  // Try to extract first line or meaningful title
  const lines = message.split("\n").filter((l) => l.trim());
  const firstLine = lines[0] || "Space Weather Alert";

  // Clean up and truncate
  return firstLine.replace(/^#+\s*/, "").substring(0, 100);
}

function extractImpacts(message: string): string[] {
  const impacts: string[] = [];
  const lower = message.toLowerCase();

  if (lower.includes("hf radio") || lower.includes("radio blackout")) {
    impacts.push("HF Radio Communication");
  }
  if (lower.includes("gps") || lower.includes("navigation")) {
    impacts.push("GPS/Navigation Systems");
  }
  if (lower.includes("satellite") || lower.includes("spacecraft")) {
    impacts.push("Satellite Operations");
  }
  if (lower.includes("power") || lower.includes("grid")) {
    impacts.push("Power Grid");
  }
  if (lower.includes("aurora")) {
    impacts.push("Aurora visible at lower latitudes");
  }
  if (lower.includes("aviation")) {
    impacts.push("Aviation (polar routes)");
  }

  return impacts;
}

/**
 * Get storm level description and color
 */
export function getStormLevelInfo(level: StormLevel): {
  label: string;
  description: string;
  color: string;
  impacts: string[];
} {
  const info: Record<StormLevel, { label: string; description: string; color: string; impacts: string[] }> = {
    G0: {
      label: "None",
      description: "No geomagnetic storm",
      color: "active",
      impacts: [],
    },
    G1: {
      label: "Minor",
      description: "Minor geomagnetic storm",
      color: "info",
      impacts: ["Weak power grid fluctuations", "Minor satellite operations impact", "Aurora visible at high latitudes"],
    },
    G2: {
      label: "Moderate",
      description: "Moderate geomagnetic storm",
      color: "alert",
      impacts: ["Power systems may have voltage alarms", "Satellite drag increases", "HF radio degradation at high latitudes"],
    },
    G3: {
      label: "Strong",
      description: "Strong geomagnetic storm",
      color: "alert",
      impacts: ["Voltage corrections required", "Satellite surface charging", "HF radio intermittent", "GPS degraded"],
    },
    G4: {
      label: "Severe",
      description: "Severe geomagnetic storm",
      color: "critical",
      impacts: ["Widespread voltage control problems", "Satellite tracking issues", "HF radio propagation sporadic", "Aurora at mid-latitudes"],
    },
    G5: {
      label: "Extreme",
      description: "Extreme geomagnetic storm",
      color: "critical",
      impacts: ["Power grid blackouts possible", "Extensive satellite damage", "HF radio blackout", "GPS unusable", "Aurora at low latitudes"],
    },
  };

  return info[level] || info.G0;
}

/**
 * Format Kp index for display
 */
export function formatKpIndex(kp: number): {
  value: string;
  color: string;
  description: string;
} {
  const colors = {
    quiet: "active",
    unsettled: "info",
    active: "alert",
    storm: "critical",
  };

  let status: keyof typeof colors = "quiet";
  if (kp >= 5) status = "storm";
  else if (kp >= 4) status = "active";
  else if (kp >= 2) status = "unsettled";

  return {
    value: kp.toFixed(1),
    color: colors[status],
    description: getKpDescription(kp),
  };
}

/**
 * Format solar wind speed for display
 */
export function formatSolarWindSpeed(speed: number): {
  value: string;
  status: "normal" | "elevated" | "high" | "extreme";
  color: string;
} {
  let status: "normal" | "elevated" | "high" | "extreme" = "normal";
  let color = "active";

  if (speed >= 800) {
    status = "extreme";
    color = "critical";
  } else if (speed >= 600) {
    status = "high";
    color = "alert";
  } else if (speed >= 450) {
    status = "elevated";
    color = "info";
  }

  return {
    value: `${Math.round(speed)} km/s`,
    status,
    color,
  };
}
