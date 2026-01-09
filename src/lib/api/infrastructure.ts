// Infrastructure Monitoring API Service for Observatory Dashboard
// Monitors internet health, outages, BGP anomalies, and service status
// Uses FREE APIs: Cloudflare Radar (limited), IODA (Georgia Tech), and public status pages

import { fetchWithCache, getRateLimiter } from "./config";

// ===========================================
// TYPES
// ===========================================

// Internet Outage Detection (IODA)
export interface InternetOutage {
  id: string;
  entityType: "country" | "region" | "asn";
  entityCode: string;
  entityName: string;
  level: "normal" | "warning" | "critical";
  score: number;
  startTime: string;
  endTime: string | null;
  duration: number; // minutes
  datasource: string;
  description: string;
}

export interface IODASignal {
  entityType: string;
  entityCode: string;
  entityName: string;
  datasource: string;
  from: number;
  until: number;
  value: number;
  historyValue: number;
}

export interface IODAEntity {
  type: string;
  code: string;
  name: string;
  attrs: Record<string, unknown>;
}

export interface IODAAlertResponse {
  type: string;
  time: number;
  level: string;
  entity: IODAEntity;
  condition: string;
  method: string;
  value: number;
  historyValue: number;
  datasource: string;
}

// BGP Anomalies
export interface BGPAnomaly {
  id: string;
  type: "hijack" | "leak" | "outage" | "misconfiguration";
  prefix: string;
  asn: number;
  asName: string;
  country: string | null;
  startTime: string;
  endTime: string | null;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedPrefixes: number;
}

// Service Status
export interface ServiceStatus {
  name: string;
  url: string;
  status: "operational" | "degraded" | "partial_outage" | "major_outage" | "unknown";
  latency: number | null;
  lastChecked: string;
  incidents: ServiceIncident[];
}

export interface ServiceIncident {
  id: string;
  title: string;
  status: string;
  impact: string;
  createdAt: string;
  updatedAt: string;
}

// Cloudflare Radar Types
export interface CloudflareRadarAttack {
  id: string;
  name: string;
  value: number;
  timestamp: string;
}

export interface CloudflareRadarTraffic {
  timestamp: string;
  value: number;
  type: string;
}

// Submarine Cable Status
export interface SubmarineCable {
  id: string;
  name: string;
  status: "operational" | "degraded" | "cut" | "maintenance" | "unknown";
  landingPoints: string[];
  owners: string[];
  capacityTbps: number;
  lengthKm: number;
  rfsDate: string; // Ready for service date
  lastIncident: string | null;
}

// Infrastructure Alert
export interface InfrastructureAlert {
  id: string;
  type: "outage" | "bgp_anomaly" | "ddos" | "cable_cut" | "service_degradation";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affectedEntity: string;
  affectedRegion: string | null;
  startTime: string;
  endTime: string | null;
  source: string;
  metadata: Record<string, unknown>;
}

// ===========================================
// API ENDPOINTS
// ===========================================

const IODA_BASE = "https://api.ioda.inetintel.cc.gatech.edu/v2";
const CLOUDFLARE_RADAR_BASE = "https://api.cloudflare.com/client/v4/radar";

// ===========================================
// IODA - Internet Outage Detection & Analysis
// Georgia Tech's Internet Intelligence Lab
// ===========================================

/**
 * Fetch recent internet outage alerts from IODA
 * This API is free and requires no authentication
 */
export async function fetchInternetOutages(
  options: {
    entityType?: "country" | "region" | "asn";
    limit?: number;
    from?: number; // Unix timestamp
    until?: number;
  } = {}
): Promise<InternetOutage[]> {
  try {
    const rateLimiter = getRateLimiter("ioda");
    await rateLimiter.waitForSlot();

    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 24 * 60 * 60;

    const params = new URLSearchParams({
      from: String(options.from || oneDayAgo),
      until: String(options.until || now),
      limit: String(options.limit || 100),
    });

    if (options.entityType) {
      params.set("entityType", options.entityType);
    }

    const url = `${IODA_BASE}/alerts?${params}`;

    const response = await fetchWithCache<{ data: IODAAlertResponse[] }>(
      url,
      { timeout: 15000 },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    if (response.error || !response.data?.data) {
      console.error("IODA error:", response.error);
      return [];
    }

    return response.data.data.map(transformIODAAlert);
  } catch (error) {
    console.error("IODA fetch error:", error);
    return [];
  }
}

/**
 * Fetch outages for a specific country
 */
export async function fetchCountryOutages(countryCode: string): Promise<InternetOutage[]> {
  try {
    const rateLimiter = getRateLimiter("ioda");
    await rateLimiter.waitForSlot();

    const now = Math.floor(Date.now() / 1000);
    const oneWeekAgo = now - 7 * 24 * 60 * 60;

    const url = `${IODA_BASE}/alerts?entityType=country&entityCode=${countryCode}&from=${oneWeekAgo}&until=${now}`;

    const response = await fetchWithCache<{ data: IODAAlertResponse[] }>(
      url,
      { timeout: 15000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data?.data) {
      return [];
    }

    return response.data.data.map(transformIODAAlert);
  } catch (error) {
    console.error("IODA country fetch error:", error);
    return [];
  }
}

/**
 * Get internet health signals for monitored entities
 */
export async function fetchInternetSignals(
  entityType: "country" | "region" | "asn",
  entityCode: string
): Promise<IODASignal[]> {
  try {
    const rateLimiter = getRateLimiter("ioda");
    await rateLimiter.waitForSlot();

    const now = Math.floor(Date.now() / 1000);
    const sixHoursAgo = now - 6 * 60 * 60;

    const url = `${IODA_BASE}/signals/${entityType}/${entityCode}?from=${sixHoursAgo}&until=${now}`;

    const response = await fetchWithCache<{ data: IODASignal[] }>(
      url,
      { timeout: 15000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data?.data) {
      return [];
    }

    return response.data.data;
  } catch (error) {
    console.error("IODA signals fetch error:", error);
    return [];
  }
}

function transformIODAAlert(alert: IODAAlertResponse): InternetOutage {
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
    endTime: null,
    duration,
    datasource: alert.datasource,
    description: `${alert.entity.name} experiencing ${level} connectivity issues. Signal: ${(alert.value * 100).toFixed(1)}% of normal (was ${(alert.historyValue * 100).toFixed(1)}%)`,
  };
}

// ===========================================
// BGP Monitoring (using public data)
// ===========================================

/**
 * Fetch recent BGP anomalies
 * Uses BGPStream data when available
 */
export async function fetchBGPAnomalies(): Promise<BGPAnomaly[]> {
  // BGPStream requires authentication, so we'll use a simulated feed
  // In production, you'd integrate with BGPStream API or RIPE RIS

  // For now, return recent known anomalies from monitoring
  try {
    const rateLimiter = getRateLimiter("bgp");
    await rateLimiter.waitForSlot();

    // Simulate fetching from a BGP monitoring service
    // Real implementation would use RIPE RIS, BGPStream, or similar

    return [];
  } catch (error) {
    console.error("BGP anomalies fetch error:", error);
    return [];
  }
}

// ===========================================
// Major Service Status Monitoring
// ===========================================

// List of major services to monitor via their status pages
const MONITORED_SERVICES = [
  { name: "Cloudflare", statusUrl: "https://www.cloudflarestatus.com/api/v2/status.json" },
  { name: "AWS", statusUrl: "https://status.aws.amazon.com/data.json" },
  { name: "Google Cloud", statusUrl: "https://status.cloud.google.com/incidents.json" },
  { name: "GitHub", statusUrl: "https://www.githubstatus.com/api/v2/status.json" },
  { name: "Fastly", statusUrl: "https://status.fastly.com/api/v2/status.json" },
  { name: "Akamai", statusUrl: "https://cloudharmony.com/status-for-akamai" },
];

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

/**
 * Fetch status from a StatusPage.io compatible endpoint
 */
async function fetchStatusPageStatus(
  name: string,
  statusUrl: string
): Promise<ServiceStatus | null> {
  try {
    const response = await fetchWithCache<StatusPageResponse>(
      statusUrl,
      { timeout: 10000 },
      60 * 1000 // Cache for 1 minute
    );

    if (response.error || !response.data) {
      return {
        name,
        url: statusUrl,
        status: "unknown",
        latency: null,
        lastChecked: new Date().toISOString(),
        incidents: [],
      };
    }

    const data = response.data;

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

    const incidents: ServiceIncident[] = (data.incidents || []).slice(0, 5).map((inc) => ({
      id: inc.id,
      title: inc.name,
      status: inc.status,
      impact: inc.impact,
      createdAt: inc.created_at,
      updatedAt: inc.updated_at,
    }));

    return {
      name,
      url: data.page?.url || statusUrl,
      status,
      latency: null,
      lastChecked: data.page?.updated_at || new Date().toISOString(),
      incidents,
    };
  } catch (error) {
    console.error(`Status fetch error for ${name}:`, error);
    return {
      name,
      url: statusUrl,
      status: "unknown",
      latency: null,
      lastChecked: new Date().toISOString(),
      incidents: [],
    };
  }
}

/**
 * Fetch status for all monitored services
 */
export async function fetchAllServiceStatus(): Promise<ServiceStatus[]> {
  const results = await Promise.all(
    MONITORED_SERVICES.map((service) =>
      fetchStatusPageStatus(service.name, service.statusUrl)
    )
  );

  return results.filter((r): r is ServiceStatus => r !== null);
}

/**
 * Get a summary of service health
 */
export async function getServiceHealthSummary(): Promise<{
  total: number;
  operational: number;
  degraded: number;
  outage: number;
  unknown: number;
  services: ServiceStatus[];
}> {
  const services = await fetchAllServiceStatus();

  const summary = {
    total: services.length,
    operational: 0,
    degraded: 0,
    outage: 0,
    unknown: 0,
    services,
  };

  for (const service of services) {
    switch (service.status) {
      case "operational":
        summary.operational++;
        break;
      case "degraded":
        summary.degraded++;
        break;
      case "partial_outage":
      case "major_outage":
        summary.outage++;
        break;
      default:
        summary.unknown++;
    }
  }

  return summary;
}

// ===========================================
// Submarine Cable Monitoring
// ===========================================

// Major submarine cables to monitor
const MAJOR_CABLES: SubmarineCable[] = [
  {
    id: "marea",
    name: "MAREA",
    status: "operational",
    landingPoints: ["Virginia Beach, USA", "Bilbao, Spain"],
    owners: ["Microsoft", "Meta", "Telxius"],
    capacityTbps: 200,
    lengthKm: 6600,
    rfsDate: "2017-09-01",
    lastIncident: null,
  },
  {
    id: "dunant",
    name: "Dunant",
    status: "operational",
    landingPoints: ["Virginia Beach, USA", "Saint-Hilaire-de-Riez, France"],
    owners: ["Google"],
    capacityTbps: 250,
    lengthKm: 6400,
    rfsDate: "2020-12-01",
    lastIncident: null,
  },
  {
    id: "2africa",
    name: "2Africa",
    status: "operational",
    landingPoints: ["Multiple locations around Africa, Europe, Asia"],
    owners: ["Meta", "Multiple telecom operators"],
    capacityTbps: 180,
    lengthKm: 45000,
    rfsDate: "2023-01-01",
    lastIncident: null,
  },
  {
    id: "sea-me-we-6",
    name: "SEA-ME-WE 6",
    status: "operational",
    landingPoints: ["Singapore", "France", "Multiple Asia/Middle East points"],
    owners: ["Consortium of telecom operators"],
    capacityTbps: 126,
    lengthKm: 19200,
    rfsDate: "2025-01-01",
    lastIncident: null,
  },
  {
    id: "aae-1",
    name: "AAE-1",
    status: "operational",
    landingPoints: ["Hong Kong", "France", "Multiple Asia/Europe points"],
    owners: ["Multiple telecom operators"],
    capacityTbps: 40,
    lengthKm: 25000,
    rfsDate: "2017-07-01",
    lastIncident: null,
  },
];

/**
 * Get submarine cable status
 * Note: Real cable monitoring would require access to NOC data
 */
export async function fetchSubmarineCableStatus(): Promise<SubmarineCable[]> {
  // In production, this would fetch from cable operators' status pages
  // or specialized monitoring services
  return MAJOR_CABLES;
}

/**
 * Get cables by region
 */
export function getCablesByRegion(
  cables: SubmarineCable[],
  region: "atlantic" | "pacific" | "indian" | "mediterranean"
): SubmarineCable[] {
  const regionKeywords: Record<string, string[]> = {
    atlantic: ["USA", "Europe", "France", "Spain", "UK", "Brazil"],
    pacific: ["USA", "Japan", "Australia", "Singapore", "Hong Kong"],
    indian: ["India", "Singapore", "Middle East", "Africa"],
    mediterranean: ["France", "Italy", "Egypt", "Israel", "Spain"],
  };

  const keywords = regionKeywords[region] || [];

  return cables.filter((cable) =>
    cable.landingPoints.some((point) =>
      keywords.some((kw) => point.toLowerCase().includes(kw.toLowerCase()))
    )
  );
}

// ===========================================
// AGGREGATED INFRASTRUCTURE ALERTS
// ===========================================

/**
 * Fetch all infrastructure alerts from various sources
 */
export async function fetchInfrastructureAlerts(
  options: {
    includeOutages?: boolean;
    includeBGP?: boolean;
    includeServices?: boolean;
    includeCables?: boolean;
    limit?: number;
  } = {}
): Promise<InfrastructureAlert[]> {
  const {
    includeOutages = true,
    includeBGP = true,
    includeServices = true,
    includeCables = true,
    limit = 50,
  } = options;

  const alerts: InfrastructureAlert[] = [];
  const promises: Promise<void>[] = [];

  // Fetch internet outages
  if (includeOutages) {
    promises.push(
      fetchInternetOutages({ limit: 30 }).then((outages) => {
        for (const outage of outages) {
          alerts.push(outageToAlert(outage));
        }
      })
    );
  }

  // Fetch BGP anomalies
  if (includeBGP) {
    promises.push(
      fetchBGPAnomalies().then((anomalies) => {
        for (const anomaly of anomalies) {
          alerts.push(bgpAnomalyToAlert(anomaly));
        }
      })
    );
  }

  // Fetch service status
  if (includeServices) {
    promises.push(
      fetchAllServiceStatus().then((services) => {
        for (const service of services) {
          if (service.status !== "operational" && service.status !== "unknown") {
            alerts.push(serviceToAlert(service));
          }
        }
      })
    );
  }

  // Check cable status
  if (includeCables) {
    promises.push(
      fetchSubmarineCableStatus().then((cables) => {
        for (const cable of cables) {
          if (cable.status !== "operational") {
            alerts.push(cableToAlert(cable));
          }
        }
      })
    );
  }

  await Promise.allSettled(promises);

  // Sort by severity and time
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });

  return alerts.slice(0, limit);
}

// ===========================================
// TRANSFORM FUNCTIONS
// ===========================================

function outageToAlert(outage: InternetOutage): InfrastructureAlert {
  let severity: InfrastructureAlert["severity"] = "medium";
  if (outage.level === "critical") severity = "critical";
  else if (outage.level === "warning") severity = "high";

  return {
    id: outage.id,
    type: "outage",
    severity,
    title: `Internet Outage: ${outage.entityName}`,
    description: outage.description,
    affectedEntity: outage.entityName,
    affectedRegion: outage.entityType === "country" ? outage.entityCode : null,
    startTime: outage.startTime,
    endTime: outage.endTime,
    source: "IODA",
    metadata: {
      entityType: outage.entityType,
      entityCode: outage.entityCode,
      score: outage.score,
      datasource: outage.datasource,
    },
  };
}

function bgpAnomalyToAlert(anomaly: BGPAnomaly): InfrastructureAlert {
  return {
    id: anomaly.id,
    type: "bgp_anomaly",
    severity: anomaly.severity,
    title: `BGP ${anomaly.type}: AS${anomaly.asn}`,
    description: anomaly.description,
    affectedEntity: anomaly.asName,
    affectedRegion: anomaly.country,
    startTime: anomaly.startTime,
    endTime: anomaly.endTime,
    source: "BGPStream",
    metadata: {
      prefix: anomaly.prefix,
      asn: anomaly.asn,
      type: anomaly.type,
      affectedPrefixes: anomaly.affectedPrefixes,
    },
  };
}

function serviceToAlert(service: ServiceStatus): InfrastructureAlert {
  let severity: InfrastructureAlert["severity"] = "medium";
  if (service.status === "major_outage") severity = "critical";
  else if (service.status === "partial_outage") severity = "high";
  else if (service.status === "degraded") severity = "medium";

  return {
    id: `SVC-${service.name}-${Date.now()}`,
    type: "service_degradation",
    severity,
    title: `${service.name}: ${service.status.replace("_", " ").toUpperCase()}`,
    description: `${service.name} is experiencing ${service.status.replace("_", " ")}. ${service.incidents.length} active incidents.`,
    affectedEntity: service.name,
    affectedRegion: null,
    startTime: service.incidents[0]?.createdAt || service.lastChecked,
    endTime: null,
    source: "StatusPage",
    metadata: {
      status: service.status,
      incidents: service.incidents,
      url: service.url,
    },
  };
}

function cableToAlert(cable: SubmarineCable): InfrastructureAlert {
  let severity: InfrastructureAlert["severity"] = "medium";
  if (cable.status === "cut") severity = "critical";
  else if (cable.status === "degraded") severity = "high";
  else if (cable.status === "maintenance") severity = "low";

  return {
    id: `CABLE-${cable.id}`,
    type: "cable_cut",
    severity,
    title: `Submarine Cable: ${cable.name} - ${cable.status.toUpperCase()}`,
    description: `${cable.name} connecting ${cable.landingPoints.join(" ↔ ")} is ${cable.status}. Capacity: ${cable.capacityTbps} Tbps.`,
    affectedEntity: cable.name,
    affectedRegion: cable.landingPoints.join(", "),
    startTime: cable.lastIncident || new Date().toISOString(),
    endTime: null,
    source: "Cable Monitor",
    metadata: {
      cableId: cable.id,
      landingPoints: cable.landingPoints,
      owners: cable.owners,
      capacityTbps: cable.capacityTbps,
      lengthKm: cable.lengthKm,
    },
  };
}

// ===========================================
// STATISTICS & SUMMARY
// ===========================================

export interface InfrastructureOverview {
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
  };
  cables: {
    total: number;
    operational: number;
    issues: number;
  };
  lastUpdated: string;
}

/**
 * Get comprehensive infrastructure overview
 */
export async function getInfrastructureOverview(): Promise<InfrastructureOverview> {
  const [outages, serviceHealth, cables] = await Promise.all([
    fetchInternetOutages({ limit: 100 }),
    getServiceHealthSummary(),
    fetchSubmarineCableStatus(),
  ]);

  const outageStats = {
    total: outages.length,
    critical: outages.filter((o) => o.level === "critical").length,
    warning: outages.filter((o) => o.level === "warning").length,
    byRegion: {} as Record<string, number>,
  };

  for (const outage of outages) {
    if (outage.entityType === "country") {
      outageStats.byRegion[outage.entityCode] =
        (outageStats.byRegion[outage.entityCode] || 0) + 1;
    }
  }

  return {
    outages: outageStats,
    services: {
      total: serviceHealth.total,
      operational: serviceHealth.operational,
      degraded: serviceHealth.degraded,
      outage: serviceHealth.outage,
    },
    cables: {
      total: cables.length,
      operational: cables.filter((c) => c.status === "operational").length,
      issues: cables.filter((c) => c.status !== "operational").length,
    },
    lastUpdated: new Date().toISOString(),
  };
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

export function getOutageSeverityColor(level: InternetOutage["level"]): string {
  const colors = {
    normal: "active",
    warning: "alert",
    critical: "critical",
  };
  return colors[level] || "info";
}

export function getServiceStatusColor(status: ServiceStatus["status"]): string {
  const colors = {
    operational: "active",
    degraded: "alert",
    partial_outage: "alert",
    major_outage: "critical",
    unknown: "inactive",
  };
  return colors[status] || "info";
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function getAlertIcon(type: InfrastructureAlert["type"]): string {
  const icons = {
    outage: "🌐",
    bgp_anomaly: "🔀",
    ddos: "⚡",
    cable_cut: "🔌",
    service_degradation: "⚠️",
  };
  return icons[type] || "📡";
}
