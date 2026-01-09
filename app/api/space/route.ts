// Server-side API route for fetching space weather data
// Uses NOAA Space Weather Prediction Center (SWPC) - FREE, no authentication required

import { NextResponse } from "next/server";

// Force dynamic rendering - don't call external APIs at build time
export const dynamic = "force-dynamic";

// ===========================================
// Types
// ===========================================

type StormLevel = "G0" | "G1" | "G2" | "G3" | "G4" | "G5";
type SolarRadiationLevel = "S0" | "S1" | "S2" | "S3" | "S4" | "S5";
type RadioBlackoutLevel = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";

interface KpIndex {
  timestamp: string;
  kpValue: number;
  kpText: string;
  observed: boolean;
}

interface SolarWind {
  timestamp: string;
  speed: number;
  density: number;
  temperature: number;
}

interface SolarFlare {
  id: string;
  beginTime: string;
  peakTime: string | null;
  endTime: string | null;
  classType: string;
  sourceLocation: string | null;
  activeRegion: number | null;
  intensity: number;
}

interface SpaceWeatherAlert {
  id: string;
  type:
    | "geomagnetic"
    | "solar_radiation"
    | "radio_blackout"
    | "cme"
    | "solar_flare";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  issueTime: string;
  impacts: string[];
  source: string;
}

interface SpaceWeatherSummary {
  timestamp: string;
  geomagneticStorm: {
    current: StormLevel;
    predicted24h: StormLevel;
  };
  solarRadiation: {
    current: SolarRadiationLevel;
  };
  radioBlackout: {
    current: RadioBlackoutLevel;
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

// ===========================================
// Utility Functions
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
    lower.includes("m-class")
  ) {
    return "medium";
  }

  return "low";
}

function inferAlertType(message: string): SpaceWeatherAlert["type"] {
  const lower = message.toLowerCase();

  if (
    lower.includes("geomagnetic") ||
    lower.includes("kp") ||
    /g[1-5]/.test(lower)
  ) {
    return "geomagnetic";
  }

  if (
    lower.includes("solar radiation") ||
    lower.includes("proton") ||
    /s[1-5]/.test(lower)
  ) {
    return "solar_radiation";
  }

  if (lower.includes("radio blackout") || /r[1-5]/.test(lower)) {
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
  const lines = message.split("\n").filter((l) => l.trim());
  const firstLine = lines[0] || "Space Weather Alert";
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

// ===========================================
// Fetchers
// ===========================================

async function fetchKpIndex(): Promise<KpIndex[]> {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 }, // Cache for 5 minutes
      },
    );

    if (!response.ok) {
      console.error("SWPC Kp error:", response.status);
      return [];
    }

    const data: Array<[string, number | string]> = await response.json();

    // Skip header row
    return data.slice(1).map((row) => {
      const kp =
        typeof row[1] === "number" ? row[1] : parseFloat(String(row[1]));
      return {
        timestamp: row[0] as string,
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

async function fetchSolarWind(): Promise<SolarWind[]> {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data: string[][] = await response.json();

    // Skip header row, get recent data
    return data
      .slice(1)
      .slice(-100)
      .map((row) => ({
        timestamp: row[0],
        density: parseFloat(row[1]) || 0,
        speed: parseFloat(row[2]) || 0,
        temperature: parseFloat(row[3]) || 0,
      }));
  } catch (error) {
    console.error("SWPC solar wind error:", error);
    return [];
  }
}

async function fetchCurrentScales(): Promise<{
  geomagnetic: StormLevel;
  solarRadiation: SolarRadiationLevel;
  radioBlackout: RadioBlackoutLevel;
} | null> {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/noaa-scales.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const current = data["-1"];

    if (!current) return null;

    return {
      geomagnetic: `G${current.G?.Scale || "0"}` as StormLevel,
      solarRadiation: `S${current.S?.Scale || "0"}` as SolarRadiationLevel,
      radioBlackout: `R${current.R?.Scale || "0"}` as RadioBlackoutLevel,
    };
  } catch (error) {
    console.error("SWPC scales error:", error);
    return null;
  }
}

async function fetchSWPCAlerts(): Promise<SpaceWeatherAlert[]> {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/alerts.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data: Array<{
      product_id: string;
      issue_datetime: string;
      message: string;
    }> = await response.json();

    return data.slice(0, 20).map((alert) => ({
      id: alert.product_id,
      type: inferAlertType(alert.message),
      severity: inferAlertSeverity(alert.message),
      title: extractAlertTitle(alert.message),
      description: alert.message.substring(0, 500),
      issueTime: alert.issue_datetime,
      impacts: extractImpacts(alert.message),
      source: "NOAA SWPC",
    }));
  } catch (error) {
    console.error("SWPC alerts error:", error);
    return [];
  }
}

async function fetchSolarFlares(): Promise<SolarFlare[]> {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data: Array<{
      begin_time: string;
      max_time: string;
      end_time: string;
      current_class: string;
      max_class: string;
      begin_class: string;
    }> = await response.json();

    return data.slice(0, 20).map((flare, index) => ({
      id: `FLARE-${index}-${flare.begin_time}`,
      beginTime: flare.begin_time,
      peakTime: flare.max_time || null,
      endTime: flare.end_time || null,
      classType: flare.max_class || flare.current_class || "Unknown",
      sourceLocation: null,
      activeRegion: null,
      intensity: getFlareIntensity(
        flare.max_class || flare.current_class || "",
      ),
    }));
  } catch (error) {
    console.error("SWPC solar flares error:", error);
    return [];
  }
}

// ===========================================
// Summary Generation
// ===========================================

async function getSpaceWeatherSummary(): Promise<SpaceWeatherSummary | null> {
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
    const latestWind =
      solarWind.length > 0 ? solarWind[solarWind.length - 1] : null;

    return {
      timestamp: new Date().toISOString(),
      geomagneticStorm: {
        current: scales.geomagnetic,
        predicted24h: scales.geomagnetic,
      },
      solarRadiation: {
        current: scales.solarRadiation,
      },
      radioBlackout: {
        current: scales.radioBlackout,
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

// ===========================================
// API Route
// ===========================================

export async function GET() {
  try {
    // Fetch all space weather data in parallel
    const [summary, alerts, flares, kpHistory, solarWindHistory] =
      await Promise.all([
        getSpaceWeatherSummary(),
        fetchSWPCAlerts(),
        fetchSolarFlares(),
        fetchKpIndex(),
        fetchSolarWind(),
      ]);

    // Add significant solar flares as alerts
    const significantFlares = flares.filter(
      (f) => f.classType.startsWith("M") || f.classType.startsWith("X"),
    );

    const flareAlerts: SpaceWeatherAlert[] = significantFlares
      .slice(0, 5)
      .map((flare) => ({
        id: flare.id,
        type: "solar_flare",
        severity: flare.classType.startsWith("X") ? "critical" : "high",
        title: `Solar Flare: ${flare.classType}`,
        description: `${flare.classType} class solar flare detected. Peak time: ${flare.peakTime || "Unknown"}.`,
        issueTime: flare.beginTime,
        impacts: flare.classType.startsWith("X")
          ? [
              "HF Radio Communication",
              "GPS/Navigation Systems",
              "Satellite Operations",
            ]
          : ["Minor HF radio degradation"],
        source: "NOAA SWPC",
      }));

    // Combine all alerts
    const allAlerts = [...alerts, ...flareAlerts];

    // Sort by severity
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    allAlerts.sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.issueTime).getTime() - new Date(a.issueTime).getTime();
    });

    // Format Kp display
    const kpFormatted = summary
      ? {
          value: summary.kpIndex.current.toFixed(1),
          description: getKpDescription(summary.kpIndex.current),
          status:
            summary.kpIndex.current >= 5
              ? "storm"
              : summary.kpIndex.current >= 4
                ? "active"
                : summary.kpIndex.current >= 2
                  ? "unsettled"
                  : "quiet",
        }
      : null;

    // Format solar wind display
    const solarWindFormatted = summary
      ? {
          speed: `${Math.round(summary.solarWind.speed)} km/s`,
          status:
            summary.solarWind.speed >= 800
              ? "extreme"
              : summary.solarWind.speed >= 600
                ? "high"
                : summary.solarWind.speed >= 450
                  ? "elevated"
                  : "normal",
        }
      : null;

    return NextResponse.json({
      summary,
      alerts: allAlerts.slice(0, 30),
      flares: flares.slice(0, 20),
      kp: {
        current: kpFormatted,
        history: kpHistory.slice(-24), // Last 24 readings
      },
      solarWind: {
        current: solarWindFormatted,
        history: solarWindHistory.slice(-50),
      },
      stats: {
        activeAlerts: allAlerts.length,
        criticalAlerts: allAlerts.filter((a) => a.severity === "critical")
          .length,
        recentFlares: flares.filter(
          (f) => f.classType.startsWith("M") || f.classType.startsWith("X"),
        ).length,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Space weather API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch space weather data",
        summary: null,
        alerts: [],
        flares: [],
        kp: null,
        solarWind: null,
        stats: null,
      },
      { status: 500 },
    );
  }
}
