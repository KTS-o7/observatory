// Server-side API route for fetching intel feed data
// This avoids CORS issues by fetching from server

import { NextResponse } from "next/server";

// Force dynamic rendering - don't call external APIs at build time
export const dynamic = "force-dynamic";

// GDELT API
async function fetchGdeltNews(
  query: string = "conflict OR crisis OR military",
  maxRecords: number = 25,
): Promise<GdeltArticle[]> {
  try {
    const params = new URLSearchParams({
      query: query,
      mode: "artlist",
      maxrecords: String(maxRecords),
      timespan: "1d",
      format: "json",
      sort: "datedesc",
    });

    const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 }, // Cache for 2 minutes
    });

    if (!response.ok) {
      console.error("GDELT error:", response.status);
      return [];
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("GDELT returned non-JSON response");
      return [];
    }

    const text = await response.text();

    // Additional check - make sure it starts with { or [
    if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
      console.warn(`GDELT returned invalid JSON: ${text.substring(0, 50)}`);
      return [];
    }

    const data = JSON.parse(text);
    return data.articles || [];
  } catch (error) {
    console.error("GDELT fetch error:", error);
    return [];
  }
}

// Hacker News API
async function fetchHackerNews(limit: number = 15): Promise<HNItem[]> {
  try {
    const response = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
      { next: { revalidate: 600 } },
    );

    if (!response.ok) return [];

    const storyIds: number[] = await response.json();
    const topIds = storyIds.slice(0, limit);

    const stories = await Promise.all(
      topIds.map(async (id) => {
        const res = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { next: { revalidate: 600 } },
        );
        return res.ok ? res.json() : null;
      }),
    );

    return stories.filter((s): s is HNItem => s !== null && s.type === "story");
  } catch (error) {
    console.error("HN fetch error:", error);
    return [];
  }
}

// Reddit API
async function fetchRedditNews(
  subreddit: string = "worldnews",
  limit: number = 15,
): Promise<RedditPost[]> {
  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`,
      {
        headers: { "User-Agent": "Observatory Dashboard/1.0" },
        next: { revalidate: 600 },
      },
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.data?.children || [];
  } catch (error) {
    console.error("Reddit fetch error:", error);
    return [];
  }
}

// Types
interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  sourcecountry: string;
  tone: number;
}

interface HNItem {
  id: number;
  title: string;
  url?: string;
  by: string;
  time: number;
  score: number;
  descendants?: number;
  type: string;
}

interface RedditPost {
  data: {
    id: string;
    title: string;
    author: string;
    subreddit: string;
    score: number;
    created_utc: number;
    permalink: string;
    num_comments: number;
    domain: string;
  };
}

interface IntelEvent {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  source: string;
  status: string;
  tags: string[];
  url?: string;
}

// Transform functions
function parseGdeltDate(dateStr: string): string {
  if (dateStr && dateStr.length === 14) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const min = dateStr.substring(10, 12);
    const sec = dateStr.substring(12, 14);
    return `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
  }
  return new Date().toISOString();
}

function mapToCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/military|army|navy|defense|weapon|war|troops/.test(lower))
    return "military";
  if (/cyber|hack|breach|malware|security|vulnerability/.test(lower))
    return "cyber";
  if (/politic|government|election|president|minister/.test(lower))
    return "political";
  if (/economy|market|stock|trade|inflation|finance/.test(lower))
    return "economic";
  if (/earthquake|hurricane|flood|wildfire|disaster|emergency/.test(lower))
    return "alert";
  return "intel";
}

function inferSeverity(tone: number): string {
  if (tone <= -5) return "critical";
  if (tone <= -2) return "high";
  if (tone <= 0) return "medium";
  return "low";
}

function scoreSeverity(score: number, thresholds: number[]): string {
  if (score >= thresholds[0]) return "critical";
  if (score >= thresholds[1]) return "high";
  if (score >= thresholds[2]) return "medium";
  return "low";
}

function cleanTitle(title: string): string {
  return title
    .replace(/^\[.*?\]\s*/, "")
    .replace(/^BREAKING:\s*/i, "")
    .replace(/^UPDATE:\s*/i, "")
    .trim()
    .substring(0, 200);
}

function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  const patterns: Record<string, RegExp> = {
    military: /military|army|navy|defense|weapon/,
    cyber: /cyber|hack|breach|malware|security/,
    political: /politic|government|election|diplomat/,
    economic: /economy|market|trade|inflation/,
    climate: /climate|environment|emission|warming/,
    health: /health|pandemic|virus|disease|covid/,
    tech: /tech|ai|artificial intelligence|software/,
    crypto: /crypto|bitcoin|ethereum|blockchain/,
    conflict: /war|conflict|attack|strike/,
  };

  for (const [tag, pattern] of Object.entries(patterns)) {
    if (pattern.test(lower)) tags.push(tag);
  }
  return tags.slice(0, 5);
}

function transformGdelt(article: GdeltArticle, index: number): IntelEvent {
  return {
    id: `GDELT-${Date.now()}-${index}`,
    timestamp: parseGdeltDate(article.seendate),
    category: mapToCategory(article.title),
    severity: inferSeverity(article.tone),
    title: cleanTitle(article.title),
    summary: `Source: ${article.domain} | Country: ${article.sourcecountry || "Unknown"} | Tone: ${article.tone?.toFixed(1) || "N/A"}`,
    source: `GDELT/${article.domain?.toUpperCase().substring(0, 12) || "NEWS"}`,
    status: "active",
    tags: extractTags(article.title),
    url: article.url,
  };
}

function transformHN(item: HNItem): IntelEvent {
  const category = mapToCategory(item.title);
  return {
    id: `HN-${item.id}`,
    timestamp: new Date(item.time * 1000).toISOString(),
    category: category === "intel" ? "cyber" : category,
    severity: scoreSeverity(item.score, [500, 200, 50]),
    title: item.title,
    summary: `Score: ${item.score} | Comments: ${item.descendants || 0} | By: ${item.by}`,
    source: "HACKER-NEWS",
    status: "active",
    tags: ["tech", "hn", ...extractTags(item.title)],
    url: item.url,
  };
}

function transformReddit(post: RedditPost, subreddit: string): IntelEvent {
  const data = post.data;
  return {
    id: `REDDIT-${data.id}`,
    timestamp: new Date(data.created_utc * 1000).toISOString(),
    category: mapToCategory(data.title),
    severity: scoreSeverity(data.score, [10000, 5000, 1000]),
    title: cleanTitle(data.title),
    summary: `r/${data.subreddit} | Score: ${data.score.toLocaleString()} | Comments: ${data.num_comments}`,
    source: `REDDIT/${subreddit.toUpperCase()}`,
    status: "active",
    tags: [subreddit, ...extractTags(data.title)],
    url: `https://reddit.com${data.permalink}`,
  };
}

function deduplicateEvents(events: IntelEvent[]): IntelEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = event.title.toLowerCase().substring(0, 50).replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET() {
  try {
    // Fetch from all sources in parallel
    const [gdeltArticles, hnStories, redditWorld, redditTech] =
      await Promise.all([
        fetchGdeltNews(
          "conflict OR crisis OR military OR cyber OR political",
          25,
        ),
        fetchHackerNews(15),
        fetchRedditNews("worldnews", 15),
        fetchRedditNews("technology", 10),
      ]);

    // Transform to intel events
    const events: IntelEvent[] = [];

    // Add GDELT events
    gdeltArticles.forEach((article, i) => {
      events.push(transformGdelt(article, i));
    });

    // Add HN events
    hnStories.forEach((story) => {
      events.push(transformHN(story));
    });

    // Add Reddit events
    redditWorld.forEach((post) => {
      events.push(transformReddit(post, "worldnews"));
    });
    redditTech.forEach((post) => {
      events.push(transformReddit(post, "technology"));
    });

    // Deduplicate and sort
    const uniqueEvents = deduplicateEvents(events);
    uniqueEvents.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return NextResponse.json({
      events: uniqueEvents.slice(0, 100),
      lastUpdated: new Date().toISOString(),
      sources: {
        gdelt: gdeltArticles.length,
        hackerNews: hnStories.length,
        reddit: redditWorld.length + redditTech.length,
      },
    });
  } catch (error) {
    console.error("Intel API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch intel data", events: [] },
      { status: 500 },
    );
  }
}
