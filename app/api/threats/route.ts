// Server-side API route for threat levels derived from real news/events data
// Analyzes news from different regions to calculate threat levels

import { NextResponse } from "next/server";

// ===========================================
// Types
// ===========================================

interface ThreatLevel {
  region: string;
  level: number;
  trend: "increasing" | "stable" | "decreasing";
  factors: string[];
  lastUpdated: string;
}

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  sourcecountry: string;
  tone: number;
}

// ===========================================
// Region Configuration
// ===========================================

const REGIONS = [
  {
    name: "EUROPE",
    countries: [
      "uk",
      "germany",
      "france",
      "italy",
      "spain",
      "poland",
      "ukraine",
      "russia",
      "netherlands",
      "belgium",
      "sweden",
      "norway",
    ],
    keywords: ["europe", "european", "eu", "nato"],
  },
  {
    name: "MIDDLE EAST",
    countries: [
      "israel",
      "iran",
      "iraq",
      "syria",
      "saudi",
      "yemen",
      "lebanon",
      "jordan",
      "uae",
      "qatar",
      "turkey",
    ],
    keywords: ["middle east", "mideast", "persian gulf"],
  },
  {
    name: "ASIA-PAC",
    countries: [
      "china",
      "japan",
      "korea",
      "taiwan",
      "philippines",
      "vietnam",
      "india",
      "pakistan",
      "indonesia",
      "malaysia",
      "australia",
    ],
    keywords: ["asia", "pacific", "indo-pacific", "south china sea"],
  },
  {
    name: "AMERICAS",
    countries: [
      "us",
      "usa",
      "america",
      "canada",
      "mexico",
      "brazil",
      "argentina",
      "colombia",
      "venezuela",
      "chile",
      "peru",
    ],
    keywords: ["americas", "latin america", "north america", "south america"],
  },
  {
    name: "AFRICA",
    countries: [
      "egypt",
      "nigeria",
      "south africa",
      "kenya",
      "ethiopia",
      "sudan",
      "libya",
      "morocco",
      "algeria",
      "congo",
      "somalia",
    ],
    keywords: ["africa", "african", "sahel", "sub-saharan"],
  },
  {
    name: "CYBER",
    countries: [],
    keywords: [
      "cyber",
      "hack",
      "breach",
      "malware",
      "ransomware",
      "ddos",
      "vulnerability",
      "exploit",
      "data leak",
      "security flaw",
    ],
  },
];

// High-threat keywords that increase threat level
const THREAT_KEYWORDS = {
  critical: [
    "war",
    "invasion",
    "nuclear",
    "attack",
    "missile strike",
    "terrorist",
    "mass casualty",
    "declaration of war",
  ],
  high: [
    "military",
    "troops",
    "conflict",
    "explosion",
    "bombing",
    "casualties",
    "sanctions",
    "escalation",
    "crisis",
    "emergency",
  ],
  medium: [
    "tension",
    "protest",
    "unrest",
    "dispute",
    "warning",
    "threat",
    "deployment",
    "exercise",
    "incident",
  ],
};

// ===========================================
// Data Fetching
// ===========================================

async function fetchGdeltByRegion(region: string): Promise<GdeltArticle[]> {
  try {
    const regionConfig = REGIONS.find((r) => r.name === region);
    if (!regionConfig) return [];

    // Build query from countries and keywords
    const countryTerms = regionConfig.countries.slice(0, 5).join(" OR ");
    const keywordTerms = regionConfig.keywords.join(" OR ");
    const query =
      regionConfig.countries.length > 0
        ? `(${countryTerms}) AND (conflict OR crisis OR military OR attack OR tension)`
        : keywordTerms;

    const params = new URLSearchParams({
      query: query,
      mode: "artlist",
      maxrecords: "30",
      timespan: "24h",
      format: "json",
      sort: "datedesc",
    });

    const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 }, // Cache for 5 minutes
    });

    if (!response.ok) return [];

    // Check if response is JSON by looking at content-type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // GDELT sometimes returns error messages as plain text
      console.warn(`GDELT returned non-JSON for ${region}`);
      return [];
    }

    const text = await response.text();

    // Additional check - make sure it starts with { or [
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.warn(
        `GDELT returned invalid JSON for ${region}: ${text.substring(0, 50)}`,
      );
      return [];
    }

    const data = JSON.parse(text);
    return data.articles || [];
  } catch (error) {
    console.error(`GDELT fetch error for ${region}:`, error);
    return [];
  }
}

// ===========================================
// Threat Analysis
// ===========================================

function analyzeArticles(articles: GdeltArticle[]): {
  level: number;
  factors: string[];
  trend: "increasing" | "stable" | "decreasing";
} {
  if (articles.length === 0) {
    return { level: 15, factors: ["No recent events"], trend: "stable" };
  }

  let threatScore = 0;
  const factors: Set<string> = new Set();
  const tones: number[] = [];

  for (const article of articles) {
    const titleLower = article.title.toLowerCase();
    tones.push(article.tone);

    // Check for critical keywords
    for (const keyword of THREAT_KEYWORDS.critical) {
      if (titleLower.includes(keyword)) {
        threatScore += 15;
        factors.add(keyword.toUpperCase());
      }
    }

    // Check for high-threat keywords
    for (const keyword of THREAT_KEYWORDS.high) {
      if (titleLower.includes(keyword)) {
        threatScore += 8;
        factors.add(keyword.toUpperCase());
      }
    }

    // Check for medium-threat keywords
    for (const keyword of THREAT_KEYWORDS.medium) {
      if (titleLower.includes(keyword)) {
        threatScore += 3;
        factors.add(keyword.toUpperCase());
      }
    }

    // Negative tone increases threat
    if (article.tone < -5) {
      threatScore += 5;
    } else if (article.tone < -2) {
      threatScore += 2;
    }
  }

  // Normalize score to 0-100
  const baseLevel = Math.min(Math.round(threatScore / articles.length) * 3, 95);

  // Add volume factor (more articles = more activity)
  const volumeBonus = Math.min(articles.length * 0.5, 10);

  const level = Math.min(Math.max(baseLevel + volumeBonus, 10), 95);

  // Calculate trend from tone progression
  const avgTone =
    tones.length > 0 ? tones.reduce((a, b) => a + b, 0) / tones.length : 0;
  let trend: "increasing" | "stable" | "decreasing" = "stable";

  if (avgTone < -3 && articles.length > 10) {
    trend = "increasing";
  } else if (avgTone > 0 || articles.length < 5) {
    trend = "decreasing";
  }

  return {
    level: Math.round(level),
    factors: Array.from(factors).slice(0, 5),
    trend,
  };
}

// ===========================================
// API Route Handler
// ===========================================

export async function GET() {
  try {
    const now = new Date().toISOString();

    // Fetch data for all regions in parallel
    const regionPromises = REGIONS.map(async (region) => {
      const articles = await fetchGdeltByRegion(region.name);
      const analysis = analyzeArticles(articles);

      return {
        region: region.name,
        level: analysis.level,
        trend: analysis.trend,
        factors: analysis.factors,
        articleCount: articles.length,
        lastUpdated: now,
      };
    });

    const threats = await Promise.all(regionPromises);

    // Sort by threat level (highest first)
    threats.sort((a, b) => b.level - a.level);

    // Calculate global stats
    const avgLevel = Math.round(
      threats.reduce((sum, t) => sum + t.level, 0) / threats.length,
    );
    const criticalCount = threats.filter((t) => t.level >= 80).length;
    const increasingCount = threats.filter(
      (t) => t.trend === "increasing",
    ).length;

    return NextResponse.json({
      threats,
      summary: {
        avgLevel,
        criticalCount,
        increasingCount,
        totalRegions: threats.length,
      },
      lastUpdated: now,
    });
  } catch (error) {
    console.error("Threats API error:", error);

    // Return fallback data on error
    const fallbackThreats: ThreatLevel[] = REGIONS.map((region) => ({
      region: region.name,
      level: 30 + Math.floor(Math.random() * 30),
      trend: "stable" as const,
      factors: ["Data unavailable"],
      lastUpdated: new Date().toISOString(),
    }));

    return NextResponse.json(
      {
        threats: fallbackThreats,
        summary: {
          avgLevel: 45,
          criticalCount: 0,
          increasingCount: 0,
          totalRegions: fallbackThreats.length,
        },
        lastUpdated: new Date().toISOString(),
        error: "Using fallback data",
      },
      { status: 200 },
    );
  }
}
