// Server-side API route for vulnerability/CVE data
// Uses CVE.CIRCL.LU API - FREE, no authentication required
// Updated to handle CVE 5.x JSON format

import { NextRequest, NextResponse } from "next/server";

// ===========================================
// Types for CVE 5.x format
// ===========================================

interface CVE5Record {
  dataType: string;
  dataVersion: string;
  cveMetadata: {
    cveId: string;
    assignerOrgId: string;
    state: string;
    assignerShortName: string;
    dateReserved?: string;
    datePublished?: string;
    dateUpdated?: string;
    dateRejected?: string;
  };
  containers: {
    cna: {
      title?: string;
      descriptions?: Array<{ lang: string; value: string }>;
      affected?: Array<{
        vendor: string;
        product: string;
        versions?: Array<{ version: string; status: string }>;
      }>;
      problemTypes?: Array<{
        descriptions: Array<{
          type: string;
          cweId?: string;
          lang: string;
          description: string;
        }>;
      }>;
      references?: Array<{ url: string; name?: string; tags?: string[] }>;
      metrics?: Array<{
        cvssV3_1?: {
          version: string;
          vectorString: string;
          baseScore: number;
          baseSeverity: string;
        };
        cvssV4_0?: {
          version: string;
          vectorString: string;
          baseScore: number;
          baseSeverity: string;
        };
      }>;
      rejectedReasons?: Array<{ lang: string; value: string }>;
    };
  };
}

interface Vulnerability {
  id: string;
  cveId: string;
  summary: string;
  cvss: number | null;
  cvssVector: string | null;
  cwe: string | null;
  references: { url: string; source: string }[];
  publishedDate: string;
  lastModified: string;
  affectedProducts: string[];
  severity: "critical" | "high" | "medium" | "low" | "unknown";
}

interface VulnerabilityStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  last24h: number;
}

// ===========================================
// Utility Functions
// ===========================================

function determineSeverity(
  score: number | null,
): "critical" | "high" | "medium" | "low" | "unknown" {
  if (score === null || score === undefined) return "unknown";
  if (score >= 9.0) return "critical";
  if (score >= 7.0) return "high";
  if (score >= 4.0) return "medium";
  return "low";
}

function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes("nvd.nist.gov")) return "NVD";
    if (hostname.includes("github.com")) return "GitHub";
    if (hostname.includes("exploit-db")) return "ExploitDB";
    if (hostname.includes("cve.org")) return "CVE";
    if (hostname.includes("mitre.org")) return "MITRE";
    if (hostname.includes("vuldb.com")) return "VulDB";
    if (hostname.includes("hackerone")) return "H1";
    if (hostname.includes("gitlab")) return "GitLab";
    if (hostname.includes("apache")) return "Apache";
    if (hostname.includes("microsoft")) return "MSFT";
    if (hostname.includes("debian")) return "Debian";
    if (hostname.includes("ubuntu")) return "Ubuntu";
    if (hostname.includes("redhat")) return "RedHat";
    return hostname.split(".")[0].toUpperCase().slice(0, 8);
  } catch {
    return "REF";
  }
}

function transformCVE5(cve: CVE5Record, index: number): Vulnerability | null {
  // Skip rejected CVEs
  if (cve.cveMetadata.state === "REJECTED") {
    return null;
  }

  const cna = cve.containers?.cna;
  if (!cna) return null;

  // Get description
  const description =
    cna.descriptions?.find((d) => d.lang === "en")?.value ||
    cna.title ||
    "No description available";

  // Get CVSS score and vector
  let cvssScore: number | null = null;
  let cvssVector: string | null = null;

  if (cna.metrics && cna.metrics.length > 0) {
    for (const metric of cna.metrics) {
      if (metric.cvssV3_1) {
        cvssScore = metric.cvssV3_1.baseScore;
        cvssVector = metric.cvssV3_1.vectorString;
        break;
      }
      if (metric.cvssV4_0) {
        cvssScore = metric.cvssV4_0.baseScore;
        cvssVector = metric.cvssV4_0.vectorString;
        break;
      }
    }
  }

  // Get CWE
  let cwe: string | null = null;
  if (cna.problemTypes && cna.problemTypes.length > 0) {
    const problemType = cna.problemTypes[0].descriptions?.[0];
    if (problemType?.cweId) {
      cwe = problemType.cweId;
    }
  }

  // Get references
  const references = (cna.references || []).slice(0, 5).map((ref) => ({
    url: ref.url,
    source: extractSource(ref.url),
  }));

  // Get affected products
  const affectedProducts: string[] = [];
  if (cna.affected) {
    for (const affected of cna.affected.slice(0, 5)) {
      const productName = `${affected.vendor}/${affected.product}`;
      affectedProducts.push(productName);
    }
  }

  // Determine severity from CVSS or baseSeverity
  let severity = determineSeverity(cvssScore);
  if (severity === "unknown" && cna.metrics?.[0]?.cvssV3_1?.baseSeverity) {
    const baseSev = cna.metrics[0].cvssV3_1.baseSeverity.toLowerCase();
    if (
      baseSev === "critical" ||
      baseSev === "high" ||
      baseSev === "medium" ||
      baseSev === "low"
    ) {
      severity = baseSev as "critical" | "high" | "medium" | "low";
    }
  }

  return {
    id: String(index + 1),
    cveId: cve.cveMetadata.cveId,
    summary: description.substring(0, 500),
    cvss: cvssScore,
    cvssVector,
    cwe,
    references,
    publishedDate:
      cve.cveMetadata.datePublished ||
      cve.cveMetadata.dateReserved ||
      new Date().toISOString(),
    lastModified:
      cve.cveMetadata.dateUpdated ||
      cve.cveMetadata.datePublished ||
      new Date().toISOString(),
    affectedProducts,
    severity,
  };
}

function computeStats(vulnerabilities: Vulnerability[]): VulnerabilityStats {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const stats: VulnerabilityStats = {
    total: vulnerabilities.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    last24h: 0,
  };

  for (const vuln of vulnerabilities) {
    switch (vuln.severity) {
      case "critical":
        stats.critical++;
        break;
      case "high":
        stats.high++;
        break;
      case "medium":
        stats.medium++;
        break;
      case "low":
        stats.low++;
        break;
    }

    const publishedTime = new Date(vuln.publishedDate).getTime();
    if (!isNaN(publishedTime) && publishedTime > oneDayAgo) {
      stats.last24h++;
    }
  }

  return stats;
}

// ===========================================
// Fetchers
// ===========================================

async function fetchRecentCVEs(limit: number = 30): Promise<Vulnerability[]> {
  try {
    const response = await fetch("https://cve.circl.lu/api/last", {
      headers: {
        Accept: "application/json",
        "User-Agent": "Observatory Dashboard/1.0",
      },
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      console.error("CVE CIRCL API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("CVE CIRCL API returned non-array");
      return [];
    }

    // Transform CVE 5.x records
    const vulnerabilities: Vulnerability[] = [];
    let index = 0;

    for (const cve of data) {
      if (vulnerabilities.length >= limit) break;

      // Check if it's CVE 5.x format
      if (cve.dataType === "CVE_RECORD" && cve.cveMetadata) {
        const vuln = transformCVE5(cve as CVE5Record, index);
        if (vuln) {
          vulnerabilities.push(vuln);
          index++;
        }
      }
    }

    return vulnerabilities;
  } catch (error) {
    console.error("CVE fetch error:", error);
    return [];
  }
}

// ===========================================
// API Route
// ===========================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const severity = searchParams.get("severity");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);

  try {
    // Fetch recent CVEs
    let vulnerabilities = await fetchRecentCVEs(limit * 2); // Fetch more to account for filtering

    // Filter by severity if specified
    if (severity && severity !== "all") {
      vulnerabilities = vulnerabilities.filter((v) => v.severity === severity);
    }

    // Sort by severity (critical first), then by date
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      unknown: 4,
    };

    vulnerabilities.sort((a, b) => {
      // First by severity
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;

      // Then by date (newest first)
      const dateA = new Date(a.publishedDate).getTime();
      const dateB = new Date(b.publishedDate).getTime();
      return dateB - dateA;
    });

    // Limit results
    vulnerabilities = vulnerabilities.slice(0, limit);

    const stats = computeStats(vulnerabilities);

    return NextResponse.json({
      vulnerabilities,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Vulnerabilities API error:", error);

    // Return empty result on error
    return NextResponse.json(
      {
        error: "Failed to fetch vulnerability data",
        vulnerabilities: [],
        stats: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          last24h: 0,
        },
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
