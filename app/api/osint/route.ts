// Server-side API route for unified OSINT metrics
// Aggregates data from all OSINT sources into dashboard-friendly metrics

import { NextResponse } from "next/server";

// Force dynamic rendering - don't call external APIs at build time
export const dynamic = "force-dynamic";

// ===========================================
// Timeout Utility
// ===========================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { next?: { revalidate?: number } } = {},
  timeoutMs: number = 8000,
): Promise<Response | null> {
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    // Add default headers to help with some APIs
    const headers = new Headers(options.headers);
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", "Observatory-OSINT/1.0");
    }
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const fetchPromise = fetch(url, {
      ...options,
      headers,
    }).catch((error) => {
      // Silently handle network errors - these are expected for some APIs
      return null;
    });

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    return result;
  } catch (error) {
    return null;
  }
}

// Safe JSON parser
async function safeJsonParse<T>(response: Response | null): Promise<T | null> {
  if (!response || !response.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// ===========================================
// Types
// ===========================================

interface OsintMetric {
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

interface OsintMapMarker {
  id: string;
  coordinates: { lat: number; lng: number };
  type: "cyber" | "military" | "alert" | "intel" | "political" | "economic";
  severity: "low" | "medium" | "high" | "critical";
  label: string;
  eventCount: number;
  lastUpdate: string;
  source: string;
}

interface OsintIntelEvent {
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

// ===========================================
// Fetchers
// ===========================================

async function fetchCyberStats(): Promise<{
  malwareUrls: number;
  ransomwareVictims: number;
  botnetC2s: number;
  last24h: number;
  threatFoxIocs: number;
  malwareSamples: number;
  phishingUrls: number;
  otxPulses: number;
  urlScans: number;
  activeCves: number;
}> {
  try {
    // Fetch from URLhaus
    const urlhausRes = await fetchWithTimeout(
      "https://urlhaus-api.abuse.ch/v1/urls/recent/limit/100/",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    let malwareUrls = 0;
    if (urlhausRes && urlhausRes.ok) {
      const data = await urlhausRes.json();
      malwareUrls = (data.urls || []).filter(
        (u: { url_status: string }) => u.url_status === "online",
      ).length;
    }

    // Fetch from Ransomware.live - increase timeout as this API can be slow
    const ransomRes = await fetchWithTimeout(
      "https://api.ransomware.live/v1/recentvictims",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Observatory-OSINT/1.0",
        },
        next: { revalidate: 900 },
      },
      10000,
    );

    let ransomwareVictims = 0;
    let last24h = 0;
    if (ransomRes && ransomRes.ok) {
      const victims = await ransomRes.json();
      ransomwareVictims = victims.length;

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      last24h = victims.filter(
        (v: { discovered: string }) =>
          new Date(v.discovered).getTime() >= oneDayAgo,
      ).length;
    }

    // Fetch from Feodo Tracker
    const feodoRes = await fetchWithTimeout(
      "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    let botnetC2s = 0;
    if (feodoRes && feodoRes.ok) {
      const c2s = await feodoRes.json();
      botnetC2s = Array.isArray(c2s) ? c2s.length : 0;
    }

    // Fetch from ThreatFox (abuse.ch IOC database)
    const threatFoxRes = await fetchWithTimeout(
      "https://threatfox-api.abuse.ch/api/v1/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "get_iocs", days: 1 }),
        next: { revalidate: 900 },
      },
      5000,
    );

    let threatFoxIocs = 0;
    if (threatFoxRes && threatFoxRes.ok) {
      const data = await threatFoxRes.json();
      if (data.query_status === "ok" && Array.isArray(data.data)) {
        threatFoxIocs = data.data.length;
      }
    }

    // Fetch from MalwareBazaar (recent samples)
    const bazaarRes = await fetchWithTimeout(
      "https://mb-api.abuse.ch/api/v1/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "get_recent", selector: "100" }),
        next: { revalidate: 900 },
      },
      5000,
    );

    let malwareSamples = 0;
    if (bazaarRes && bazaarRes.ok) {
      const data = await bazaarRes.json();
      if (data.query_status === "ok" && Array.isArray(data.data)) {
        malwareSamples = data.data.length;
      }
    }

    let phishingUrls = 0;
    // Estimate phishing from URLhaus phishing tags (PhishTank requires registration)
    if (urlhausRes && urlhausRes.ok) {
      const data = await urlhausRes.json();
      phishingUrls = (data.urls || []).filter(
        (u: { tags?: string[] }) =>
          u.tags &&
          u.tags.some((t: string) => t.toLowerCase().includes("phish")),
      ).length;
    }

    // Fetch from AlienVault OTX (Open Threat Exchange) - FREE
    const otxRes = await fetchWithTimeout(
      "https://otx.alienvault.com/api/v1/pulses/subscribed?limit=10&page=1",
      {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 900 },
      },
      5000,
    );

    let otxPulses = 0;
    if (otxRes && otxRes.ok) {
      const data = await safeJsonParse<{ count?: number }>(otxRes);
      otxPulses = data?.count || 0;
    }

    // Fetch from URLScan.io recent scans - FREE
    const urlScanRes = await fetchWithTimeout(
      "https://urlscan.io/api/v1/search/?q=date:>now-1d&size=0",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    let urlScans = 0;
    if (urlScanRes && urlScanRes.ok) {
      const data = await safeJsonParse<{ total?: number }>(urlScanRes);
      urlScans = data?.total || 0;
    }

    // Fetch from NVD (National Vulnerability Database) - FREE
    const nvdRes = await fetchWithTimeout(
      "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1&pubStartDate=" +
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0] +
        "T00:00:00.000&pubEndDate=" +
        new Date().toISOString().split("T")[0] +
        "T23:59:59.999",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      },
      8000,
    );

    let activeCves = 0;
    if (nvdRes && nvdRes.ok) {
      const data = await safeJsonParse<{ totalResults?: number }>(nvdRes);
      activeCves = data?.totalResults || 0;
    }

    return {
      malwareUrls,
      ransomwareVictims,
      botnetC2s,
      last24h,
      threatFoxIocs,
      malwareSamples,
      phishingUrls,
      otxPulses,
      urlScans,
      activeCves,
    };
  } catch (error) {
    console.error("Cyber stats fetch error:", error);
    return {
      malwareUrls: 0,
      ransomwareVictims: 0,
      botnetC2s: 0,
      last24h: 0,
      threatFoxIocs: 0,
      malwareSamples: 0,
      phishingUrls: 0,
      otxPulses: 0,
      urlScans: 0,
      activeCves: 0,
    };
  }
}

async function fetchSpaceWeatherStats(): Promise<{
  kpIndex: number;
  solarWindSpeed: number;
  geomagLevel: number;
  activeAlerts: number;
}> {
  try {
    // Fetch Kp index
    const kpRes = await fetchWithTimeout(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    let kpIndex = 0;
    if (kpRes && kpRes.ok) {
      const data = await kpRes.json();
      if (data.length > 1) {
        const lastEntry = data[data.length - 1];
        kpIndex =
          typeof lastEntry[1] === "number"
            ? lastEntry[1]
            : parseFloat(lastEntry[1]) || 0;
      }
    }

    // Fetch solar wind
    const windRes = await fetchWithTimeout(
      "https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    let solarWindSpeed = 0;
    if (windRes && windRes.ok) {
      const data = await windRes.json();
      if (data.length > 1) {
        const lastEntry = data[data.length - 1];
        solarWindSpeed = parseFloat(lastEntry[2]) || 0;
      }
    }

    // Fetch scales
    const scalesRes = await fetchWithTimeout(
      "https://services.swpc.noaa.gov/products/noaa-scales.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    let geomagLevel = 0;
    if (scalesRes && scalesRes.ok) {
      const data = await scalesRes.json();
      const current = data["-1"];
      if (current?.G?.Scale) {
        geomagLevel = parseInt(current.G.Scale) || 0;
      }
    }

    // Fetch alerts count
    const alertsRes = await fetchWithTimeout(
      "https://services.swpc.noaa.gov/products/alerts.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    let activeAlerts = 0;
    if (alertsRes && alertsRes.ok) {
      const alerts = await alertsRes.json();
      activeAlerts = Array.isArray(alerts) ? alerts.length : 0;
    }

    return { kpIndex, solarWindSpeed, geomagLevel, activeAlerts };
  } catch (error) {
    console.error("Space weather stats error:", error);
    return { kpIndex: 0, solarWindSpeed: 0, geomagLevel: 0, activeAlerts: 0 };
  }
}

async function fetchInfrastructureStats(): Promise<{
  outages: number;
  criticalOutages: number;
  servicesDown: number;
  torExitNodes: number;
  bgpIncidents: number;
  isroLaunches: number;
  isroUpcoming: number;
}> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 24 * 60 * 60;

    let outages = 0;
    let criticalOutages = 0;

    const iodaRes = await fetchWithTimeout(
      `https://api.ioda.inetintel.cc.gatech.edu/v2/alerts?from=${oneDayAgo}&until=${now}&limit=100`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      8000,
    );

    if (iodaRes && iodaRes.ok) {
      const data = await safeJsonParse<{
        data?: Array<{ level: string; value: number }>;
      }>(iodaRes);
      const alerts = data?.data || [];
      outages = alerts.length;
      criticalOutages = alerts.filter(
        (a) => a.level === "critical" || a.value < 0.3,
      ).length;
    }

    // Check major services
    const serviceChecks = await Promise.all([
      fetchWithTimeout(
        "https://www.githubstatus.com/api/v2/status.json",
        { next: { revalidate: 900 } },
        3000,
      ),
      fetchWithTimeout(
        "https://www.cloudflarestatus.com/api/v2/status.json",
        { next: { revalidate: 900 } },
        3000,
      ),
    ]);

    let servicesDown = 0;
    for (const res of serviceChecks) {
      if (res && res.ok) {
        const data = await res.json();
        if (
          data.status?.indicator === "major" ||
          data.status?.indicator === "critical"
        ) {
          servicesDown++;
        }
      }
    }

    let torExitNodes = 0;
    const torRes = await fetchWithTimeout(
      "https://onionoo.torproject.org/summary?type=relay&flag=Exit&running=true",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      },
      10000,
    );
    if (torRes && torRes.ok) {
      const torData = await safeJsonParse<{
        relays?: unknown[];
      }>(torRes);
      if (torData?.relays) {
        torExitNodes = torData.relays.length;
      }
    }

    // BGP incidents - skip for now as RIPE API is slow
    let bgpIncidents = 0;

    // Fetch ISRO launches from isrostats.in - FREE
    let isroLaunches = 0;
    let isroUpcoming = 0;
    const isroRes = await fetchWithTimeout(
      "https://services.isrostats.in/api/launches",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      },
      5000,
    );

    if (isroRes && isroRes.ok) {
      const launches =
        await safeJsonParse<
          Array<{ LaunchDate: string; MissionStatus: string }>
        >(isroRes);
      if (Array.isArray(launches)) {
        isroLaunches = launches.filter(
          (l) => l.MissionStatus === "MISSION SUCCESSFUL",
        ).length;
        // Count future launches
        const today = new Date();
        isroUpcoming = launches.filter((l) => {
          const launchDate = new Date(l.LaunchDate);
          return launchDate > today;
        }).length;
      }
    }

    return {
      outages,
      criticalOutages,
      servicesDown,
      torExitNodes,
      bgpIncidents,
      isroLaunches,
      isroUpcoming,
    };
  } catch (error) {
    console.error("Infrastructure stats error:", error);
    return {
      outages: 0,
      criticalOutages: 0,
      servicesDown: 0,
      torExitNodes: 0,
      bgpIncidents: 0,
      isroLaunches: 0,
      isroUpcoming: 0,
    };
  }
}

async function fetchRansomwareMarkers(): Promise<OsintMapMarker[]> {
  try {
    const res = await fetch("https://api.ransomware.live/v1/recentvictims", {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
    });

    if (!res.ok) return [];

    const victims = await res.json();

    // Country coordinates (approximate centers)
    const countryCoords: Record<string, { lat: number; lng: number }> = {
      US: { lat: 39.8, lng: -98.5 },
      USA: { lat: 39.8, lng: -98.5 },
      UK: { lat: 54.0, lng: -2.0 },
      GB: { lat: 54.0, lng: -2.0 },
      DE: { lat: 51.1, lng: 10.4 },
      FR: { lat: 46.2, lng: 2.2 },
      IT: { lat: 41.9, lng: 12.5 },
      ES: { lat: 40.4, lng: -3.7 },
      CA: { lat: 56.1, lng: -106.3 },
      AU: { lat: -25.3, lng: 133.8 },
      JP: { lat: 36.2, lng: 138.2 },
      BR: { lat: -14.2, lng: -51.9 },
      IN: { lat: 20.6, lng: 78.9 },
      CN: { lat: 35.8, lng: 104.2 },
      RU: { lat: 61.5, lng: 105.3 },
      MX: { lat: 23.6, lng: -102.5 },
      KR: { lat: 35.9, lng: 127.8 },
      NL: { lat: 52.1, lng: 5.3 },
      SE: { lat: 60.1, lng: 18.6 },
      CH: { lat: 46.8, lng: 8.2 },
    };

    // Group by country
    const byCountry = new Map<
      string,
      { count: number; latest: string; groups: Set<string> }
    >();

    for (const victim of victims.slice(0, 100)) {
      const country = victim.country?.toUpperCase() || "UNKNOWN";
      if (!byCountry.has(country)) {
        byCountry.set(country, {
          count: 0,
          latest: victim.discovered,
          groups: new Set(),
        });
      }
      const entry = byCountry.get(country)!;
      entry.count++;
      entry.groups.add(victim.group_name);
      if (new Date(victim.discovered) > new Date(entry.latest)) {
        entry.latest = victim.discovered;
      }
    }

    const markers: OsintMapMarker[] = [];
    for (const [country, data] of byCountry.entries()) {
      const coords = countryCoords[country];
      if (coords && data.count > 0) {
        // Add some randomness to avoid overlap
        const jitter = () => (Math.random() - 0.5) * 5;

        markers.push({
          id: `RW-${country}`,
          coordinates: {
            lat: coords.lat + jitter(),
            lng: coords.lng + jitter(),
          },
          type: "cyber",
          severity:
            data.count >= 5 ? "critical" : data.count >= 3 ? "high" : "medium",
          label: `${country}: ${data.count} victims`,
          eventCount: data.count,
          lastUpdate: data.latest,
          source: "Ransomware.live",
        });
      }
    }

    return markers;
  } catch (error) {
    console.error("Ransomware markers error:", error);
    return [];
  }
}

async function fetchOutageMarkers(): Promise<OsintMapMarker[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 24 * 60 * 60;

    const res = await fetchWithTimeout(
      `https://api.ioda.inetintel.cc.gatech.edu/v2/alerts?from=${oneDayAgo}&until=${now}&limit=50`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      8000,
    );

    if (!res || !res.ok) return [];

    const data = await safeJsonParse<{
      data?: Array<{
        time: number;
        level: string;
        value: number;
        entity?: { code?: string; name?: string };
      }>;
    }>(res);
    const alerts = data?.data || [];
    if (alerts.length === 0) return [];

    // Country coordinates
    const countryCoords: Record<string, { lat: number; lng: number }> = {
      US: { lat: 39.8, lng: -98.5 },
      RU: { lat: 61.5, lng: 105.3 },
      CN: { lat: 35.8, lng: 104.2 },
      IR: { lat: 32.4, lng: 53.7 },
      UA: { lat: 48.4, lng: 31.2 },
      SY: { lat: 34.8, lng: 39.0 },
      IQ: { lat: 33.2, lng: 43.7 },
      AF: { lat: 33.9, lng: 67.7 },
      PK: { lat: 30.4, lng: 69.3 },
      IN: { lat: 20.6, lng: 78.9 },
      MM: { lat: 21.9, lng: 95.9 },
      KP: { lat: 40.3, lng: 127.5 },
      VE: { lat: 6.4, lng: -66.6 },
      CU: { lat: 21.5, lng: -77.8 },
      SD: { lat: 12.9, lng: 30.2 },
      ET: { lat: 9.1, lng: 40.5 },
      YE: { lat: 15.6, lng: 48.5 },
      LY: { lat: 26.3, lng: 17.2 },
    };

    return alerts.slice(0, 20).map((alert, index) => {
      const code = alert.entity?.code?.toUpperCase() || "XX";
      const coords = countryCoords[code] || {
        lat: (Math.random() - 0.5) * 100,
        lng: (Math.random() - 0.5) * 200,
      };

      return {
        id: `OUTAGE-${code}-${index}`,
        coordinates: coords,
        type: "alert" as const,
        severity:
          alert.level === "critical" || alert.value < 0.3
            ? "critical"
            : alert.value < 0.7
              ? "high"
              : "medium",
        label: `${alert.entity?.name || code}: ${(alert.value * 100).toFixed(0)}% connectivity`,
        eventCount: 1,
        lastUpdate: new Date(alert.time * 1000).toISOString(),
        source: "IODA",
      };
    });
  } catch (error) {
    console.error("Outage markers error:", error);
    return [];
  }
}

async function fetchCyberIntelEvents(): Promise<OsintIntelEvent[]> {
  const events: OsintIntelEvent[] = [];

  try {
    // Fetch ransomware victims
    const res = await fetchWithTimeout(
      "https://api.ransomware.live/v1/recentvictims",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    if (res && res.ok) {
      const victims = await res.json();
      for (const victim of victims.slice(0, 15)) {
        events.push({
          id: `RW-${victim.group_name}-${Date.now()}-${Math.random()}`,
          timestamp: victim.discovered,
          category: "cyber",
          severity: "critical",
          title: `Ransomware: ${victim.group_name} claims ${victim.post_title}`,
          summary:
            `${victim.group_name} listed ${victim.post_title} as victim. ${victim.country ? `Country: ${victim.country}` : ""} ${victim.activity ? `Sector: ${victim.activity}` : ""}`.trim(),
          location: victim.country || undefined,
          source: "RANSOMWARE.LIVE",
          status: "active",
          tags: [
            "ransomware",
            victim.group_name,
            victim.country,
            victim.activity,
          ].filter(Boolean),
        });
      }
    }

    // Fetch malware URLs
    const urlhausEventsRes = await fetchWithTimeout(
      "https://urlhaus-api.abuse.ch/v1/urls/recent/limit/30/",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    if (urlhausEventsRes && urlhausEventsRes.ok) {
      const data = await urlhausEventsRes.json();
      const onlineUrls = (data.urls || []).filter(
        (u: { url_status: string }) => u.url_status === "online",
      );

      for (const url of onlineUrls.slice(0, 10)) {
        events.push({
          id: `URLHAUS-${url.id}`,
          timestamp: url.date_added,
          category: "cyber",
          severity: "high",
          title: `Malware URL: ${url.threat || "Unknown threat"}`,
          summary: `Active malware distribution detected. Host: ${url.host}. Tags: ${(url.tags || []).join(", ")}`,
          source: "URLHAUS",
          status: "active",
          tags: ["malware", url.threat, ...(url.tags || [])].filter(Boolean),
        });
      }
    }

    // Fetch botnet C2s
    const feodoEventsRes = await fetchWithTimeout(
      "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
      5000,
    );

    if (feodoEventsRes && feodoEventsRes.ok) {
      const c2s = await feodoEventsRes.json();
      if (Array.isArray(c2s)) {
        for (const c2 of c2s.slice(0, 10)) {
          events.push({
            id: `FEODO-${c2.ip_address}-${c2.port}`,
            timestamp: c2.first_seen,
            category: "cyber",
            severity: c2.status === "online" ? "critical" : "high",
            title: `Botnet C2: ${c2.malware}`,
            summary: `${c2.status === "online" ? "Active" : "Known"} ${c2.malware} C2 server at ${c2.ip_address}:${c2.port}. Country: ${c2.country || "Unknown"}`,
            location: c2.country || undefined,
            source: "FEODO-TRACKER",
            status: "active",
            tags: ["botnet", "c2", c2.malware, c2.country].filter(Boolean),
          });
        }
      }
    }

    // Fetch ThreatFox IOCs for events
    const threatFoxEventsRes = await fetchWithTimeout(
      "https://threatfox-api.abuse.ch/api/v1/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "get_iocs", days: 1 }),
        next: { revalidate: 900 },
      },
      5000,
    );

    if (threatFoxEventsRes && threatFoxEventsRes.ok) {
      const data = await threatFoxEventsRes.json();
      if (data.query_status === "ok" && Array.isArray(data.data)) {
        for (const ioc of data.data.slice(0, 10)) {
          events.push({
            id: `TFOX-${ioc.id}`,
            timestamp: ioc.first_seen_utc || new Date().toISOString(),
            category: "cyber",
            severity: ioc.confidence_level >= 75 ? "critical" : "high",
            title: `IOC: ${ioc.threat_type} - ${ioc.malware_printable || "Unknown"}`,
            summary: `${ioc.ioc_type}: ${ioc.ioc_value?.substring(0, 50)}... Confidence: ${ioc.confidence_level}%`,
            source: "THREATFOX",
            status: "active",
            tags: ["ioc", ioc.threat_type, ioc.malware_printable].filter(
              Boolean,
            ),
          });
        }
      }
    }

    // Fetch MalwareBazaar samples for events
    const bazaarEventsRes = await fetchWithTimeout(
      "https://mb-api.abuse.ch/api/v1/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "get_recent", selector: "10" }),
        next: { revalidate: 900 },
      },
      5000,
    );

    if (bazaarEventsRes && bazaarEventsRes.ok) {
      const data = await bazaarEventsRes.json();
      if (data.query_status === "ok" && Array.isArray(data.data)) {
        for (const sample of data.data.slice(0, 8)) {
          events.push({
            id: `MBAZ-${sample.sha256_hash?.substring(0, 16)}`,
            timestamp: sample.first_seen || new Date().toISOString(),
            category: "cyber",
            severity: "high",
            title: `Malware Sample: ${sample.signature || sample.file_type || "Unknown"}`,
            summary: `New malware sample detected. Type: ${sample.file_type}. ${sample.signature ? `Signature: ${sample.signature}` : ""} SHA256: ${sample.sha256_hash?.substring(0, 32)}...`,
            source: "MALWAREBAZAAR",
            status: "active",
            tags: [
              "malware",
              "sample",
              sample.file_type,
              sample.signature,
            ].filter(Boolean),
          });
        }
      }
    }

    // Sort by timestamp
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return events.slice(0, 40);
  } catch (error) {
    console.error("Cyber intel events error:", error);
    return [];
  }
}

// ===========================================
// Generate Metrics
// ===========================================

function generateOsintMetrics(
  cyber: Awaited<ReturnType<typeof fetchCyberStats>>,
  space: Awaited<ReturnType<typeof fetchSpaceWeatherStats>>,
  infra: Awaited<ReturnType<typeof fetchInfrastructureStats>>,
): OsintMetric[] {
  const metrics: OsintMetric[] = [];

  // Cyber metrics
  metrics.push({
    id: "OSINT-MALWARE",
    label: "Malware URLs",
    value: cyber.malwareUrls,
    unit: "active",
    delta: 0,
    deltaType: cyber.malwareUrls > 50 ? "negative" : "neutral",
    status: cyber.malwareUrls > 50 ? "warning" : "normal",
    category: "cyber",
    icon: "🔗",
  });

  metrics.push({
    id: "OSINT-RANSOM-24H",
    label: "Ransom Victims 24h",
    value: cyber.last24h,
    unit: "",
    delta: cyber.last24h,
    deltaType: cyber.last24h > 5 ? "negative" : "neutral",
    status:
      cyber.last24h > 10
        ? "critical"
        : cyber.last24h > 5
          ? "warning"
          : "normal",
    category: "cyber",
    icon: "💀",
  });

  metrics.push({
    id: "OSINT-BOTNET",
    label: "Botnet C2s",
    value: cyber.botnetC2s,
    unit: "tracked",
    delta: 0,
    deltaType: "neutral",
    status: cyber.botnetC2s > 100 ? "warning" : "normal",
    category: "cyber",
    icon: "🤖",
  });

  // Space weather metrics
  metrics.push({
    id: "OSINT-KP",
    label: "Kp Index",
    value: parseFloat(space.kpIndex.toFixed(1)),
    unit: "",
    delta: 0,
    deltaType:
      space.kpIndex >= 5
        ? "negative"
        : space.kpIndex >= 4
          ? "neutral"
          : "positive",
    status:
      space.kpIndex >= 7
        ? "critical"
        : space.kpIndex >= 5
          ? "warning"
          : "normal",
    category: "space",
    icon: "🌍",
  });

  metrics.push({
    id: "OSINT-SOLAR-WIND",
    label: "Solar Wind",
    value: Math.round(space.solarWindSpeed),
    unit: "km/s",
    delta: 0,
    deltaType: space.solarWindSpeed > 600 ? "negative" : "neutral",
    status:
      space.solarWindSpeed > 800
        ? "critical"
        : space.solarWindSpeed > 600
          ? "warning"
          : "normal",
    category: "space",
    icon: "☀️",
  });

  metrics.push({
    id: "OSINT-GEOMAG",
    label: "Geomag Storm",
    value: space.geomagLevel,
    unit: "G-scale",
    delta: 0,
    deltaType: space.geomagLevel > 0 ? "negative" : "positive",
    status:
      space.geomagLevel >= 4
        ? "critical"
        : space.geomagLevel >= 2
          ? "warning"
          : "normal",
    category: "space",
    icon: "🧲",
  });

  // Infrastructure metrics
  metrics.push({
    id: "OSINT-OUTAGES",
    label: "Net Outages",
    value: infra.outages,
    unit: "detected",
    delta: infra.criticalOutages,
    deltaType: infra.criticalOutages > 0 ? "negative" : "neutral",
    status:
      infra.criticalOutages > 5
        ? "critical"
        : infra.outages > 10
          ? "warning"
          : "normal",
    category: "infrastructure",
    icon: "🌐",
  });

  metrics.push({
    id: "OSINT-SERVICES",
    label: "Services Down",
    value: infra.servicesDown,
    unit: "major",
    delta: infra.servicesDown,
    deltaType: infra.servicesDown > 0 ? "negative" : "positive",
    status: infra.servicesDown > 0 ? "critical" : "normal",
    category: "infrastructure",
    icon: "⚠️",
  });

  // New metrics for additional OSINT sources
  metrics.push({
    id: "OSINT-THREATFOX",
    label: "ThreatFox IOCs",
    value: cyber.threatFoxIocs,
    unit: "24h",
    delta: 0,
    deltaType: cyber.threatFoxIocs > 100 ? "negative" : "neutral",
    status:
      cyber.threatFoxIocs > 200
        ? "critical"
        : cyber.threatFoxIocs > 100
          ? "warning"
          : "normal",
    category: "cyber",
    icon: "🦊",
  });

  metrics.push({
    id: "OSINT-MALWARE-SAMPLES",
    label: "Malware Samples",
    value: cyber.malwareSamples,
    unit: "new",
    delta: 0,
    deltaType: cyber.malwareSamples > 50 ? "negative" : "neutral",
    status: cyber.malwareSamples > 80 ? "warning" : "normal",
    category: "cyber",
    icon: "🧬",
  });

  metrics.push({
    id: "OSINT-PHISHING",
    label: "Phishing URLs",
    value: cyber.phishingUrls,
    unit: "active",
    delta: 0,
    deltaType: cyber.phishingUrls > 10 ? "negative" : "neutral",
    status: cyber.phishingUrls > 20 ? "warning" : "normal",
    category: "cyber",
    icon: "🎣",
  });

  metrics.push({
    id: "OSINT-TOR-EXITS",
    label: "Tor Exit Nodes",
    value: infra.torExitNodes,
    unit: "active",
    delta: 0,
    deltaType: "neutral",
    status: "normal",
    category: "infrastructure",
    icon: "🧅",
  });

  metrics.push({
    id: "OSINT-BGP",
    label: "BGP Withdrawals",
    value: infra.bgpIncidents,
    unit: "1h",
    delta: 0,
    deltaType: infra.bgpIncidents > 50 ? "negative" : "neutral",
    status:
      infra.bgpIncidents > 80
        ? "critical"
        : infra.bgpIncidents > 50
          ? "warning"
          : "normal",
    category: "infrastructure",
    icon: "📡",
  });

  metrics.push({
    id: "OSINT-SPACE-ALERTS",
    label: "Space Alerts",
    value: space.activeAlerts,
    unit: "active",
    delta: 0,
    deltaType: space.activeAlerts > 0 ? "negative" : "positive",
    status:
      space.activeAlerts > 3
        ? "critical"
        : space.activeAlerts > 0
          ? "warning"
          : "normal",
    category: "space",
    icon: "🛰️",
  });

  // New metrics from additional sources
  metrics.push({
    id: "OSINT-OTX-PULSES",
    label: "OTX Pulses",
    value: cyber.otxPulses,
    unit: "threats",
    delta: 0,
    deltaType: cyber.otxPulses > 100 ? "negative" : "neutral",
    status: cyber.otxPulses > 200 ? "warning" : "normal",
    category: "cyber",
    icon: "👽",
  });

  metrics.push({
    id: "OSINT-URL-SCANS",
    label: "URL Scans 24h",
    value: cyber.urlScans,
    unit: "scanned",
    delta: 0,
    deltaType: "neutral",
    status: "normal",
    category: "cyber",
    icon: "🔎",
  });

  metrics.push({
    id: "OSINT-CVE-WEEK",
    label: "New CVEs (7d)",
    value: cyber.activeCves,
    unit: "published",
    delta: 0,
    deltaType: cyber.activeCves > 200 ? "negative" : "neutral",
    status:
      cyber.activeCves > 500
        ? "critical"
        : cyber.activeCves > 200
          ? "warning"
          : "normal",
    category: "cyber",
    icon: "🐛",
  });

  metrics.push({
    id: "OSINT-ISRO-LAUNCHES",
    label: "ISRO Launches",
    value: infra.isroLaunches,
    unit: "successful",
    delta: infra.isroUpcoming,
    deltaType: infra.isroUpcoming > 0 ? "positive" : "neutral",
    status: "normal",
    category: "space",
    icon: "🚀",
  });

  return metrics;
}

// ===========================================
// API Route Handler
// ===========================================

export async function GET() {
  try {
    // Fetch all OSINT data in parallel
    const [cyber, space, infra, ransomMarkers, outageMarkers, intelEvents] =
      await Promise.all([
        fetchCyberStats(),
        fetchSpaceWeatherStats(),
        fetchInfrastructureStats(),
        fetchRansomwareMarkers(),
        fetchOutageMarkers(),
        fetchCyberIntelEvents(),
      ]);

    // Generate metrics
    const metrics = generateOsintMetrics(cyber, space, infra);

    // Combine map markers
    const mapMarkers = [...ransomMarkers, ...outageMarkers];

    // Summary stats
    const summary = {
      totalThreats:
        cyber.malwareUrls +
        cyber.ransomwareVictims +
        cyber.botnetC2s +
        cyber.threatFoxIocs +
        cyber.malwareSamples +
        cyber.otxPulses,
      criticalCount:
        infra.criticalOutages +
        (space.geomagLevel >= 4 ? 1 : 0) +
        cyber.last24h,
      activeOutages: infra.outages,
      spaceWeatherLevel: space.geomagLevel,
      iocCount: cyber.threatFoxIocs,
      malwareSamples: cyber.malwareSamples,
      torExitNodes: infra.torExitNodes,
      newCves: cyber.activeCves,
      urlScans: cyber.urlScans,
      isroLaunches: infra.isroLaunches,
    };

    return NextResponse.json({
      metrics,
      mapMarkers,
      intelEvents,
      summary,
      sources: {
        urlhaus: cyber.malwareUrls > 0,
        ransomware: cyber.ransomwareVictims > 0,
        feodo: cyber.botnetC2s > 0,
        swpc: space.kpIndex > 0,
        ioda: infra.outages >= 0,
        threatfox: cyber.threatFoxIocs > 0,
        malwarebazaar: cyber.malwareSamples > 0,
        tor: infra.torExitNodes > 0,
        otx: cyber.otxPulses > 0,
        urlscan: cyber.urlScans > 0,
        nvd: cyber.activeCves > 0,
        isro: infra.isroLaunches > 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("OSINT API error:", error);
    return NextResponse.json(
      {
        metrics: [],
        mapMarkers: [],
        intelEvents: [],
        summary: {
          totalThreats: 0,
          criticalCount: 0,
          activeOutages: 0,
          spaceWeatherLevel: 0,
          iocCount: 0,
          malwareSamples: 0,
          torExitNodes: 0,
          newCves: 0,
          urlScans: 0,
          isroLaunches: 0,
        },
        sources: {},
        lastUpdated: new Date().toISOString(),
        error: "Failed to fetch OSINT data",
      },
      { status: 500 },
    );
  }
}
