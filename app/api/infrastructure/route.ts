// Server-side API route for fetching infrastructure monitoring data
// Uses IODA (Internet Outage Detection & Analysis) and service status pages

import { NextResponse } from "next/server";

// ===========================================
// Types
// ===========================================

interface InternetOutage {
  id: string;
  entityType: "country" | "region" | "asn";
  entityCode: string;
  entityName: string;
  level: "normal" | "warning" | "critical";
  score: number;
  startTime: string;
  duration: number;
  datasource: string;
  description: string;
}

interface ServiceStatus {
  name: string;
  url: string;
  status: "operational" | "degraded" | "partial_outage" | "major_outage" | "unknown";
  lastChecked: string;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string;
    createdAt: string;
  }>;
}

interface InfrastructureAlert {
  id: string;
  type: "outage" | "service_degradation" | "bgp_anomaly";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affectedEntity: string;
  affectedRegion: string | null;
  startTime: string;
  source: string;
}

interface IODAAlert {
  type: string;
  time: number;
  level: string;
  entity: {
    type: string;
    code: string;
    name: string;
  };
  value: number;
  historyValue: number;
  datasource: string;
}

interface StatusPageResponse {
  status?: {
    indicator: string;
    description: string;
  };
  page?: {
    name: string;
    url: string;
    updated_at: string;
  };
  incidents?: Array<{
    id: string;
    name: string;
    status: string;
    impact: string;
    created_at: string;
    updated_at: string;
  }>;
}

// ===========================================
// Service Status Pages to Monitor
// ===========================================

const STATUS_PAGES = [
  { name: "Cloudflare", url: "https://www.cloudflarestatus.com/api/v2/status.json" },
  { name: "GitHub", url: "https://www.githubstatus.com/api/v2/status.json" },
  { name: "Fastly", url: "https://status.fastly.com/api/v2/status.json" },
  { name: "Discord", url: "https://discordstatus.com/api/v2/status.json" },
  { name: "Vercel", url: "https://www.vercel-status.com/api/v2/status.json" },
];

// ===========================================
// Fetchers
// ===========================================

async function fetchIODAOutages(): Promise<InternetOutage[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 24 * 60 * 60;

    const response = await fetch(
      `https://api.ioda.inetintel.cc.gatech.edu/v2/alerts?from=${oneDayAgo}&until=${now}&limit=50`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      console.error("IODA error:", response.status);
      return [];
    }

    const data = await response.json();
    const alerts: IODAAlert[] = data.data || [];

    return alerts.map((alert) => {
      const duration = alert.time ? Math.floor((Date.now() / 1000 - alert.time) / 60) : 0;

      let level: InternetOutage["level"] = "normal";
      if (alert.level === "critical" || alert.value < 0.3) {
        level = "critical";
      } else if (alert.level === "warning" || alert.value < 0.7) {
        level = "warning";
      }

      return {
        id: `IODA-${alert.entity.type}-${alert.entity.code}-${alert.time}`,
        entityType: alert.entity.type as "country" | "region" | "asn",
        entityCode: alert.entity.code,
        entityName: alert.entity.name,
        level,
        score: alert.value,
        startTime: new Date(alert.time * 1000).toISOString(),
        duration,
        datasource: alert.datasource,
        description: `${alert.entity.name} experiencing ${level} connectivity issues. Signal: ${(alert.value * 100).toFixed(1)}% of normal`,
      };
    });
  } catch (error) {
    console.error("IODA fetch error:", error);
    return [];
  }
}

async function fetchServiceStatus(
  name: string,
  statusUrl: string
): Promise<ServiceStatus> {
  try {
    const response = await fetch(statusUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // Cache for 1 minute
    });

    if (!response.ok) {
      return {
        name,
        url: statusUrl,
        status: "unknown",
        lastChecked: new Date().toISOString(),
        incidents: [],
      };
    }

    const data: StatusPageResponse = await response.json();

    let status: ServiceStatus["status"] = "operational";
    if (data.status?.indicator) {
      const indicator = data.status.indicator.toLowerCase();
      if (indicator === "none" || indicator === "operational") {
        status = "operational";
      } else if (indicator === "minor" || indicator === "degraded") {
        status = "degraded";
      } else if (indicator === "major") {
        status = "partial_outage";
      } else if (indicator === "critical") {
        status = "major_outage";
      }
    }

    const incidents = (data.incidents || []).slice(0, 5).map((inc) => ({
      id: inc.id,
      title: inc.name,
      status: inc.status,
      impact: inc.impact,
      createdAt: inc.created_at,
    }));

    return {
      name,
      url: data.page?.url || statusUrl,
      status,
      lastChecked: data.page?.updated_at || new Date().toISOString(),
      incidents,
    };
  } catch (error) {
    console.error(`Status fetch error for ${name}:`, error);
    return {
      name,
      url: statusUrl,
      status: "unknown",
      lastChecked: new Date().toISOString(),
      incidents: [],
    };
  }
}

async function fetchAllServiceStatus(): Promise<ServiceStatus[]> {
  const results = await Promise.all(
    STATUS_PAGES.map((service) => fetchServiceStatus(service.name, service.url))
  );
  return results;
}

// ===========================================
// Alert Generation
// ===========================================

function generateAlerts(
  outages: InternetOutage[],
  services: ServiceStatus[]
): InfrastructureAlert[] {
  const alerts: InfrastructureAlert[] = [];

  // Convert outages to alerts
  for (const outage of outages) {
    let severity: InfrastructureAlert["severity"] = "medium";
    if (outage.level === "critical") severity = "critical";
    else if (outage.level === "warning") severity = "high";

    alerts.push({
      id: outage.id,
      type: "outage",
      severity,
      title: `Internet Outage: ${outage.entityName}`,
      description: outage.description,
      affectedEntity: outage.entityName,
      affectedRegion: outage.entityType === "country" ? outage.entityCode : null,
      startTime: outage.startTime,
      source: "IODA",
    });
  }

  // Convert service issues to alerts
  for (const service of services) {
    if (service.status !== "operational" && service.status !== "unknown") {
      let severity: InfrastructureAlert["severity"] = "medium";
      if (service.status === "major_outage") severity = "critical";
      else if (service.status === "partial_outage") severity = "high";

      alerts.push({
        id: `SVC-${service.name}-${Date.now()}`,
        type: "service_degradation",
        severity,
        title: `${service.name}: ${service.status.replace("_", " ").toUpperCase()}`,
        description: `${service.name} is experiencing ${service.status.replace("_", " ")}. ${service.incidents.length} active incidents.`,
        affectedEntity: service.name,
        affectedRegion: null,
        startTime: service.incidents[0]?.createdAt || service.lastChecked,
        source: "StatusPage",
      });
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  return alerts;
}

// ===========================================
// Statistics
// ===========================================

interface InfrastructureStats {
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
}

function computeStats(
  outages: InternetOutage[],
  services: ServiceStatus[]
): InfrastructureStats {
  const stats: InfrastructureStats = {
    outages: {
      total: outages.length,
      critical: outages.filter((o) => o.level === "critical").length,
      warning: outages.filter((o) => o.level === "warning").length,
      byRegion: {},
    },
    services: {
      total: services.length,
      operational: 0,
      degraded: 0,
      outage: 0,
      unknown: 0,
    },
  };

  for (const outage of outages) {
    if (outage.entityType === "country") {
      stats.outages.byRegion[outage.entityCode] =
        (stats.outages.byRegion[outage.entityCode] || 0) + 1;
    }
  }

  for (const service of services) {
    switch (service.status) {
      case "operational":
        stats.services.operational++;
        break;
      case "degraded":
        stats.services.degraded++;
        break;
      case "partial_outage":
      case "major_outage":
        stats.services.outage++;
        break;
      default:
        stats.services.unknown++;
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
    const [outages, services] = await Promise.all([
      fetchIODAOutages(),
      fetchAllServiceStatus(),
    ]);

    // Generate unified alerts
    const alerts = generateAlerts(outages, services);

    // Compute statistics
    const stats = computeStats(outages, services);

    return NextResponse.json({
      alerts: alerts.slice(0, 50),
      outages,
      services,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Infrastructure API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch infrastructure data",
        alerts: [],
        outages: [],
        services: [],
        stats: null,
      },
      { status: 500 }
    );
  }
}
