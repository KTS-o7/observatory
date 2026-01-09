// Server-side API route for service status and crypto network health
// Monitors GitHub, npm, crypto networks, and other services

import { NextResponse } from "next/server";

// ===========================================
// Types
// ===========================================

interface ServiceStatus {
  id: string;
  name: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  latency?: number;
  lastChecked: string;
  url?: string;
  details?: string;
}

interface CryptoNetworkStats {
  id: string;
  name: string;
  symbol: string;
  blockHeight: number;
  gasPrice?: string;
  tps?: number;
  pendingTx?: number;
  difficulty?: string;
  hashRate?: string;
  lastBlock?: string;
}

// ===========================================
// Service Health Checks
// ===========================================

async function checkServiceHealth(
  name: string,
  url: string,
  timeout: number = 5000,
): Promise<ServiceStatus> {
  const startTime = Date.now();
  const id = name.toLowerCase().replace(/\s+/g, "-");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    return {
      id,
      name,
      status: response.ok ? "operational" : "degraded",
      latency,
      lastChecked: new Date().toISOString(),
      url,
    };
  } catch (error) {
    return {
      id,
      name,
      status: "outage",
      latency: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      url,
      details: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

async function checkGitHubStatus(): Promise<ServiceStatus> {
  try {
    const response = await fetch(
      "https://www.githubstatus.com/api/v2/status.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) {
      return {
        id: "github",
        name: "GitHub",
        status: "unknown",
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await response.json();
    const indicator = data.status?.indicator || "none";

    let status: ServiceStatus["status"] = "operational";
    if (indicator === "minor" || indicator === "major") {
      status = "degraded";
    } else if (indicator === "critical") {
      status = "outage";
    }

    return {
      id: "github",
      name: "GitHub",
      status,
      lastChecked: new Date().toISOString(),
      details: data.status?.description,
    };
  } catch {
    return {
      id: "github",
      name: "GitHub",
      status: "unknown",
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkCloudflareStatus(): Promise<ServiceStatus> {
  try {
    const response = await fetch(
      "https://www.cloudflarestatus.com/api/v2/status.json",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 900 },
      },
    );

    if (!response.ok) {
      return {
        id: "cloudflare",
        name: "Cloudflare",
        status: "unknown",
        lastChecked: new Date().toISOString(),
      };
    }

    const data = await response.json();
    const indicator = data.status?.indicator || "none";

    let status: ServiceStatus["status"] = "operational";
    if (indicator === "minor" || indicator === "major") {
      status = "degraded";
    } else if (indicator === "critical") {
      status = "outage";
    }

    return {
      id: "cloudflare",
      name: "Cloudflare",
      status,
      lastChecked: new Date().toISOString(),
      details: data.status?.description,
    };
  } catch {
    return {
      id: "cloudflare",
      name: "Cloudflare",
      status: "unknown",
      lastChecked: new Date().toISOString(),
    };
  }
}

// ===========================================
// Crypto Network Stats
// ===========================================

async function fetchEthereumStats(): Promise<CryptoNetworkStats | null> {
  try {
    // Use public Ethereum RPC endpoint
    const response = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
      next: { revalidate: 120 },
    });

    if (!response.ok) return null;

    const blockData = await response.json();
    const blockHeight = parseInt(blockData.result, 16);

    // Get gas price
    const gasResponse = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 2,
      }),
      next: { revalidate: 120 },
    });

    let gasPrice = "N/A";
    if (gasResponse.ok) {
      const gasData = await gasResponse.json();
      const gasPriceWei = parseInt(gasData.result, 16);
      const gasPriceGwei = gasPriceWei / 1e9;
      gasPrice = `${gasPriceGwei.toFixed(1)} Gwei`;
    }

    return {
      id: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
      blockHeight,
      gasPrice,
      lastBlock: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Ethereum stats error:", error);
    return null;
  }
}

async function fetchBitcoinStats(): Promise<CryptoNetworkStats | null> {
  try {
    // Use blockchain.info API (free, no auth)
    const response = await fetch("https://blockchain.info/q/getblockcount", {
      next: { revalidate: 900 },
    });

    if (!response.ok) return null;

    const blockHeight = parseInt(await response.text());

    // Get mempool size
    const mempoolResponse = await fetch(
      "https://blockchain.info/q/unconfirmedcount",
      {
        next: { revalidate: 900 },
      },
    );

    let pendingTx: number | undefined;
    if (mempoolResponse.ok) {
      pendingTx = parseInt(await mempoolResponse.text());
    }

    // Get hash rate
    const hashResponse = await fetch("https://blockchain.info/q/hashrate", {
      next: { revalidate: 900 },
    });

    let hashRate: string | undefined;
    if (hashResponse.ok) {
      const hashRateGH = parseFloat(await hashResponse.text());
      const hashRateEH = hashRateGH / 1e9; // Convert to EH/s
      hashRate = `${hashRateEH.toFixed(2)} EH/s`;
    }

    return {
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
      blockHeight,
      pendingTx,
      hashRate,
      lastBlock: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Bitcoin stats error:", error);
    return null;
  }
}

async function fetchSolanaStats(): Promise<CryptoNetworkStats | null> {
  try {
    // Use public Solana RPC
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSlot",
      }),
      next: { revalidate: 120 },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const slot = data.result;

    // Get TPS estimate from recent performance
    const perfResponse = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getRecentPerformanceSamples",
        params: [1],
      }),
      next: { revalidate: 120 },
    });

    let tps: number | undefined;
    if (perfResponse.ok) {
      const perfData = await perfResponse.json();
      if (perfData.result?.[0]) {
        const sample = perfData.result[0];
        tps = Math.round(sample.numTransactions / sample.samplePeriodSecs);
      }
    }

    return {
      id: "solana",
      name: "Solana",
      symbol: "SOL",
      blockHeight: slot,
      tps,
      lastBlock: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Solana stats error:", error);
    return null;
  }
}

// ===========================================
// API Route Handler
// ===========================================

export async function GET() {
  try {
    // Check services in parallel
    const [
      github,
      cloudflare,
      googleStatus,
      npmStatus,
      redditStatus,
      discordStatus,
      ethereum,
      bitcoin,
      solana,
    ] = await Promise.all([
      checkGitHubStatus(),
      checkCloudflareStatus(),
      checkServiceHealth("Google", "https://www.google.com"),
      checkServiceHealth("npm", "https://registry.npmjs.org"),
      checkServiceHealth("Reddit", "https://www.reddit.com"),
      checkServiceHealth("Discord", "https://discord.com"),
      fetchEthereumStats(),
      fetchBitcoinStats(),
      fetchSolanaStats(),
    ]);

    const services: ServiceStatus[] = [
      github,
      cloudflare,
      googleStatus,
      npmStatus,
      redditStatus,
      discordStatus,
    ];

    const cryptoNetworks: CryptoNetworkStats[] = [
      ethereum,
      bitcoin,
      solana,
    ].filter((n): n is CryptoNetworkStats => n !== null);

    // Calculate summary
    const operational = services.filter(
      (s) => s.status === "operational",
    ).length;
    const degraded = services.filter((s) => s.status === "degraded").length;
    const outages = services.filter((s) => s.status === "outage").length;
    const servicesWithLatency = services.filter((s) => s.latency);
    const avgLatency =
      servicesWithLatency.length > 0
        ? Math.round(
            servicesWithLatency.reduce((sum, s) => sum + (s.latency || 0), 0) /
              servicesWithLatency.length,
          )
        : 0;

    return NextResponse.json({
      services,
      cryptoNetworks,
      summary: {
        total: services.length,
        operational,
        degraded,
        outages,
        avgLatency,
        overallStatus:
          outages > 0 ? "critical" : degraded > 0 ? "degraded" : "operational",
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json(
      {
        services: [],
        cryptoNetworks: [],
        summary: {
          total: 0,
          operational: 0,
          degraded: 0,
          outages: 0,
          avgLatency: 0,
          overallStatus: "unknown",
        },
        lastUpdated: new Date().toISOString(),
        error: "Failed to fetch status data",
      },
      { status: 500 },
    );
  }
}
