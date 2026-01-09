// News API Service for Observatory Dashboard
// Uses only FREE APIs that require NO authentication

import {
  API_ENDPOINTS,
  fetchWithCache,
  getRateLimiter,
  mapToIntelCategory,
  type EventCategory,
  type SeverityLevel,
} from "./config";

// ===========================================
// TYPES
// ===========================================

export interface IntelEvent {
  id: string;
  timestamp: string;
  category: EventCategory;
  severity: SeverityLevel;
  title: string;
  summary: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  source: string;
  status: "active" | "monitoring" | "resolved" | "archived";
  tags: string[];
  url?: string;
}

// GDELT Response Types
interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
  tone: number;
}

interface GdeltResponse {
  articles: GdeltArticle[];
}

// Hacker News Types
interface HackerNewsItem {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants?: number;
  type: "story" | "job" | "comment" | "poll" | "pollopt";
}

// Reddit Types
interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    subreddit: string;
    score: number;
    created_utc: number;
    url: string;
    permalink: string;
    num_comments: number;
    domain: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

// ===========================================
// GDELT PROJECT (No API key required)
// Global news and events monitoring
// ===========================================

export async function fetchGdeltNews(
  query: string = "conflict OR crisis OR military",
  maxRecords: number = 25,
  timespan: string = "1d",
): Promise<IntelEvent[]> {
  try {
    const rateLimiter = getRateLimiter("gdelt");
    await rateLimiter.waitForSlot();

    const params = new URLSearchParams({
      query: query,
      mode: "artlist",
      maxrecords: String(maxRecords),
      timespan: timespan,
      format: "json",
      sort: "datedesc",
    });

    const url = `${API_ENDPOINTS.gdelt.base}${API_ENDPOINTS.gdelt.doc}?${params}`;
    const response = await fetchWithCache<GdeltResponse>(
      url,
      {},
      5 * 60 * 1000,
    );

    if (response.error || !response.data?.articles) {
      console.error("GDELT error:", response.error);
      return [];
    }

    return response.data.articles.map((article, index) =>
      transformGdeltArticle(article, index),
    );
  } catch (error) {
    console.error("GDELT fetch error:", error);
    return [];
  }
}

function transformGdeltArticle(
  article: GdeltArticle,
  index: number,
): IntelEvent {
  const keywords = [article.title, article.domain, article.sourcecountry];
  const category = mapToIntelCategory(keywords);
  const severity = inferSeverityFromTone(article.tone);

  return {
    id: `GDELT-${Date.now()}-${index}`,
    timestamp: parseGdeltDate(article.seendate),
    category,
    severity,
    title: cleanTitle(article.title),
    summary: `Source: ${article.domain} | Country: ${article.sourcecountry || "Unknown"} | Tone: ${article.tone.toFixed(1)}`,
    location: article.sourcecountry || undefined,
    source: `GDELT/${article.domain.toUpperCase().substring(0, 15)}`,
    status: "active",
    tags: extractTags(article.title),
    url: article.url,
  };
}

function parseGdeltDate(dateStr: string): string {
  // GDELT format: YYYYMMDDHHMMSS
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

function inferSeverityFromTone(tone: number): SeverityLevel {
  // GDELT tone ranges from -100 to +100 (negative = negative sentiment)
  if (tone <= -5) return "critical";
  if (tone <= -2) return "high";
  if (tone <= 0) return "medium";
  return "low";
}

// Category-specific GDELT queries
export async function fetchMilitaryNews(): Promise<IntelEvent[]> {
  return fetchGdeltNews(
    "military OR defense OR troops OR weapon OR naval OR army",
    20,
    "1d",
  );
}

export async function fetchCyberNews(): Promise<IntelEvent[]> {
  return fetchGdeltNews(
    "cyber attack OR hack OR breach OR ransomware OR malware OR vulnerability",
    20,
    "1d",
  );
}

export async function fetchPoliticalNews(): Promise<IntelEvent[]> {
  return fetchGdeltNews(
    "government OR election OR president OR minister OR parliament OR sanctions",
    20,
    "1d",
  );
}

export async function fetchCrisisNews(): Promise<IntelEvent[]> {
  return fetchGdeltNews(
    "crisis OR emergency OR disaster OR conflict OR war OR attack",
    25,
    "1d",
  );
}

export async function fetchEconomicNews(): Promise<IntelEvent[]> {
  return fetchGdeltNews(
    "economy OR market OR inflation OR recession OR trade OR sanctions",
    20,
    "1d",
  );
}

// ===========================================
// HACKER NEWS (No API key required)
// Tech and cyber security news
// ===========================================

export async function fetchHackerNews(
  type: "top" | "new" = "top",
  limit: number = 15,
): Promise<IntelEvent[]> {
  try {
    const rateLimiter = getRateLimiter("hackerNews");
    await rateLimiter.waitForSlot();

    const endpoint =
      type === "top"
        ? API_ENDPOINTS.hackerNews.topStories
        : API_ENDPOINTS.hackerNews.newStories;

    const url = `${API_ENDPOINTS.hackerNews.base}${endpoint}`;
    const response = await fetchWithCache<number[]>(url, {}, 5 * 60 * 1000);

    if (response.error || !response.data) {
      console.error("Hacker News error:", response.error);
      return [];
    }

    // Get the top N story IDs
    const storyIds = response.data.slice(0, limit);

    // Fetch each story's details
    const stories = await Promise.all(
      storyIds.map(async (id) => {
        const storyUrl = `${API_ENDPOINTS.hackerNews.base}${API_ENDPOINTS.hackerNews.item}/${id}.json`;
        const storyResponse = await fetchWithCache<HackerNewsItem>(
          storyUrl,
          {},
          5 * 60 * 1000,
        );
        return storyResponse.data;
      }),
    );

    return stories
      .filter(
        (story): story is HackerNewsItem =>
          story !== null && story.type === "story",
      )
      .map((story, index) => transformHackerNewsItem(story, index));
  } catch (error) {
    console.error("Hacker News fetch error:", error);
    return [];
  }
}

function transformHackerNewsItem(
  item: HackerNewsItem,
  index: number,
): IntelEvent {
  const keywords = [item.title, item.url || ""];
  const category = mapToIntelCategory(keywords);

  // Higher score = more significant
  let severity: SeverityLevel = "low";
  if (item.score >= 500) severity = "critical";
  else if (item.score >= 200) severity = "high";
  else if (item.score >= 50) severity = "medium";

  return {
    id: `HN-${item.id}`,
    timestamp: new Date(item.time * 1000).toISOString(),
    category: category === "intel" ? "cyber" : category, // Default to cyber for HN
    severity,
    title: item.title,
    summary: `Score: ${item.score} | Comments: ${item.descendants || 0} | By: ${item.by}`,
    source: "HACKER-NEWS",
    status: "active",
    tags: ["tech", "hn", ...extractTags(item.title)],
    url: item.url,
  };
}

// ===========================================
// REDDIT (Public JSON endpoints, no API key)
// Various news subreddits
// ===========================================

export async function fetchRedditNews(
  subreddit: string = "worldnews",
  sort: "hot" | "new" | "top" = "hot",
  limit: number = 15,
): Promise<IntelEvent[]> {
  try {
    const rateLimiter = getRateLimiter("reddit");
    await rateLimiter.waitForSlot();

    const url = `${API_ENDPOINTS.reddit.base}/r/${subreddit}/${sort}.json?limit=${limit}`;
    const response = await fetchWithCache<RedditResponse>(
      url,
      {
        headers: {
          "User-Agent": "Observatory Dashboard/1.0",
        },
      },
      5 * 60 * 1000,
    );

    if (response.error || !response.data?.data?.children) {
      console.error("Reddit error:", response.error);
      return [];
    }

    return response.data.data.children.map((post, index) =>
      transformRedditPost(post, subreddit, index),
    );
  } catch (error) {
    console.error("Reddit fetch error:", error);
    return [];
  }
}

function transformRedditPost(
  post: RedditPost,
  subreddit: string,
  index: number,
): IntelEvent {
  const data = post.data;
  const keywords = [data.title, data.subreddit, data.domain];
  const category = mapToIntelCategory(keywords);

  // Higher score = more significant
  let severity: SeverityLevel = "low";
  if (data.score >= 10000) severity = "critical";
  else if (data.score >= 5000) severity = "high";
  else if (data.score >= 1000) severity = "medium";

  return {
    id: `REDDIT-${data.id}`,
    timestamp: new Date(data.created_utc * 1000).toISOString(),
    category,
    severity,
    title: cleanTitle(data.title),
    summary: `r/${data.subreddit} | Score: ${data.score.toLocaleString()} | Comments: ${data.num_comments}`,
    source: `REDDIT/${subreddit.toUpperCase()}`,
    status: "active",
    tags: [subreddit, ...extractTags(data.title)],
    url: `https://reddit.com${data.permalink}`,
  };
}

// Fetch from multiple news subreddits
export async function fetchRedditWorldNews(): Promise<IntelEvent[]> {
  return fetchRedditNews("worldnews", "hot", 15);
}

export async function fetchRedditTechNews(): Promise<IntelEvent[]> {
  return fetchRedditNews("technology", "hot", 10);
}

export async function fetchRedditSecurityNews(): Promise<IntelEvent[]> {
  return fetchRedditNews("netsec", "hot", 10);
}

export async function fetchRedditGeopolitics(): Promise<IntelEvent[]> {
  return fetchRedditNews("geopolitics", "hot", 10);
}

// ===========================================
// AGGREGATED NEWS FETCHER
// ===========================================

export interface AggregatedNewsOptions {
  includeGdelt?: boolean;
  includeHackerNews?: boolean;
  includeReddit?: boolean;
  maxPerSource?: number;
}

export async function fetchAggregatedNews(
  options: AggregatedNewsOptions = {},
): Promise<IntelEvent[]> {
  const {
    includeGdelt = true,
    includeHackerNews = true,
    includeReddit = true,
    maxPerSource = 10,
  } = options;

  const results: IntelEvent[] = [];
  const fetchPromises: Promise<IntelEvent[]>[] = [];

  if (includeGdelt) {
    fetchPromises.push(
      fetchCrisisNews().then((events) => events.slice(0, maxPerSource)),
    );
  }

  if (includeHackerNews) {
    fetchPromises.push(fetchHackerNews("top", maxPerSource));
  }

  if (includeReddit) {
    fetchPromises.push(
      fetchRedditWorldNews().then((events) => events.slice(0, maxPerSource)),
    );
  }

  const sourceResults = await Promise.allSettled(fetchPromises);

  sourceResults.forEach((result) => {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  });

  // Sort by timestamp (newest first)
  results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Deduplicate by similar titles
  return deduplicateEvents(results);
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function cleanTitle(title: string): string {
  // Remove common prefixes and clean up
  return title
    .replace(/^\[.*?\]\s*/, "") // Remove [tags]
    .replace(/^BREAKING:\s*/i, "")
    .replace(/^UPDATE:\s*/i, "")
    .trim()
    .substring(0, 200); // Limit length
}

function extractTags(text: string): string[] {
  const textLower = text.toLowerCase();
  const tags: string[] = [];

  const tagPatterns: Record<string, RegExp> = {
    military: /military|army|navy|defense|weapon/,
    cyber: /cyber|hack|breach|malware|security/,
    political: /politic|government|election|diplomat/,
    economic: /economy|market|trade|inflation/,
    climate: /climate|environment|emission|warming/,
    health: /health|pandemic|virus|disease|covid/,
    tech: /tech|ai|artificial intelligence|software/,
    crypto: /crypto|bitcoin|ethereum|blockchain/,
    energy: /energy|oil|gas|nuclear|renewable/,
    conflict: /war|conflict|attack|strike|military/,
  };

  for (const [tag, pattern] of Object.entries(tagPatterns)) {
    if (pattern.test(textLower)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 5);
}

function deduplicateEvents(events: IntelEvent[]): IntelEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    // Create a normalized key from first 50 chars of title
    const titleKey = event.title
      .toLowerCase()
      .substring(0, 50)
      .replace(/\s+/g, "");
    if (seen.has(titleKey)) {
      return false;
    }
    seen.add(titleKey);
    return true;
  });
}

// ===========================================
// SPECIALIZED FETCHERS FOR DASHBOARD
// ===========================================

export async function fetchAllCyberNews(): Promise<IntelEvent[]> {
  const [gdeltCyber, hackerNews, redditSec] = await Promise.allSettled([
    fetchCyberNews(),
    fetchHackerNews("top", 10),
    fetchRedditSecurityNews(),
  ]);

  const results: IntelEvent[] = [];

  if (gdeltCyber.status === "fulfilled") results.push(...gdeltCyber.value);
  if (hackerNews.status === "fulfilled") results.push(...hackerNews.value);
  if (redditSec.status === "fulfilled") results.push(...redditSec.value);

  return deduplicateEvents(
    results.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
  );
}

export async function fetchAllPoliticalNews(): Promise<IntelEvent[]> {
  const [gdeltPolitical, redditGeo] = await Promise.allSettled([
    fetchPoliticalNews(),
    fetchRedditGeopolitics(),
  ]);

  const results: IntelEvent[] = [];

  if (gdeltPolitical.status === "fulfilled")
    results.push(...gdeltPolitical.value);
  if (redditGeo.status === "fulfilled") results.push(...redditGeo.value);

  return deduplicateEvents(
    results.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
  );
}
