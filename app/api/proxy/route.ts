// API Proxy Route for CORS-restricted endpoints
// This allows the frontend to fetch from APIs that don't allow browser requests

import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering - don't call external APIs at build time
export const dynamic = "force-dynamic";

// Allowed API domains for security
const ALLOWED_DOMAINS = [
  // Original sources
  "api.gdeltproject.org",
  "hacker-news.firebaseio.com",
  "www.reddit.com",
  "api.coingecko.com",
  "api.alternative.me",
  "earthquake.usgs.gov",
  "eonet.gsfc.nasa.gov",
  "api.exchangerate-api.com",
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  // Aviation tracking
  "opensky-network.org",
  // Cyber threat intelligence
  "urlhaus-api.abuse.ch",
  "threatfox-api.abuse.ch",
  "feodotracker.abuse.ch",
  "internetdb.shodan.io",
  "api.ransomware.live",
  "check.torproject.org",
  // Infrastructure monitoring
  "api.ioda.inetintel.cc.gatech.edu",
  "www.cloudflarestatus.com",
  "www.githubstatus.com",
  "status.fastly.com",
  "discordstatus.com",
  "www.vercel-status.com",
  // Space weather
  "services.swpc.noaa.gov",
  // Sanctions
  "api.opensanctions.org",
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 },
    );
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Security check - only allow specific domains
  const isAllowed = ALLOWED_DOMAINS.some(
    (domain) =>
      parsedUrl.hostname === domain ||
      parsedUrl.hostname.endsWith(`.${domain}`),
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Observatory Dashboard/1.0",
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status} ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Proxy fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from upstream" },
      { status: 502 },
    );
  }
}

// Handle POST requests for APIs that need them
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 },
    );
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Security check
  const isAllowed = ALLOWED_DOMAINS.some(
    (domain) =>
      parsedUrl.hostname === domain ||
      parsedUrl.hostname.endsWith(`.${domain}`),
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Observatory Dashboard/1.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status} ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy POST error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from upstream" },
      { status: 502 },
    );
  }
}
