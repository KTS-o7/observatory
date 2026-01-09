// Types for the command-center dashboard

export interface Coordinates {
  lat: number;
  lng: number;
}

export type EventCategory =
  | "military"
  | "political"
  | "economic"
  | "cyber"
  | "intel"
  | "alert";

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export type StatusType = "active" | "monitoring" | "resolved" | "archived";

export interface IntelEvent {
  id: string;
  timestamp: string;
  category: EventCategory;
  severity: SeverityLevel;
  title: string;
  summary: string;
  location?: string;
  coordinates?: Coordinates;
  source: string;
  status: StatusType;
  tags: string[];
  url?: string;
}

export interface MapMarker {
  id: string;
  coordinates: Coordinates;
  type: EventCategory;
  severity: SeverityLevel;
  label: string;
  eventCount: number;
  lastUpdate: string;
}

export interface SystemMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  delta: number;
  deltaType: "positive" | "negative" | "neutral";
  status: "normal" | "warning" | "critical";
}

export interface ThreatLevel {
  region: string;
  level: number;
  trend: "increasing" | "stable" | "decreasing";
  lastUpdated: string;
}

export interface ActiveOperation {
  id: string;
  codename: string;
  status: "active" | "standby" | "complete";
  startTime: string;
  region: string;
  assets: number;
  lastComm: string;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: "primary" | "secondary" | "relay";
  status: "online" | "degraded" | "offline";
  latency: number;
  uptime: number;
}

// ===========================================
// LEGACY MOCK DATA (DEPRECATED)
// These are no longer used by components - all data now comes from live OSINT APIs
// Kept for reference/testing purposes only
// ===========================================

/** @deprecated Use useOsintMetrics() hook instead - fetches live data from /api/osint */
export const mockIntelEvents: IntelEvent[] = [
  {
    id: "EVT-001",
    timestamp: "2024-03-15T14:23:47Z",
    category: "military",
    severity: "high",
    title: "Naval Movement Detected in Sector 7",
    summary:
      "Multiple surface vessels observed conducting exercises near disputed waters. Formation suggests reconnaissance pattern.",
    location: "South China Sea",
    coordinates: { lat: 14.5, lng: 114.3 },
    source: "SIGINT-ALPHA",
    status: "active",
    tags: ["naval", "reconnaissance", "asia-pacific"],
  },
  {
    id: "EVT-002",
    timestamp: "2024-03-15T14:19:22Z",
    category: "cyber",
    severity: "critical",
    title: "Infrastructure Probe Detected",
    summary:
      "Coordinated scanning activity targeting power grid control systems across multiple nodes. Attack signature matches APT-41.",
    location: "Eastern Grid Network",
    source: "CYBERCOM",
    status: "active",
    tags: ["apt", "infrastructure", "critical"],
  },
  {
    id: "EVT-003",
    timestamp: "2024-03-15T14:15:08Z",
    category: "political",
    severity: "medium",
    title: "Emergency Cabinet Session Convened",
    summary:
      "Unscheduled meeting of defense ministers called. Communications blackout in effect.",
    location: "Brussels",
    coordinates: { lat: 50.8503, lng: 4.3517 },
    source: "HUMINT-BRAVO",
    status: "monitoring",
    tags: ["nato", "diplomacy", "europe"],
  },
  {
    id: "EVT-004",
    timestamp: "2024-03-15T14:08:33Z",
    category: "intel",
    severity: "medium",
    title: "Asset Check-In Overdue",
    summary:
      "SNOWFALL has missed scheduled communication window by 4 hours. Contingency protocols initiated.",
    location: "Classified",
    source: "OPERATIONS",
    status: "active",
    tags: ["humint", "priority", "overdue"],
  },
  {
    id: "EVT-005",
    timestamp: "2024-03-15T13:55:17Z",
    category: "economic",
    severity: "low",
    title: "Anomalous Trading Pattern Detected",
    summary:
      "Large-scale short positions opened on defense contractors. Pattern suggests insider knowledge.",
    location: "Global Markets",
    source: "FININT",
    status: "monitoring",
    tags: ["markets", "defense", "suspicious"],
  },
  {
    id: "EVT-006",
    timestamp: "2024-03-15T13:42:55Z",
    category: "alert",
    severity: "high",
    title: "FLASH: Satellite Imagery Update",
    summary:
      "New construction activity observed at known nuclear facility. Analysis indicates centrifuge installation.",
    location: "Natanz Region",
    coordinates: { lat: 33.7242, lng: 51.7275 },
    source: "NRO-GEOINT",
    status: "active",
    tags: ["nuclear", "satellite", "iran"],
  },
  {
    id: "EVT-007",
    timestamp: "2024-03-15T13:31:09Z",
    category: "military",
    severity: "medium",
    title: "Air Defense Radar Activation",
    summary:
      "S-400 battery activated in Kaliningrad region. No corresponding flight activity detected.",
    location: "Kaliningrad Oblast",
    coordinates: { lat: 54.7104, lng: 20.4522 },
    source: "ELINT-GAMMA",
    status: "monitoring",
    tags: ["radar", "russia", "air-defense"],
  },
  {
    id: "EVT-008",
    timestamp: "2024-03-15T13:18:44Z",
    category: "cyber",
    severity: "medium",
    title: "Ransomware Campaign Identified",
    summary:
      "New variant targeting healthcare systems. Attribution pending but tooling matches LAZARUS group.",
    location: "Multiple Regions",
    source: "CISA",
    status: "active",
    tags: ["ransomware", "healthcare", "dprk"],
  },
];

/** @deprecated Use useOsintMetrics() hook instead - fetches live map markers from /api/osint */
export const mockMapMarkers: MapMarker[] = [
  {
    id: "MKR-001",
    coordinates: { lat: 14.5, lng: 114.3 },
    type: "military",
    severity: "high",
    label: "NAVAL-7",
    eventCount: 3,
    lastUpdate: "2024-03-15T14:23:47Z",
  },
  {
    id: "MKR-002",
    coordinates: { lat: 50.8503, lng: 4.3517 },
    type: "political",
    severity: "medium",
    label: "DIPLO-EU",
    eventCount: 1,
    lastUpdate: "2024-03-15T14:15:08Z",
  },
  {
    id: "MKR-003",
    coordinates: { lat: 33.7242, lng: 51.7275 },
    type: "alert",
    severity: "critical",
    label: "NUKE-IR",
    eventCount: 5,
    lastUpdate: "2024-03-15T13:42:55Z",
  },
  {
    id: "MKR-004",
    coordinates: { lat: 54.7104, lng: 20.4522 },
    type: "military",
    severity: "medium",
    label: "AIR-DEF",
    eventCount: 2,
    lastUpdate: "2024-03-15T13:31:09Z",
  },
  {
    id: "MKR-005",
    coordinates: { lat: 38.9072, lng: -77.0369 },
    type: "intel",
    severity: "low",
    label: "HQ-MAIN",
    eventCount: 0,
    lastUpdate: "2024-03-15T14:00:00Z",
  },
  {
    id: "MKR-006",
    coordinates: { lat: 51.5074, lng: -0.1278 },
    type: "intel",
    severity: "low",
    label: "STATION-L",
    eventCount: 1,
    lastUpdate: "2024-03-15T12:45:00Z",
  },
  {
    id: "MKR-007",
    coordinates: { lat: 35.6762, lng: 139.6503 },
    type: "cyber",
    severity: "medium",
    label: "CYBER-AP",
    eventCount: 4,
    lastUpdate: "2024-03-15T13:55:00Z",
  },
  {
    id: "MKR-008",
    coordinates: { lat: -33.8688, lng: 151.2093 },
    type: "economic",
    severity: "low",
    label: "FIN-PAC",
    eventCount: 1,
    lastUpdate: "2024-03-15T11:30:00Z",
  },
];

/** @deprecated Use useOsintMetrics() hook instead - fetches live metrics from /api/osint */
export const mockSystemMetrics: SystemMetric[] = [
  {
    id: "METRIC-001",
    label: "Active Threats",
    value: 47,
    unit: "",
    delta: 12,
    deltaType: "negative",
    status: "warning",
  },
  {
    id: "METRIC-002",
    label: "Network Integrity",
    value: 98.7,
    unit: "%",
    delta: 0.3,
    deltaType: "positive",
    status: "normal",
  },
  {
    id: "METRIC-003",
    label: "Active Assets",
    value: 234,
    unit: "",
    delta: -3,
    deltaType: "neutral",
    status: "normal",
  },
  {
    id: "METRIC-004",
    label: "Data Latency",
    value: 42,
    unit: "ms",
    delta: -8,
    deltaType: "positive",
    status: "normal",
  },
  {
    id: "METRIC-005",
    label: "Critical Alerts",
    value: 3,
    unit: "",
    delta: 2,
    deltaType: "negative",
    status: "critical",
  },
  {
    id: "METRIC-006",
    label: "Intel Reports",
    value: 1847,
    unit: "/24h",
    delta: 156,
    deltaType: "positive",
    status: "normal",
  },
];

/** @deprecated Threat levels now derived from live OSINT data via /api/threats */
export const mockThreatLevels: ThreatLevel[] = [
  {
    region: "INDO-PACIFIC",
    level: 78,
    trend: "increasing",
    lastUpdated: "2024-03-15T14:00:00Z",
  },
  {
    region: "EUROPE-EAST",
    level: 65,
    trend: "stable",
    lastUpdated: "2024-03-15T14:00:00Z",
  },
  {
    region: "MIDDLE-EAST",
    level: 72,
    trend: "increasing",
    lastUpdated: "2024-03-15T14:00:00Z",
  },
  {
    region: "CYBER-GLOBAL",
    level: 84,
    trend: "increasing",
    lastUpdated: "2024-03-15T14:00:00Z",
  },
  {
    region: "AMERICAS",
    level: 23,
    trend: "stable",
    lastUpdated: "2024-03-15T14:00:00Z",
  },
  {
    region: "AFRICA",
    level: 41,
    trend: "decreasing",
    lastUpdated: "2024-03-15T14:00:00Z",
  },
];

/** @deprecated Operations panel now shows live rocket launches from /api/launches */
export const mockActiveOperations: ActiveOperation[] = [
  {
    id: "OP-001",
    codename: "NORTHERN WATCH",
    status: "active",
    startTime: "2024-03-10T00:00:00Z",
    region: "Arctic Circle",
    assets: 12,
    lastComm: "2024-03-15T14:15:00Z",
  },
  {
    id: "OP-002",
    codename: "EASTERN SHIELD",
    status: "active",
    startTime: "2024-02-28T00:00:00Z",
    region: "Baltic Sea",
    assets: 28,
    lastComm: "2024-03-15T14:22:00Z",
  },
  {
    id: "OP-003",
    codename: "SILENT THUNDER",
    status: "standby",
    startTime: "2024-03-01T00:00:00Z",
    region: "Classified",
    assets: 6,
    lastComm: "2024-03-15T13:45:00Z",
  },
  {
    id: "OP-004",
    codename: "PACIFIC GUARDIAN",
    status: "active",
    startTime: "2024-03-05T00:00:00Z",
    region: "Western Pacific",
    assets: 45,
    lastComm: "2024-03-15T14:18:00Z",
  },
];

/** @deprecated Network status now shows live service health from /api/status */
export const mockNetworkNodes: NetworkNode[] = [
  {
    id: "NODE-001",
    name: "CENTCOM-PRIME",
    type: "primary",
    status: "online",
    latency: 12,
    uptime: 99.99,
  },
  {
    id: "NODE-002",
    name: "EUCOM-ALPHA",
    type: "primary",
    status: "online",
    latency: 45,
    uptime: 99.95,
  },
  {
    id: "NODE-003",
    name: "INDOPACOM-MAIN",
    type: "primary",
    status: "online",
    latency: 89,
    uptime: 99.91,
  },
  {
    id: "NODE-004",
    name: "RELAY-NORDIC",
    type: "relay",
    status: "online",
    latency: 67,
    uptime: 99.87,
  },
  {
    id: "NODE-005",
    name: "RELAY-GULF",
    type: "relay",
    status: "degraded",
    latency: 156,
    uptime: 98.23,
  },
  {
    id: "NODE-006",
    name: "BACKUP-EAST",
    type: "secondary",
    status: "online",
    latency: 34,
    uptime: 99.97,
  },
  {
    id: "NODE-007",
    name: "BACKUP-WEST",
    type: "secondary",
    status: "offline",
    latency: 0,
    uptime: 94.12,
  },
  {
    id: "NODE-008",
    name: "RELAY-PACIFIC",
    type: "relay",
    status: "online",
    latency: 112,
    uptime: 99.78,
  },
];

// Utility functions

export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().replace("T", " ").substring(0, 19) + "Z";
}

export function formatTimeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "JUST NOW";
  if (diffMins < 60) return `${diffMins}M AGO`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}H AGO`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}D AGO`;
}

export function getSeverityColor(severity: SeverityLevel): string {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "alert";
    case "medium":
      return "info";
    case "low":
      return "active";
    default:
      return "inactive";
  }
}

export function getCategoryColor(category: EventCategory): string {
  switch (category) {
    case "military":
      return "critical";
    case "political":
      return "info";
    case "economic":
      return "active";
    case "cyber":
      return "cyber-purple";
    case "intel":
      return "cyber-cyan";
    case "alert":
      return "alert";
    default:
      return "inactive";
  }
}

export function generateEventId(): string {
  return `EVT-${String(Date.now()).slice(-6)}`;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
