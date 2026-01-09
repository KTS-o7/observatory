// Cyber Threat Intelligence API Service for Observatory Dashboard
// Uses FREE APIs: AbuseIPDB (limited), URLhaus, Shodan InternetDB, Ransomware.live
// All endpoints used here require NO authentication

import { fetchWithCache, getRateLimiter } from "./config";

// ===========================================
// TYPES
// ===========================================

// URLhaus - Malware URL Database
export interface MalwareUrl {
  id: string;
  urlhausReference: string;
  url: string;
  urlStatus: "online" | "offline" | "unknown";
  host: string;
  dateAdded: string;
  threat: string;
  blacklists: {
    spamhaus: string;
    surbl: string;
  };
  reporter: string;
  larted: boolean;
  tags: string[];
}

export interface URLhausRecentResponse {
  query_status: string;
  urls: Array<{
    id: string;
    urlhaus_reference: string;
    url: string;
    url_status: string;
    host: string;
    date_added: string;
    threat: string;
    blacklists: {
      spamhaus_dbl: string;
      surbl: string;
    };
    reporter: string;
    larted: string;
    tags: string[];
  }>;
}

// Shodan InternetDB - Fast IP Lookup (no API key needed)
export interface ShodanInternetDBResponse {
  cpes: string[];
  hostnames: string[];
  ip: string;
  ports: number[];
  tags: string[];
  vulns: string[];
}

// ThreatFox - IOC Database
export interface ThreatFoxIOC {
  id: string;
  ioc: string;
  iocType: string;
  iocTypeDesc: string;
  threatType: string;
  threatTypeDesc: string;
  malware: string;
  malwareAlias: string | null;
  malwarePrintable: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string | null;
  reference: string | null;
  reporter: string;
  tags: string[];
}

export interface ThreatFoxResponse {
  query_status: string;
  data: Array<{
    id: string;
    ioc: string;
    ioc_type: string;
    ioc_type_desc: string;
    threat_type: string;
    threat_type_desc: string;
    malware: string;
    malware_alias: string | null;
    malware_printable: string;
    confidence_level: number;
    first_seen: string;
    last_seen: string | null;
    reference: string | null;
    reporter: string;
    tags: string[];
  }>;
}

// Feodo Tracker - Botnet C2 Servers
export interface BotnetC2 {
  id: string;
  ip: string;
  port: number;
  status: "online" | "offline";
  hostname: string | null;
  asNumber: number | null;
  asName: string | null;
  country: string | null;
  firstSeen: string;
  lastOnline: string | null;
  malware: string;
}

export interface FeodoTrackerResponse {
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

// Ransomware.live - Ransomware Group Activity
export interface RansomwareVictim {
  id: string;
  groupName: string;
  victimName: string;
  website: string | null;
  country: string | null;
  sector: string | null;
  discovered: string;
  published: string;
  description: string | null;
  postUrl: string;
}

export interface RansomwareGroup {
  name: string;
  url: string;
  lastActivity: string;
  victimCount: number;
  description: string | null;
}

// Tor Exit Nodes
export interface TorExitNode {
  ip: string;
  lastSeen: string;
}

// Aggregated Cyber Threat
export interface CyberThreat {
  id: string;
  type: "malware_url" | "botnet_c2" | "ransomware" | "ioc" | "tor_exit" | "vulnerability";
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

// ===========================================
// API ENDPOINTS
// ===========================================

const URLHAUS_BASE = "https://urlhaus-api.abuse.ch/v1";
const THREATFOX_BASE = "https://threatfox-api.abuse.ch/api/v1";
const FEODO_BASE = "https://feodotracker.abuse.ch/downloads";
const SHODAN_INTERNETDB = "https://internetdb.shodan.io";
const RANSOMWARE_LIVE_BASE = "https://api.ransomware.live/v1";
const TOR_EXIT_LIST = "https://check.torproject.org/torbulkexitlist";

// ===========================================
// URLhaus - Malware URL Database
// ===========================================

/**
 * Fetch recent malware URLs from URLhaus (last 24h)
 * No rate limit specified, but be respectful
 */
export async function fetchRecentMalwareUrls(limit: number = 100): Promise<MalwareUrl[]> {
  try {
    const rateLimiter = getRateLimiter("urlhaus");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<URLhausRecentResponse>(
      `${URLHAUS_BASE}/urls/recent/limit/${limit}/`,
      { timeout: 15000 },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    if (response.error || !response.data?.urls) {
      console.error("URLhaus error:", response.error);
      return [];
    }

    return response.data.urls.map(transformUrlhausEntry);
  } catch (error) {
    console.error("URLhaus fetch error:", error);
    return [];
  }
}

/**
 * Fetch online malware URLs only
 */
export async function fetchOnlineMalwareUrls(limit: number = 50): Promise<MalwareUrl[]> {
  try {
    const rateLimiter = getRateLimiter("urlhaus");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<URLhausRecentResponse>(
      `${URLHAUS_BASE}/urls/recent/limit/${limit}/`,
      { timeout: 15000 },
      5 * 60 * 1000
    );

    if (response.error || !response.data?.urls) {
      return [];
    }

    return response.data.urls
      .filter((u) => u.url_status === "online")
      .map(transformUrlhausEntry);
  } catch (error) {
    console.error("URLhaus online fetch error:", error);
    return [];
  }
}

/**
 * Get URLhaus statistics
 */
export async function fetchUrlhausStats(): Promise<{
  total: number;
  online: number;
  offline: number;
  byThreat: Record<string, number>;
  byTag: Record<string, number>;
} | null> {
  const urls = await fetchRecentMalwareUrls(500);

  if (urls.length === 0) return null;

  const stats = {
    total: urls.length,
    online: 0,
    offline: 0,
    byThreat: {} as Record<string, number>,
    byTag: {} as Record<string, number>,
  };

  for (const url of urls) {
    if (url.urlStatus === "online") stats.online++;
    else stats.offline++;

    stats.byThreat[url.threat] = (stats.byThreat[url.threat] || 0) + 1;

    for (const tag of url.tags) {
      stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
    }
  }

  return stats;
}

function transformUrlhausEntry(entry: URLhausRecentResponse["urls"][0]): MalwareUrl {
  return {
    id: entry.id,
    urlhausReference: entry.urlhaus_reference,
    url: entry.url,
    urlStatus: entry.url_status as "online" | "offline" | "unknown",
    host: entry.host,
    dateAdded: entry.date_added,
    threat: entry.threat,
    blacklists: {
      spamhaus: entry.blacklists.spamhaus_dbl,
      surbl: entry.blacklists.surbl,
    },
    reporter: entry.reporter,
    larted: entry.larted === "true",
    tags: entry.tags || [],
  };
}

// ===========================================
// Shodan InternetDB - Fast IP Lookup
// ===========================================

/**
 * Look up an IP address in Shodan's InternetDB
 * This is FREE and requires NO API key
 * Returns open ports, vulnerabilities, hostnames, tags
 */
export async function lookupIP(ip: string): Promise<ShodanInternetDBResponse | null> {
  try {
    // Validate IP format
    if (!isValidIP(ip)) {
      console.error("Invalid IP address:", ip);
      return null;
    }

    const response = await fetchWithCache<ShodanInternetDBResponse>(
      `${SHODAN_INTERNETDB}/${ip}`,
      { timeout: 10000 },
      30 * 60 * 1000 // Cache for 30 minutes
    );

    if (response.error || !response.data) {
      // 404 means IP not in database (which is fine)
      if (response.status === 404) {
        return {
          ip,
          cpes: [],
          hostnames: [],
          ports: [],
          tags: [],
          vulns: [],
        };
      }
      console.error("Shodan InternetDB error:", response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Shodan InternetDB fetch error:", error);
    return null;
  }
}

/**
 * Batch lookup multiple IPs
 */
export async function lookupIPs(ips: string[]): Promise<Map<string, ShodanInternetDBResponse>> {
  const results = new Map<string, ShodanInternetDBResponse>();

  // Process in batches of 10 to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    const lookups = await Promise.all(
      batch.map(async (ip) => {
        const result = await lookupIP(ip);
        return { ip, result };
      })
    );

    for (const { ip, result } of lookups) {
      if (result) {
        results.set(ip, result);
      }
    }

    // Small delay between batches
    if (i + batchSize < ips.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Check if an IP has known vulnerabilities
 */
export async function checkIPVulnerabilities(ip: string): Promise<{
  ip: string;
  vulnerable: boolean;
  vulnCount: number;
  vulns: string[];
  openPorts: number[];
  tags: string[];
} | null> {
  const data = await lookupIP(ip);
  if (!data) return null;

  return {
    ip,
    vulnerable: data.vulns.length > 0,
    vulnCount: data.vulns.length,
    vulns: data.vulns,
    openPorts: data.ports,
    tags: data.tags,
  };
}

// ===========================================
// ThreatFox - IOC Database
// ===========================================

/**
 * Fetch recent IOCs from ThreatFox
 * Requires POST request with JSON body
 */
export async function fetchRecentIOCs(days: number = 1): Promise<ThreatFoxIOC[]> {
  try {
    const rateLimiter = getRateLimiter("threatfox");
    await rateLimiter.waitForSlot();

    const response = await fetch(THREATFOX_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "get_iocs",
        days: days,
      }),
    });

    if (!response.ok) {
      console.error("ThreatFox error:", response.status);
      return [];
    }

    const data: ThreatFoxResponse = await response.json();

    if (data.query_status !== "ok" || !data.data) {
      return [];
    }

    return data.data.map(transformThreatFoxIOC);
  } catch (error) {
    console.error("ThreatFox fetch error:", error);
    return [];
  }
}

/**
 * Search ThreatFox for a specific IOC
 */
export async function searchIOC(
  ioc: string,
  type: "ip:port" | "domain" | "url" | "hash"
): Promise<ThreatFoxIOC[]> {
  try {
    const response = await fetch(THREATFOX_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "search_ioc",
        search_term: ioc,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data: ThreatFoxResponse = await response.json();

    if (data.query_status !== "ok" || !data.data) {
      return [];
    }

    return data.data.map(transformThreatFoxIOC);
  } catch (error) {
    console.error("ThreatFox search error:", error);
    return [];
  }
}

function transformThreatFoxIOC(entry: ThreatFoxResponse["data"][0]): ThreatFoxIOC {
  return {
    id: entry.id,
    ioc: entry.ioc,
    iocType: entry.ioc_type,
    iocTypeDesc: entry.ioc_type_desc,
    threatType: entry.threat_type,
    threatTypeDesc: entry.threat_type_desc,
    malware: entry.malware,
    malwareAlias: entry.malware_alias,
    malwarePrintable: entry.malware_printable,
    confidence: entry.confidence_level,
    firstSeen: entry.first_seen,
    lastSeen: entry.last_seen,
    reference: entry.reference,
    reporter: entry.reporter,
    tags: entry.tags || [],
  };
}

// ===========================================
// Feodo Tracker - Botnet C2 Servers
// ===========================================

/**
 * Fetch active botnet C2 servers from Feodo Tracker
 * Uses JSON feed that's updated every 5 minutes
 */
export async function fetchBotnetC2Servers(): Promise<BotnetC2[]> {
  try {
    const rateLimiter = getRateLimiter("feodo");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<FeodoTrackerResponse[]>(
      `${FEODO_BASE}/ipblocklist_recommended.json`,
      { timeout: 15000 },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    if (response.error || !response.data) {
      console.error("Feodo Tracker error:", response.error);
      return [];
    }

    return response.data.map((entry, index) => ({
      id: `FEODO-${index}-${entry.ip_address}`,
      ip: entry.ip_address,
      port: entry.port,
      status: entry.status === "online" ? "online" : "offline",
      hostname: entry.hostname,
      asNumber: entry.as_number,
      asName: entry.as_name,
      country: entry.country,
      firstSeen: entry.first_seen,
      lastOnline: entry.last_online,
      malware: entry.malware,
    }));
  } catch (error) {
    console.error("Feodo Tracker fetch error:", error);
    return [];
  }
}

/**
 * Get botnet statistics
 */
export async function getBotnetStats(): Promise<{
  total: number;
  online: number;
  offline: number;
  byMalware: Record<string, number>;
  byCountry: Record<string, number>;
} | null> {
  const c2s = await fetchBotnetC2Servers();

  if (c2s.length === 0) return null;

  const stats = {
    total: c2s.length,
    online: 0,
    offline: 0,
    byMalware: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
  };

  for (const c2 of c2s) {
    if (c2.status === "online") stats.online++;
    else stats.offline++;

    stats.byMalware[c2.malware] = (stats.byMalware[c2.malware] || 0) + 1;

    if (c2.country) {
      stats.byCountry[c2.country] = (stats.byCountry[c2.country] || 0) + 1;
    }
  }

  return stats;
}

// ===========================================
// Ransomware.live - Ransomware Group Activity
// ===========================================

/**
 * Fetch recent ransomware victims
 */
export async function fetchRansomwareVictims(limit: number = 50): Promise<RansomwareVictim[]> {
  try {
    const rateLimiter = getRateLimiter("ransomware");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<Array<{
      post_title: string;
      group_name: string;
      discovered: string;
      published: string;
      description: string;
      website: string;
      post_url: string;
      country: string;
      activity: string;
    }>>(
      `${RANSOMWARE_LIVE_BASE}/recentvictims`,
      { timeout: 15000 },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    if (response.error || !response.data) {
      console.error("Ransomware.live error:", response.error);
      return [];
    }

    return response.data.slice(0, limit).map((entry, index) => ({
      id: `RW-${index}-${entry.group_name}`,
      groupName: entry.group_name,
      victimName: entry.post_title,
      website: entry.website || null,
      country: entry.country || null,
      sector: entry.activity || null,
      discovered: entry.discovered,
      published: entry.published,
      description: entry.description || null,
      postUrl: entry.post_url,
    }));
  } catch (error) {
    console.error("Ransomware.live fetch error:", error);
    return [];
  }
}

/**
 * Fetch ransomware groups
 */
export async function fetchRansomwareGroups(): Promise<RansomwareGroup[]> {
  try {
    const rateLimiter = getRateLimiter("ransomware");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<Array<{
      name: string;
      url: string;
      last_activity: string;
      victim_count: number;
      description: string;
    }>>(
      `${RANSOMWARE_LIVE_BASE}/groups`,
      { timeout: 15000 },
      30 * 60 * 1000 // Cache for 30 minutes
    );

    if (response.error || !response.data) {
      console.error("Ransomware.live groups error:", response.error);
      return [];
    }

    return response.data.map((entry) => ({
      name: entry.name,
      url: entry.url,
      lastActivity: entry.last_activity,
      victimCount: entry.victim_count || 0,
      description: entry.description || null,
    }));
  } catch (error) {
    console.error("Ransomware.live groups fetch error:", error);
    return [];
  }
}

/**
 * Get ransomware statistics
 */
export async function getRansomwareStats(): Promise<{
  totalVictims: number;
  activeGroups: number;
  byGroup: Record<string, number>;
  byCountry: Record<string, number>;
  bySector: Record<string, number>;
  last24h: number;
  last7d: number;
} | null> {
  const [victims, groups] = await Promise.all([
    fetchRansomwareVictims(200),
    fetchRansomwareGroups(),
  ]);

  if (victims.length === 0) return null;

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const stats = {
    totalVictims: victims.length,
    activeGroups: groups.length,
    byGroup: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
    bySector: {} as Record<string, number>,
    last24h: 0,
    last7d: 0,
  };

  for (const victim of victims) {
    stats.byGroup[victim.groupName] = (stats.byGroup[victim.groupName] || 0) + 1;

    if (victim.country) {
      stats.byCountry[victim.country] = (stats.byCountry[victim.country] || 0) + 1;
    }

    if (victim.sector) {
      stats.bySector[victim.sector] = (stats.bySector[victim.sector] || 0) + 1;
    }

    const discoveredTime = new Date(victim.discovered).getTime();
    if (discoveredTime >= oneDayAgo) stats.last24h++;
    if (discoveredTime >= sevenDaysAgo) stats.last7d++;
  }

  return stats;
}

// ===========================================
// Tor Exit Nodes
// ===========================================

/**
 * Fetch list of Tor exit node IPs
 */
export async function fetchTorExitNodes(): Promise<TorExitNode[]> {
  try {
    const response = await fetchWithCache<string>(
      TOR_EXIT_LIST,
      { timeout: 15000 },
      60 * 60 * 1000 // Cache for 1 hour
    );

    if (response.error || !response.data) {
      console.error("Tor exit list error:", response.error);
      return [];
    }

    const now = new Date().toISOString();
    const lines = response.data.split("\n").filter((line) => line.trim() && !line.startsWith("#"));

    return lines.map((ip) => ({
      ip: ip.trim(),
      lastSeen: now,
    }));
  } catch (error) {
    console.error("Tor exit list fetch error:", error);
    return [];
  }
}

/**
 * Check if an IP is a known Tor exit node
 */
export async function isTorExitNode(ip: string): Promise<boolean> {
  const exitNodes = await fetchTorExitNodes();
  return exitNodes.some((node) => node.ip === ip);
}

// ===========================================
// AGGREGATED CYBER THREAT FEED
// ===========================================

/**
 * Fetch aggregated cyber threat feed from all sources
 */
export async function fetchCyberThreatFeed(
  options: {
    includeMalwareUrls?: boolean;
    includeBotnetC2?: boolean;
    includeRansomware?: boolean;
    includeIOCs?: boolean;
    limit?: number;
  } = {}
): Promise<CyberThreat[]> {
  const {
    includeMalwareUrls = true,
    includeBotnetC2 = true,
    includeRansomware = true,
    includeIOCs = true,
    limit = 100,
  } = options;

  const threats: CyberThreat[] = [];
  const promises: Promise<void>[] = [];

  // Fetch malware URLs
  if (includeMalwareUrls) {
    promises.push(
      fetchOnlineMalwareUrls(30).then((urls) => {
        for (const url of urls) {
          threats.push(malwareUrlToThreat(url));
        }
      })
    );
  }

  // Fetch botnet C2s
  if (includeBotnetC2) {
    promises.push(
      fetchBotnetC2Servers().then((c2s) => {
        for (const c2 of c2s.slice(0, 30)) {
          threats.push(botnetC2ToThreat(c2));
        }
      })
    );
  }

  // Fetch ransomware victims
  if (includeRansomware) {
    promises.push(
      fetchRansomwareVictims(30).then((victims) => {
        for (const victim of victims) {
          threats.push(ransomwareToThreat(victim));
        }
      })
    );
  }

  // Fetch IOCs
  if (includeIOCs) {
    promises.push(
      fetchRecentIOCs(1).then((iocs) => {
        for (const ioc of iocs.slice(0, 30)) {
          threats.push(iocToThreat(ioc));
        }
      })
    );
  }

  await Promise.allSettled(promises);

  // Sort by timestamp (newest first)
  threats.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return threats.slice(0, limit);
}

// ===========================================
// TRANSFORM TO UNIFIED THREAT FORMAT
// ===========================================

function malwareUrlToThreat(url: MalwareUrl): CyberThreat {
  return {
    id: `URLHAUS-${url.id}`,
    type: "malware_url",
    severity: url.urlStatus === "online" ? "high" : "medium",
    title: `Malware URL: ${url.threat}`,
    description: `Active malware distribution URL detected. Host: ${url.host}. Tags: ${url.tags.join(", ")}`,
    indicator: url.url,
    indicatorType: "url",
    source: "URLhaus",
    timestamp: url.dateAdded,
    tags: url.tags,
    metadata: {
      host: url.host,
      threat: url.threat,
      status: url.urlStatus,
      blacklists: url.blacklists,
    },
  };
}

function botnetC2ToThreat(c2: BotnetC2): CyberThreat {
  return {
    id: c2.id,
    type: "botnet_c2",
    severity: c2.status === "online" ? "critical" : "high",
    title: `Botnet C2: ${c2.malware}`,
    description: `${c2.status === "online" ? "Active" : "Known"} ${c2.malware} command & control server. Location: ${c2.country || "Unknown"}`,
    indicator: `${c2.ip}:${c2.port}`,
    indicatorType: "ip:port",
    source: "Feodo Tracker",
    timestamp: c2.firstSeen,
    tags: [c2.malware, c2.country || "unknown"].filter(Boolean),
    metadata: {
      ip: c2.ip,
      port: c2.port,
      status: c2.status,
      asName: c2.asName,
      asNumber: c2.asNumber,
      country: c2.country,
    },
  };
}

function ransomwareToThreat(victim: RansomwareVictim): CyberThreat {
  return {
    id: victim.id,
    type: "ransomware",
    severity: "critical",
    title: `Ransomware: ${victim.groupName} claims ${victim.victimName}`,
    description: `Ransomware group ${victim.groupName} has listed ${victim.victimName} as a victim. ${victim.sector ? `Sector: ${victim.sector}` : ""} ${victim.country ? `Country: ${victim.country}` : ""}`.trim(),
    indicator: victim.victimName,
    indicatorType: "organization",
    source: "Ransomware.live",
    timestamp: victim.discovered,
    tags: [victim.groupName, victim.sector, victim.country].filter(Boolean) as string[],
    metadata: {
      group: victim.groupName,
      website: victim.website,
      sector: victim.sector,
      country: victim.country,
      postUrl: victim.postUrl,
    },
  };
}

function iocToThreat(ioc: ThreatFoxIOC): CyberThreat {
  let severity: CyberThreat["severity"] = "medium";
  if (ioc.confidence >= 90) severity = "critical";
  else if (ioc.confidence >= 70) severity = "high";
  else if (ioc.confidence < 50) severity = "low";

  return {
    id: `THREATFOX-${ioc.id}`,
    type: "ioc",
    severity,
    title: `IOC: ${ioc.malwarePrintable}`,
    description: `${ioc.threatTypeDesc}. ${ioc.iocTypeDesc}. Confidence: ${ioc.confidence}%`,
    indicator: ioc.ioc,
    indicatorType: ioc.iocType,
    source: "ThreatFox",
    timestamp: ioc.firstSeen,
    tags: ioc.tags,
    metadata: {
      malware: ioc.malware,
      malwareAlias: ioc.malwareAlias,
      threatType: ioc.threatType,
      confidence: ioc.confidence,
      reference: ioc.reference,
    },
  };
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function isValidIP(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".").map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  // IPv6 validation (basic)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
}

export function formatThreatSeverity(severity: CyberThreat["severity"]): {
  label: string;
  color: string;
} {
  const config = {
    critical: { label: "CRITICAL", color: "critical" },
    high: { label: "HIGH", color: "alert" },
    medium: { label: "MEDIUM", color: "info" },
    low: { label: "LOW", color: "active" },
  };
  return config[severity];
}

export function getThreatTypeIcon(type: CyberThreat["type"]): string {
  const icons = {
    malware_url: "🔗",
    botnet_c2: "🤖",
    ransomware: "💀",
    ioc: "🎯",
    tor_exit: "🧅",
    vulnerability: "⚠️",
  };
  return icons[type] || "⚡";
}
