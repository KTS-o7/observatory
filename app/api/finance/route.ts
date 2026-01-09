// Server-side API route for fetching finance data
// This avoids CORS issues by fetching from server

import { NextResponse } from "next/server";

// ===========================================
// Types
// ===========================================

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: string;
}

interface FearGreedIndex {
  value: number;
  classification: string;
  timestamp: string;
  previousValue?: number;
  previousClassification?: string;
}

interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
  timestamp: string;
}

// CoinGecko response types
interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

// Yahoo Finance response type
interface YahooChartResult {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        shortName?: string;
        longName?: string;
        regularMarketTime: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        regularMarketOpen: number;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

// ===========================================
// API Fetchers
// ===========================================

async function fetchCryptoMarkets(limit: number = 15): Promise<CryptoPrice[]> {
  try {
    const params = new URLSearchParams({
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: String(limit),
      page: "1",
      sparkline: "false",
      price_change_percentage: "24h",
    });

    const url = `https://api.coingecko.com/api/v3/coins/markets?${params}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      console.error("CoinGecko error:", response.status);
      return [];
    }

    const data: CoinGeckoMarket[] = await response.json();

    return data.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      priceChange24h: coin.price_change_24h || 0,
      priceChangePercent24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      lastUpdated: coin.last_updated,
    }));
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    return [];
  }
}

async function fetchFearGreedIndex(): Promise<FearGreedIndex | null> {
  try {
    const url = "https://api.alternative.me/fng/?limit=2";
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      console.error("Fear & Greed error:", response.status);
      return null;
    }

    const data = await response.json();

    if (!data.data?.[0]) return null;

    const current = data.data[0];
    const previous = data.data[1];

    return {
      value: parseInt(current.value),
      classification: current.value_classification,
      timestamp: new Date(parseInt(current.timestamp) * 1000).toISOString(),
      previousValue: previous ? parseInt(previous.value) : undefined,
      previousClassification: previous?.value_classification,
    };
  } catch (error) {
    console.error("Fear & Greed fetch error:", error);
    return null;
  }
}

async function fetchStockQuote(symbol: string): Promise<MarketIndex | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      console.error(`Yahoo Finance error for ${symbol}:`, response.status);
      return null;
    }

    const data: YahooChartResult = await response.json();

    if (!data.chart?.result?.[0]) return null;

    const meta = data.chart.result[0].meta;
    const change = meta.regularMarketPrice - meta.previousClose;
    const changePercent = (change / meta.previousClose) * 100;

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || meta.symbol,
      value: meta.regularMarketPrice,
      change,
      changePercent,
      timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
    };
  } catch (error) {
    console.error(`Stock quote fetch error for ${symbol}:`, error);
    return null;
  }
}

async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const indexSymbols = [
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^DJI", name: "Dow Jones" },
    { symbol: "^IXIC", name: "NASDAQ" },
    { symbol: "^FTSE", name: "FTSE 100" },
    { symbol: "^N225", name: "Nikkei 225" },
  ];

  const results = await Promise.all(
    indexSymbols.map(async ({ symbol, name }) => {
      const quote = await fetchStockQuote(symbol);
      if (quote) {
        return { ...quote, name };
      }
      return null;
    })
  );

  return results.filter((r): r is MarketIndex => r !== null);
}

async function fetchCommodities(): Promise<MarketIndex[]> {
  const commoditySymbols = [
    { symbol: "GC=F", name: "Gold" },
    { symbol: "SI=F", name: "Silver" },
    { symbol: "CL=F", name: "Crude Oil" },
    { symbol: "NG=F", name: "Natural Gas" },
  ];

  const results = await Promise.all(
    commoditySymbols.map(async ({ symbol, name }) => {
      const quote = await fetchStockQuote(symbol);
      if (quote) {
        return { ...quote, name };
      }
      return null;
    })
  );

  return results.filter((r): r is MarketIndex => r !== null);
}

async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  try {
    const url = "https://api.exchangerate-api.com/v4/latest/USD";
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error("Exchange rate error:", response.status);
      return [];
    }

    const data = await response.json();
    const majorCurrencies = [
      "EUR",
      "GBP",
      "JPY",
      "CNY",
      "CHF",
      "CAD",
      "AUD",
      "INR",
    ];
    const timestamp = new Date(data.time_last_updated * 1000).toISOString();

    return majorCurrencies
      .filter((currency) => data.rates[currency])
      .map((currency) => ({
        base: "USD",
        target: currency,
        rate: data.rates[currency],
        timestamp,
      }));
  } catch (error) {
    console.error("Exchange rate fetch error:", error);
    return [];
  }
}

// ===========================================
// API Route Handler
// ===========================================

export async function GET() {
  try {
    // Fetch all data in parallel
    const [crypto, fearGreed, indices, commodities, exchangeRates] =
      await Promise.all([
        fetchCryptoMarkets(15),
        fetchFearGreedIndex(),
        fetchMarketIndices(),
        fetchCommodities(),
        fetchExchangeRates(),
      ]);

    // Generate market alerts
    const alerts: Array<{
      id: string;
      type: string;
      severity: string;
      asset: string;
      message: string;
      value: number;
      timestamp: string;
    }> = [];

    const now = new Date().toISOString();

    // Check crypto for significant moves
    for (const coin of crypto.slice(0, 10)) {
      const pctChange = Math.abs(coin.priceChangePercent24h);
      if (pctChange >= 10) {
        alerts.push({
          id: `ALERT-${coin.id}-${Date.now()}`,
          type: "volatility",
          severity: pctChange >= 20 ? "critical" : "high",
          asset: coin.symbol,
          message: `${coin.name} ${coin.priceChangePercent24h > 0 ? "surged" : "dropped"} ${pctChange.toFixed(1)}% in 24h`,
          value: coin.priceChangePercent24h,
          timestamp: now,
        });
      }
    }

    // Check Fear & Greed for extremes
    if (fearGreed) {
      if (fearGreed.value <= 20) {
        alerts.push({
          id: `ALERT-FEAR-${Date.now()}`,
          type: "sentiment",
          severity: fearGreed.value <= 10 ? "critical" : "high",
          asset: "MARKET",
          message: `Extreme Fear: Market sentiment at ${fearGreed.value}`,
          value: fearGreed.value,
          timestamp: now,
        });
      } else if (fearGreed.value >= 80) {
        alerts.push({
          id: `ALERT-GREED-${Date.now()}`,
          type: "sentiment",
          severity: fearGreed.value >= 90 ? "critical" : "high",
          asset: "MARKET",
          message: `Extreme Greed: Market sentiment at ${fearGreed.value}`,
          value: fearGreed.value,
          timestamp: now,
        });
      }
    }

    // Check indices for significant moves
    for (const index of indices) {
      const pctChange = Math.abs(index.changePercent);
      if (pctChange >= 2) {
        alerts.push({
          id: `ALERT-${index.symbol}-${Date.now()}`,
          type: "volatility",
          severity: pctChange >= 4 ? "critical" : "high",
          asset: index.name,
          message: `${index.name} ${index.changePercent > 0 ? "up" : "down"} ${pctChange.toFixed(2)}%`,
          value: index.changePercent,
          timestamp: now,
        });
      }
    }

    return NextResponse.json({
      crypto,
      fearGreed,
      indices,
      commodities,
      exchangeRates,
      alerts,
      lastUpdated: now,
    });
  } catch (error) {
    console.error("Finance API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch finance data",
        crypto: [],
        fearGreed: null,
        indices: [],
        commodities: [],
        exchangeRates: [],
        alerts: [],
      },
      { status: 500 }
    );
  }
}
