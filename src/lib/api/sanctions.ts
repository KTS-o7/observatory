// Sanctions & Watchlist API Service for Observatory Dashboard
// Uses OpenSanctions API - FREE for non-commercial use
// Monitors global sanctions lists, PEPs, and wanted persons

import { fetchWithCache, getRateLimiter } from "./config";

// ===========================================
// TYPES
// ===========================================

export interface SanctionedEntity {
  id: string;
  caption: string;
  schema: string; // "Person", "Organization", "Company", etc.
  properties: {
    name?: string[];
    alias?: string[];
    birthDate?: string[];
    nationality?: string[];
    country?: string[];
    address?: string[];
    idNumber?: string[];
    passportNumber?: string[];
    notes?: string[];
    topics?: string[];
    sourceUrl?: string[];
    modifiedAt?: string[];
  };
  datasets: string[];
  referents: string[];
  lastSeen: string;
  firstSeen: string;
  target: boolean;
  score?: number;
}

export interface SanctionSearchResult {
  query: string;
  results: SanctionedEntity[];
  total: number;
  limit: number;
  offset: number;
}

export interface SanctionDataset {
  name: string;
  title: string;
  description: string;
  url: string;
  category: string;
  publisher: {
    name: string;
    country: string;
    url: string;
  };
  entityCount: number;
  lastUpdated: string;
}

export interface SanctionStats {
  totalEntities: number;
  totalDatasets: number;
  bySchema: Record<string, number>;
  byCountry: Record<string, number>;
  recentAdditions: number;
  lastUpdated: string;
}

// OFAC SDN List Types (US Treasury)
export interface OFACEntry {
  uid: string;
  firstName: string;
  lastName: string;
  title: string;
  sdnType: string;
  remarks: string;
  programs: string[];
  akaList: Array<{
    uid: string;
    type: string;
    category: string;
    lastName: string;
    firstName: string;
  }>;
  addressList: Array<{
    uid: string;
    city: string;
    country: string;
    address1: string;
    address2: string;
    stateOrProvince: string;
    postalCode: string;
  }>;
  nationalityList: Array<{
    uid: string;
    country: string;
    mainEntry: boolean;
  }>;
  citizenshipList: Array<{
    uid: string;
    country: string;
    mainEntry: boolean;
  }>;
  idList: Array<{
    uid: string;
    idType: string;
    idNumber: string;
    idCountry: string;
    issueDate: string;
    expirationDate: string;
  }>;
}

// Aggregated Sanctions Alert
export interface SanctionsAlert {
  id: string;
  type: "new_listing" | "update" | "delisting" | "match";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  entity: {
    name: string;
    type: string;
    country: string | null;
  };
  source: string;
  timestamp: string;
  datasets: string[];
  metadata: Record<string, unknown>;
}

// ===========================================
// API ENDPOINTS
// ===========================================

const OPENSANCTIONS_BASE = "https://api.opensanctions.org";
const OFAC_BASE = "https://sanctionslistservice.ofac.treas.gov/api";

// ===========================================
// OpenSanctions API
// Free for non-commercial use, rate limited
// ===========================================

/**
 * Search OpenSanctions database for entities
 * This is the main search endpoint
 */
export async function searchSanctions(
  query: string,
  options: {
    schema?: string; // "Person", "Organization", "Company", "LegalEntity"
    countries?: string[]; // ISO country codes
    datasets?: string[]; // Dataset names to filter by
    limit?: number;
    offset?: number;
  } = {}
): Promise<SanctionSearchResult> {
  try {
    const rateLimiter = getRateLimiter("opensanctions");
    await rateLimiter.waitForSlot();

    const params = new URLSearchParams({
      q: query,
      limit: String(options.limit || 20),
      offset: String(options.offset || 0),
    });

    if (options.schema) {
      params.set("schema", options.schema);
    }

    if (options.countries?.length) {
      options.countries.forEach((c) => params.append("countries", c));
    }

    if (options.datasets?.length) {
      options.datasets.forEach((d) => params.append("datasets", d));
    }

    const url = `${OPENSANCTIONS_BASE}/search/default?${params}`;

    const response = await fetchWithCache<{
      results: Array<{
        id: string;
        caption: string;
        schema: string;
        properties: Record<string, string[]>;
        datasets: string[];
        referents: string[];
        last_seen: string;
        first_seen: string;
        target: boolean;
        score: number;
      }>;
      total: { value: number };
      limit: number;
      offset: number;
    }>(
      url,
      { timeout: 15000 },
      5 * 60 * 1000 // Cache for 5 minutes
    );

    if (response.error || !response.data) {
      console.error("OpenSanctions search error:", response.error);
      return {
        query,
        results: [],
        total: 0,
        limit: options.limit || 20,
        offset: options.offset || 0,
      };
    }

    return {
      query,
      results: response.data.results.map(transformOpenSanctionsEntity),
      total: response.data.total?.value || 0,
      limit: response.data.limit,
      offset: response.data.offset,
    };
  } catch (error) {
    console.error("OpenSanctions search error:", error);
    return {
      query,
      results: [],
      total: 0,
      limit: options.limit || 20,
      offset: options.offset || 0,
    };
  }
}

/**
 * Get entity by ID from OpenSanctions
 */
export async function getEntityById(entityId: string): Promise<SanctionedEntity | null> {
  try {
    const rateLimiter = getRateLimiter("opensanctions");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<{
      id: string;
      caption: string;
      schema: string;
      properties: Record<string, string[]>;
      datasets: string[];
      referents: string[];
      last_seen: string;
      first_seen: string;
      target: boolean;
    }>(
      `${OPENSANCTIONS_BASE}/entities/${entityId}`,
      { timeout: 10000 },
      30 * 60 * 1000 // Cache for 30 minutes
    );

    if (response.error || !response.data) {
      return null;
    }

    return transformOpenSanctionsEntity(response.data);
  } catch (error) {
    console.error("OpenSanctions entity fetch error:", error);
    return null;
  }
}

/**
 * Match a name/entity against sanctions lists
 * Returns potential matches with confidence scores
 */
export async function matchEntity(
  name: string,
  options: {
    birthDate?: string;
    countries?: string[];
    schema?: string;
    threshold?: number; // 0-1, default 0.7
  } = {}
): Promise<SanctionedEntity[]> {
  try {
    const rateLimiter = getRateLimiter("opensanctions");
    await rateLimiter.waitForSlot();

    const body = {
      queries: {
        q1: {
          schema: options.schema || "Thing",
          properties: {
            name: [name],
            ...(options.birthDate ? { birthDate: [options.birthDate] } : {}),
            ...(options.countries?.length ? { country: options.countries } : {}),
          },
        },
      },
    };

    const response = await fetch(`${OPENSANCTIONS_BASE}/match/default`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("OpenSanctions match error:", response.status);
      return [];
    }

    const data = await response.json();
    const results = data.responses?.q1?.results || [];

    const threshold = options.threshold || 0.7;

    return results
      .filter((r: { score: number }) => r.score >= threshold)
      .map((r: {
        id: string;
        caption: string;
        schema: string;
        properties: Record<string, string[]>;
        datasets: string[];
        referents: string[];
        last_seen: string;
        first_seen: string;
        target: boolean;
        score: number;
      }) => ({
        ...transformOpenSanctionsEntity(r),
        score: r.score,
      }));
  } catch (error) {
    console.error("OpenSanctions match error:", error);
    return [];
  }
}

/**
 * Get available datasets from OpenSanctions
 */
export async function getDatasets(): Promise<SanctionDataset[]> {
  try {
    const rateLimiter = getRateLimiter("opensanctions");
    await rateLimiter.waitForSlot();

    const response = await fetchWithCache<{
      datasets: Array<{
        name: string;
        title: string;
        summary: string;
        url: string;
        category: string;
        publisher: {
          name: string;
          country: string;
          url: string;
        };
        entity_count: number;
        last_change: string;
      }>;
    }>(
      `${OPENSANCTIONS_BASE}/datasets`,
      { timeout: 10000 },
      60 * 60 * 1000 // Cache for 1 hour
    );

    if (response.error || !response.data?.datasets) {
      return [];
    }

    return response.data.datasets.map((ds) => ({
      name: ds.name,
      title: ds.title,
      description: ds.summary,
      url: ds.url,
      category: ds.category,
      publisher: ds.publisher,
      entityCount: ds.entity_count,
      lastUpdated: ds.last_change,
    }));
  } catch (error) {
    console.error("OpenSanctions datasets error:", error);
    return [];
  }
}

function transformOpenSanctionsEntity(entity: {
  id: string;
  caption: string;
  schema: string;
  properties: Record<string, string[]>;
  datasets: string[];
  referents: string[];
  last_seen: string;
  first_seen: string;
  target: boolean;
  score?: number;
}): SanctionedEntity {
  return {
    id: entity.id,
    caption: entity.caption,
    schema: entity.schema,
    properties: {
      name: entity.properties.name,
      alias: entity.properties.alias,
      birthDate: entity.properties.birthDate,
      nationality: entity.properties.nationality,
      country: entity.properties.country,
      address: entity.properties.address,
      idNumber: entity.properties.idNumber,
      passportNumber: entity.properties.passportNumber,
      notes: entity.properties.notes,
      topics: entity.properties.topics,
      sourceUrl: entity.properties.sourceUrl,
      modifiedAt: entity.properties.modifiedAt,
    },
    datasets: entity.datasets,
    referents: entity.referents,
    lastSeen: entity.last_seen,
    firstSeen: entity.first_seen,
    target: entity.target,
    score: entity.score,
  };
}

// ===========================================
// MAJOR SANCTIONS LISTS (Static/Preloaded Data)
// ===========================================

// Key sanctions programs
export const SANCTIONS_PROGRAMS = {
  OFAC: {
    name: "OFAC SDN List",
    fullName: "Office of Foreign Assets Control Specially Designated Nationals",
    country: "United States",
    description: "US Treasury sanctions list covering individuals and entities",
    url: "https://sanctionssearch.ofac.treas.gov/",
  },
  UN: {
    name: "UN Security Council",
    fullName: "United Nations Security Council Consolidated List",
    country: "International",
    description: "UN sanctions targeting Al-Qaeda, Taliban, ISIL, and country-specific regimes",
    url: "https://www.un.org/securitycouncil/sanctions/consolidated-list",
  },
  EU: {
    name: "EU Sanctions",
    fullName: "European Union Consolidated Sanctions List",
    country: "European Union",
    description: "EU restrictive measures against individuals and entities",
    url: "https://webgate.ec.europa.eu/fsd/fsf",
  },
  UK: {
    name: "UK Sanctions",
    fullName: "UK Office of Financial Sanctions Implementation",
    country: "United Kingdom",
    description: "UK financial sanctions list",
    url: "https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets",
  },
};

// High-profile sanctioned countries
export const SANCTIONED_COUNTRIES = [
  { code: "RU", name: "Russia", programs: ["OFAC", "EU", "UK", "UN"] },
  { code: "IR", name: "Iran", programs: ["OFAC", "EU", "UK", "UN"] },
  { code: "KP", name: "North Korea", programs: ["OFAC", "EU", "UK", "UN"] },
  { code: "SY", name: "Syria", programs: ["OFAC", "EU", "UK"] },
  { code: "CU", name: "Cuba", programs: ["OFAC"] },
  { code: "VE", name: "Venezuela", programs: ["OFAC", "EU"] },
  { code: "BY", name: "Belarus", programs: ["OFAC", "EU", "UK"] },
  { code: "MM", name: "Myanmar", programs: ["OFAC", "EU", "UK", "UN"] },
];

// ===========================================
// AGGREGATED SANCTIONS DATA
// ===========================================

/**
 * Get sanctions statistics
 */
export async function getSanctionsStats(): Promise<SanctionStats | null> {
  try {
    const datasets = await getDatasets();

    if (datasets.length === 0) {
      return null;
    }

    const totalEntities = datasets.reduce((sum, ds) => sum + ds.entityCount, 0);

    return {
      totalEntities,
      totalDatasets: datasets.length,
      bySchema: {}, // Would need additional API calls
      byCountry: {}, // Would need additional API calls
      recentAdditions: 0, // Would need additional API calls
      lastUpdated: datasets
        .map((ds) => ds.lastUpdated)
        .sort()
        .reverse()[0] || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Sanctions stats error:", error);
    return null;
  }
}

/**
 * Search for entities across multiple criteria
 */
export async function comprehensiveSanctionsSearch(
  query: string
): Promise<{
  persons: SanctionedEntity[];
  organizations: SanctionedEntity[];
  vessels: SanctionedEntity[];
  aircraft: SanctionedEntity[];
  total: number;
}> {
  const [persons, organizations] = await Promise.all([
    searchSanctions(query, { schema: "Person", limit: 20 }),
    searchSanctions(query, { schema: "Organization", limit: 20 }),
  ]);

  // Vessels and aircraft would need additional schema searches
  // OpenSanctions has "Vessel" and "Airplane" schemas

  return {
    persons: persons.results,
    organizations: organizations.results,
    vessels: [],
    aircraft: [],
    total: persons.total + organizations.total,
  };
}

/**
 * Check if a name appears on any major sanctions list
 * Returns true if a high-confidence match is found
 */
export async function isEntitySanctioned(
  name: string,
  options: {
    birthDate?: string;
    countries?: string[];
  } = {}
): Promise<{
  sanctioned: boolean;
  matches: SanctionedEntity[];
  confidence: number;
}> {
  const matches = await matchEntity(name, {
    ...options,
    threshold: 0.8, // High threshold for definitive match
  });

  const highConfidenceMatches = matches.filter((m) => (m.score || 0) >= 0.9);

  return {
    sanctioned: highConfidenceMatches.length > 0,
    matches,
    confidence: matches.length > 0 ? Math.max(...matches.map((m) => m.score || 0)) : 0,
  };
}

/**
 * Generate sanctions alerts from recent updates
 */
export async function generateSanctionsAlerts(
  searchTerms: string[]
): Promise<SanctionsAlert[]> {
  const alerts: SanctionsAlert[] = [];

  for (const term of searchTerms) {
    const results = await searchSanctions(term, { limit: 5 });

    for (const entity of results.results) {
      alerts.push({
        id: `SANCTION-${entity.id}`,
        type: "match",
        severity: entity.target ? "high" : "medium",
        title: `Sanctions Match: ${entity.caption}`,
        description: `Entity "${entity.caption}" found in sanctions databases: ${entity.datasets.join(", ")}`,
        entity: {
          name: entity.caption,
          type: entity.schema,
          country: entity.properties.country?.[0] || null,
        },
        source: "OpenSanctions",
        timestamp: entity.lastSeen,
        datasets: entity.datasets,
        metadata: {
          score: entity.score,
          firstSeen: entity.firstSeen,
          topics: entity.properties.topics,
        },
      });
    }
  }

  return alerts;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

export function getEntityTypeLabel(schema: string): string {
  const labels: Record<string, string> = {
    Person: "Individual",
    Organization: "Organization",
    Company: "Company",
    LegalEntity: "Legal Entity",
    Vessel: "Vessel/Ship",
    Airplane: "Aircraft",
    Sanction: "Sanction Entry",
    CryptoWallet: "Crypto Wallet",
    Security: "Security/Stock",
  };
  return labels[schema] || schema;
}

export function getSanctionsDatasetInfo(datasetName: string): {
  fullName: string;
  country: string;
  severity: "high" | "medium" | "low";
} {
  const datasetInfo: Record<string, { fullName: string; country: string; severity: "high" | "medium" | "low" }> = {
    us_ofac_sdn: { fullName: "US OFAC SDN List", country: "United States", severity: "high" },
    us_ofac_cons: { fullName: "US OFAC Consolidated List", country: "United States", severity: "high" },
    eu_fsf: { fullName: "EU Financial Sanctions", country: "European Union", severity: "high" },
    un_sc_sanctions: { fullName: "UN Security Council Sanctions", country: "International", severity: "high" },
    gb_hmt_sanctions: { fullName: "UK HMT Sanctions", country: "United Kingdom", severity: "high" },
    interpol_red: { fullName: "Interpol Red Notices", country: "International", severity: "high" },
    ru_rupep: { fullName: "Russian PEPs Database", country: "Russia", severity: "medium" },
    ua_nsdc_sanctions: { fullName: "Ukraine NSDC Sanctions", country: "Ukraine", severity: "medium" },
    peps: { fullName: "Politically Exposed Persons", country: "International", severity: "medium" },
  };

  return datasetInfo[datasetName] || {
    fullName: datasetName,
    country: "Unknown",
    severity: "low" as const,
  };
}

export function formatEntityForDisplay(entity: SanctionedEntity): {
  name: string;
  type: string;
  country: string;
  birthDate: string;
  aliases: string[];
  datasets: string[];
  summary: string;
} {
  const names = entity.properties.name || [entity.caption];
  const aliases = entity.properties.alias || [];
  const countries = entity.properties.country || entity.properties.nationality || [];
  const birthDates = entity.properties.birthDate || [];

  return {
    name: names[0] || entity.caption,
    type: getEntityTypeLabel(entity.schema),
    country: countries.join(", ") || "Unknown",
    birthDate: birthDates[0] || "Unknown",
    aliases: aliases.slice(0, 5),
    datasets: entity.datasets.map((ds) => getSanctionsDatasetInfo(ds).fullName),
    summary: entity.properties.notes?.[0] || `${entity.schema} on ${entity.datasets.length} sanctions list(s)`,
  };
}

export function calculateSanctionsRisk(entity: SanctionedEntity): {
  level: "low" | "medium" | "high" | "critical";
  score: number;
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  // Score based on number of datasets
  if (entity.datasets.length >= 5) {
    score += 40;
    factors.push("Listed on 5+ sanctions databases");
  } else if (entity.datasets.length >= 3) {
    score += 30;
    factors.push("Listed on multiple sanctions databases");
  } else if (entity.datasets.length >= 1) {
    score += 20;
    factors.push("Listed on sanctions database");
  }

  // Score based on dataset severity
  const hasHighSeverity = entity.datasets.some((ds) => {
    const info = getSanctionsDatasetInfo(ds);
    return info.severity === "high";
  });

  if (hasHighSeverity) {
    score += 30;
    factors.push("On high-priority sanctions list (OFAC/EU/UN)");
  }

  // Score based on target status
  if (entity.target) {
    score += 20;
    factors.push("Primary target (not just associated)");
  }

  // Score based on match confidence
  if (entity.score && entity.score >= 0.95) {
    score += 10;
    factors.push("Very high match confidence");
  }

  let level: "low" | "medium" | "high" | "critical" = "low";
  if (score >= 80) level = "critical";
  else if (score >= 60) level = "high";
  else if (score >= 40) level = "medium";

  return { level, score, factors };
}
