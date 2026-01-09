// Server-side API route for space launches and missions
// Uses SpaceX API and Launch Library 2 (both free, no auth required)

import { NextResponse } from "next/server";

// ===========================================
// Types
// ===========================================

interface Launch {
  id: string;
  name: string;
  status: "upcoming" | "live" | "success" | "failure" | "tbd";
  date: string;
  provider: string;
  rocket: string;
  mission: string;
  launchpad: string;
  details?: string;
  webcast?: string;
  countdown?: number; // seconds until launch
}

// SpaceX API types
interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  upcoming: boolean;
  success: boolean | null;
  details: string | null;
  rocket: string;
  launchpad: string;
  links: {
    webcast: string | null;
    youtube_id: string | null;
    wikipedia: string | null;
  };
}

interface SpaceXRocket {
  id: string;
  name: string;
}

interface SpaceXLaunchpad {
  id: string;
  name: string;
  locality: string;
  region: string;
}

// Launch Library 2 types
interface LL2Launch {
  id: string;
  name: string;
  status: {
    id: number;
    name: string;
    abbrev: string;
  };
  net: string; // ISO date
  launch_service_provider: {
    name: string;
    abbrev: string;
  };
  rocket: {
    configuration: {
      name: string;
      full_name: string;
    };
  };
  mission: {
    name: string;
    description: string;
    type: string;
  } | null;
  pad: {
    name: string;
    location: {
      name: string;
    };
  };
  webcast_live: boolean;
  vidURLs: Array<{ url: string }>;
}

interface LL2Response {
  count: number;
  results: LL2Launch[];
}

// ===========================================
// API Fetchers
// ===========================================

async function fetchSpaceXLaunches(): Promise<Launch[]> {
  try {
    // Fetch upcoming launches
    const upcomingRes = await fetch(
      "https://api.spacexdata.com/v5/launches/upcoming",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 }, // Cache 5 min
      },
    );

    // Fetch past launches (last 5)
    const pastRes = await fetch(
      "https://api.spacexdata.com/v5/launches/past?limit=5&order=desc",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );

    // Fetch rockets and launchpads for names
    const [rocketsRes, launchpadsRes] = await Promise.all([
      fetch("https://api.spacexdata.com/v4/rockets", {
        next: { revalidate: 3600 },
      }),
      fetch("https://api.spacexdata.com/v4/launchpads", {
        next: { revalidate: 3600 },
      }),
    ]);

    if (!upcomingRes.ok && !pastRes.ok) {
      return [];
    }

    const upcoming: SpaceXLaunch[] = upcomingRes.ok
      ? await upcomingRes.json()
      : [];
    const past: SpaceXLaunch[] = pastRes.ok ? await pastRes.json() : [];
    const rockets: SpaceXRocket[] = rocketsRes.ok
      ? await rocketsRes.json()
      : [];
    const launchpads: SpaceXLaunchpad[] = launchpadsRes.ok
      ? await launchpadsRes.json()
      : [];

    // Create lookup maps
    const rocketMap = new Map(rockets.map((r) => [r.id, r.name]));
    const padMap = new Map(
      launchpads.map((p) => [p.id, `${p.name}, ${p.region}`]),
    );

    const now = Date.now();

    const transformLaunch = (launch: SpaceXLaunch): Launch => {
      const launchTime = new Date(launch.date_utc).getTime();
      const countdown = Math.floor((launchTime - now) / 1000);

      let status: Launch["status"] = "tbd";
      if (launch.upcoming) {
        status = countdown < 0 ? "live" : "upcoming";
      } else if (launch.success === true) {
        status = "success";
      } else if (launch.success === false) {
        status = "failure";
      }

      return {
        id: `spacex-${launch.id}`,
        name: launch.name,
        status,
        date: launch.date_utc,
        provider: "SpaceX",
        rocket: rocketMap.get(launch.rocket) || "Falcon 9",
        mission: launch.details?.substring(0, 100) || launch.name,
        launchpad: padMap.get(launch.launchpad) || "Kennedy Space Center",
        details: launch.details || undefined,
        webcast: launch.links.webcast || undefined,
        countdown: countdown > 0 ? countdown : undefined,
      };
    };

    return [
      ...upcoming.slice(0, 5).map(transformLaunch),
      ...past.map(transformLaunch),
    ];
  } catch (error) {
    console.error("SpaceX API error:", error);
    return [];
  }
}

async function fetchLL2Launches(): Promise<Launch[]> {
  try {
    // Launch Library 2 - upcoming launches from all providers
    const response = await fetch(
      "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&mode=list",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 600 }, // Cache 10 min (rate limited)
      },
    );

    if (!response.ok) {
      console.error("LL2 API error:", response.status);
      return [];
    }

    const data: LL2Response = await response.json();
    const now = Date.now();

    return data.results
      .filter((launch) => launch.launch_service_provider?.abbrev !== "SpX") // Avoid SpaceX duplicates
      .map((launch): Launch => {
        const launchTime = new Date(launch.net).getTime();
        const countdown = Math.floor((launchTime - now) / 1000);

        let status: Launch["status"] = "tbd";
        const statusAbbrev = launch.status?.abbrev;
        if (statusAbbrev === "Go") {
          status = "upcoming";
        } else if (statusAbbrev === "TBC" || statusAbbrev === "TBD") {
          status = "tbd";
        } else if (statusAbbrev === "Success") {
          status = "success";
        } else if (statusAbbrev === "Failure") {
          status = "failure";
        } else if (launch.webcast_live) {
          status = "live";
        }

        return {
          id: `ll2-${launch.id}`,
          name: launch.name,
          status,
          date: launch.net,
          provider:
            launch.launch_service_provider?.abbrev ||
            launch.launch_service_provider?.name ||
            "Unknown",
          rocket: launch.rocket?.configuration?.name || "Unknown Rocket",
          mission: launch.mission?.name || launch.name.split("|")[0].trim(),
          launchpad: `${launch.pad?.name || "Unknown"}, ${launch.pad?.location?.name || "Unknown"}`,
          details: launch.mission?.description || undefined,
          webcast: launch.vidURLs?.[0]?.url || undefined,
          countdown: countdown > 0 ? countdown : undefined,
        };
      });
  } catch (error) {
    console.error("LL2 API error:", error);
    return [];
  }
}

// ===========================================
// GitHub Trending (bonus)
// ===========================================

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface TrendingRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  language: string;
  owner: string;
}

async function fetchGitHubTrending(): Promise<TrendingRepo[]> {
  try {
    // GitHub search for recently created repos with most stars
    const date = new Date();
    date.setDate(date.getDate() - 7); // Last 7 days
    const dateStr = date.toISOString().split("T")[0];

    const response = await fetch(
      `https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=10`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Observatory-Dashboard",
        },
        next: { revalidate: 1800 }, // Cache 30 min (rate limited)
      },
    );

    if (!response.ok) {
      console.error("GitHub API error:", response.status);
      return [];
    }

    const data = await response.json();

    return data.items.map(
      (repo: GitHubRepo): TrendingRepo => ({
        id: `gh-${repo.full_name}`,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description?.substring(0, 100) || "No description",
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language || "Unknown",
        owner: repo.owner.login,
      }),
    );
  } catch (error) {
    console.error("GitHub trending error:", error);
    return [];
  }
}

// ===========================================
// API Route Handler
// ===========================================

export async function GET() {
  try {
    const [spacexLaunches, ll2Launches, githubTrending] = await Promise.all([
      fetchSpaceXLaunches(),
      fetchLL2Launches(),
      fetchGitHubTrending(),
    ]);

    // Combine and sort launches by date
    const allLaunches = [...spacexLaunches, ...ll2Launches].sort((a, b) => {
      // Put live launches first
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      // Then upcoming by countdown
      if (a.status === "upcoming" && b.status === "upcoming") {
        return (a.countdown || Infinity) - (b.countdown || Infinity);
      }
      // Then by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Summary stats
    const upcoming = allLaunches.filter((l) => l.status === "upcoming").length;
    const live = allLaunches.filter((l) => l.status === "live").length;
    const nextLaunch = allLaunches.find(
      (l) => l.status === "upcoming" || l.status === "live",
    );

    return NextResponse.json({
      launches: allLaunches.slice(0, 10),
      trending: githubTrending,
      summary: {
        upcoming,
        live,
        total: allLaunches.length,
        nextLaunch: nextLaunch?.name || null,
        nextCountdown: nextLaunch?.countdown || null,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Launches API error:", error);
    return NextResponse.json(
      {
        launches: [],
        trending: [],
        summary: {
          upcoming: 0,
          live: 0,
          total: 0,
          nextLaunch: null,
          nextCountdown: null,
        },
        lastUpdated: new Date().toISOString(),
        error: "Failed to fetch data",
      },
      { status: 500 },
    );
  }
}
