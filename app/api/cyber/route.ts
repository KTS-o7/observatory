// Server-side API route for fetching cyber threat intelligence data
// Aggregates data from URLhaus, Feodo Tracker, Ransomware.live, and ThreatFox

import { NextResponse } from "next/server";

// Force dynamic rendering - don't call external APIs at build time
export const dynamic = "force-dynamic";

// ===========================================
// Types
// ===========================================

interface CyberThreat {
  id: string;
  type: "malware_url" | "botnet_c2" | "ransomware" | "ioc";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  indicator: string;
  indicatorType: string;
  source: string;
  timestamp: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

interface MalwareUrl {
  id: string;
  url: string;
  url_status: string;
  host: string;
  date_added: string;
  threat: string;
  tags: string[];
}

interface RansomwareVictim {
  post_title: string;
  group_name: string;
  discovered: string;
  published: string;
  description: string;
  website: string;
  country: string;
  activity: string;
}

interface BotnetC2 {
  ip_address: string;
  port: number;
  status: string;
  hostname: string | null;
  as_number: number | null;
  as_name: string | null;
  country: string | null;
  first_seen: string;
  last_online: string | null;
  malware: string;
}

// ===========================================
// Fetchers
// ===========================================

async function fetchURLhaus(limit: number = 50): Promise<CyberThreat[]> {
  try {
    const response = await fetch(
      `https://urlhaus-api.abuse.ch/v1/urls/recent/limit/${limit}/`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 }, // Cache for 5 minutes
      },
    );

    if (!response.ok) {
      console.error("URLhaus error:", response.status);
      return [];
    }

    const data = await response.json();
    const urls: MalwareUrl[] = data.urls || [];

    return urls
      .filter((u) => u.url_status === "online")
      .slice(0, 30)
      .map((url, index) => ({
        id: `URLHAUS-${url.id || index}`,
        type: "malware_url" as const,
        severity: url.url_status === "online" ? "high" : "medium",
        title: `Malware URL: ${url.threat || "Unknown"}`,
        description: `Active malware distribution URL detected. Host: ${url.host}. Tags: ${(url.tags || []).join(", ")}`,
        indicator: url.url,
        indicatorType: "url",
        source: "URLhaus",
        timestamp: url.date_added,
        tags: url.tags || [],
        metadata: {
          host: url.host,
          threat: url.threat,
          status: url.url_status,
        },
      }));
  } catch (error) {
    console.error("URLhaus fetch error:", error);
    return [];
  }
}

async function fetchRansomware(limit: number = 30): Promise<CyberThreat[]> {
  try {
    const response = await fetch(
      "https://api.ransomware.live/v1/recentvictims",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) {
      console.error("Ransomware.live error:", response.status);
      return [];
    }

    const victims: RansomwareVictim[] = await response.json();

    return victims.slice(0, limit).map((victim, index) => ({
      id: `RW-${index}-${victim.group_name}`,
      type: "ransomware" as const,
      severity: "critical" as const,
      title: `Ransomware: ${victim.group_name} claims ${victim.post_title}`,
      description:
        `Ransomware group ${victim.group_name} has listed ${victim.post_title} as a victim. ${victim.activity ? `Sector: ${victim.activity}` : ""} ${victim.country ? `Country: ${victim.country}` : ""}`.trim(),
      indicator: victim.post_title,
      indicatorType: "organization",
      source: "Ransomware.live",
      timestamp: victim.discovered,
      tags: [victim.group_name, victim.activity, victim.country].filter(
        Boolean,
      ) as string[],
      metadata: {
        group: victim.group_name,
        website: victim.website,
        sector: victim.activity,
        country: victim.country,
      },
    }));
  } catch (error) {
    console.error("Ransomware.live fetch error:", error);
    return [];
  }
}

async function fetchFeodoTracker(): Promise<CyberThreat[]> {
  try {
    const response = await fetch(
      "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) {
      console.error("Feodo Tracker error:", response.status);
      return [];
    }

    const c2servers: BotnetC2[] = await response.json();

    return c2servers.slice(0, 30).map((c2, index) => ({
      id: `FEODO-${index}-${c2.ip_address}`,
      type: "botnet_c2" as const,
      severity: c2.status === "online" ? "critical" : "high",
      title: `Botnet C2: ${c2.malware}`,
      description: `${c2.status === "online" ? "Active" : "Known"} ${c2.malware} command & control server. Location: ${c2.country || "Unknown"}`,
      indicator: `${c2.ip_address}:${c2.port}`,
      indicatorType: "ip:port",
      source: "Feodo Tracker",
      timestamp: c2.first_seen,
      tags: [c2.malware, c2.country || "unknown"].filter(Boolean),
      metadata: {
        ip: c2.ip_address,
        port: c2.port,
        status: c2.status,
        asName: c2.as_name,
        asNumber: c2.as_number,
        country: c2.country,
      },
    }));
  } catch (error) {
    console.error("Feodo Tracker fetch error:", error);
    return [];
  }
}

// ===========================================
// Statistics
// ===========================================

interface CyberStats {
  malwareUrls: { total: number; online: number };
  ransomware: {
    total: number;
    last24h: number;
    byGroup: Record<string, number>;
  };
  botnets: { total: number; online: number; byMalware: Record<string, number> };
}

function computeStats(threats: CyberThreat[]): CyberStats {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const stats: CyberStats = {
    malwareUrls: { total: 0, online: 0 },
    ransomware: { total: 0, last24h: 0, byGroup: {} },
    botnets: { total: 0, online: 0, byMalware: {} },
  };

  for (const threat of threats) {
    if (threat.type === "malware_url") {
      stats.malwareUrls.total++;
      if (threat.severity === "high" || threat.severity === "critical") {
        stats.malwareUrls.online++;
      }
    } else if (threat.type === "ransomware") {
      stats.ransomware.total++;
      const group = (threat.metadata.group as string) || "Unknown";
      stats.ransomware.byGroup[group] =
        (stats.ransomware.byGroup[group] || 0) + 1;

      const threatTime = new Date(threat.timestamp).getTime();
      if (threatTime >= oneDayAgo) {
        stats.ransomware.last24h++;
      }
    } else if (threat.type === "botnet_c2") {
      stats.botnets.total++;
      if (threat.severity === "critical") {
        stats.botnets.online++;
      }
      const malware = threat.tags[0] || "Unknown";
      stats.botnets.byMalware[malware] =
        (stats.botnets.byMalware[malware] || 0) + 1;
    }
  }

  return stats;
}

// ===========================================
// API Route
// ===========================================

export async function GET() {
  try {
    // Fetch from all sources in parallel
    const [malwareUrls, ransomware, botnets] = await Promise.all([
      fetchURLhaus(50),
      fetchRansomware(30),
      fetchFeodoTracker(),
    ]);

    // Combine all threats
    const allThreats = [...malwareUrls, ...ransomware, ...botnets];

    // Sort by severity and timestamp
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    allThreats.sort((a, b) => {
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Compute statistics
    const stats = computeStats(allThreats);

    return NextResponse.json({
      threats: allThreats.slice(0, 100),
      stats,
      sources: {
        urlhaus: malwareUrls.length,
        ransomware: ransomware.length,
        feodo: botnets.length,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cyber API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cyber threat data", threats: [], stats: null },
      { status: 500 },
    );
  }
}
