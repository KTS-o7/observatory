// Finance API Service for Observatory Dashboard
// Uses only FREE APIs that require NO authentication

import { API_ENDPOINTS, fetchWithCache, getRateLimiter } from "./config";
import type { SeverityLevel } from "./config";

// ===========================================
// STOCK MARKET TYPES
// ===========================================

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap?: number;
  timestamp: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// ===========================================
// TYPES
// ===========================================

export interface CryptoPrice {
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
  sparkline?: number[];
}

export interface ExchangeRate {
  base: string;
  target: string;
  rate: number;
  timestamp: string;
}

export interface GlobalMarketData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCryptocurrencies: number;
}

export interface FearGreedIndex {
  value: number;
  classification: string;
  timestamp: string;
  previousValue?: number;
  previousClassification?: string;
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  priceBtc: number;
  score: number;
}

export interface MarketAlert {
  id: string;
  type: "price" | "volume" | "volatility" | "sentiment";
  severity: SeverityLevel;
  asset: string;
  message: string;
  value: number;
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
  sparkline_in_7d?: { price: number[] };
}

interface CoinGeckoGlobal {
  data: {
    total_market_cap: { usd: number };
    total_volume: { usd: number };
    market_cap_percentage: { btc: number; eth: number };
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
  };
}

interface CoinGeckoTrending {
  coins: Array<{
    item: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      price_btc: number;
      score: number;
    };
  }>;
}

interface FearGreedResponse {
  data: Array<{
    value: string;
    value_classification: string;
    timestamp: string;
  }>;
}

interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  time_last_updated: number;
}

// ===========================================
// COINGECKO API (Free, no auth required)
// ===========================================

/**
 * Fetch top cryptocurrencies by market cap
 */
export async function fetchCryptoMarkets(
  limit: number = 20,
  includeSparkline: boolean = false,
): Promise<CryptoPrice[]> {
  try {
    const rateLimiter = getRateLimiter("coingecko");
    await rateLimiter.waitForSlot();

    const params = new URLSearchParams({
      vs_currency: "usd",
      order: "market_cap_desc",
      per_page: String(limit),
      page: "1",
      sparkline: String(includeSparkline),
      price_change_percentage: "24h",
    });

    const url = `${API_ENDPOINTS.coingecko.base}${API_ENDPOINTS.coingecko.markets}?${params}`;
    const response = await fetchWithCache<CoinGeckoMarket[]>(
      url,
      {},
      60 * 1000,
    ); // 1 min cache

    if (response.error || !response.data) {
      console.error("CoinGecko markets error:", response.error);
      return [];
    }

    return response.data.map((coin) => ({
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
      sparkline: coin.sparkline_in_7d?.price,
    }));
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    return [];
  }
}

/**
 * Fetch global cryptocurrency market data
 */
export async function fetchGlobalCryptoData(): Promise<GlobalMarketData | null> {
  try {
    const rateLimiter = getRateLimiter("coingecko");
    await rateLimiter.waitForSlot();

    const url = `${API_ENDPOINTS.coingecko.base}${API_ENDPOINTS.coingecko.global}`;
    const response = await fetchWithCache<CoinGeckoGlobal>(
      url,
      {},
      5 * 60 * 1000,
    ); // 5 min cache

    if (response.error || !response.data?.data) {
      console.error("CoinGecko global error:", response.error);
      return null;
    }

    const data = response.data.data;
    return {
      totalMarketCap: data.total_market_cap.usd,
      totalVolume24h: data.total_volume.usd,
      btcDominance: data.market_cap_percentage.btc,
      ethDominance: data.market_cap_percentage.eth,
      marketCapChange24h: data.market_cap_change_percentage_24h_usd,
      activeCryptocurrencies: data.active_cryptocurrencies,
    };
  } catch (error) {
    console.error("CoinGecko global fetch error:", error);
    return null;
  }
}

/**
 * Fetch trending cryptocurrencies
 */
export async function fetchTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const rateLimiter = getRateLimiter("coingecko");
    await rateLimiter.waitForSlot();

    const url = `${API_ENDPOINTS.coingecko.base}${API_ENDPOINTS.coingecko.trending}`;
    const response = await fetchWithCache<CoinGeckoTrending>(
      url,
      {},
      10 * 60 * 1000,
    ); // 10 min cache

    if (response.error || !response.data?.coins) {
      console.error("CoinGecko trending error:", response.error);
      return [];
    }

    return response.data.coins.map((coin) => ({
      id: coin.item.id,
      name: coin.item.name,
      symbol: coin.item.symbol.toUpperCase(),
      marketCapRank: coin.item.market_cap_rank,
      priceBtc: coin.item.price_btc,
      score: coin.item.score,
    }));
  } catch (error) {
    console.error("CoinGecko trending fetch error:", error);
    return [];
  }
}

// ===========================================
// FEAR & GREED INDEX (Alternative.me, free)
// ===========================================

/**
 * Fetch Crypto Fear & Greed Index
 */
export async function fetchFearGreedIndex(): Promise<FearGreedIndex | null> {
  try {
    const rateLimiter = getRateLimiter("fearGreed");
    await rateLimiter.waitForSlot();

    const url = `${API_ENDPOINTS.fearGreed.base}/?limit=2`;
    const response = await fetchWithCache<FearGreedResponse>(
      url,
      {},
      30 * 60 * 1000,
    ); // 30 min cache

    if (response.error || !response.data?.data?.[0]) {
      console.error("Fear & Greed error:", response.error);
      return null;
    }

    const current = response.data.data[0];
    const previous = response.data.data[1];

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

// ===========================================
// EXCHANGE RATES (exchangerate-api, free)
// ===========================================

/**
 * Fetch currency exchange rates
 */
export async function fetchExchangeRates(
  baseCurrency: string = "USD",
): Promise<ExchangeRate[]> {
  try {
    const url = `${API_ENDPOINTS.exchangerate.base}/${baseCurrency}`;
    const response = await fetchWithCache<ExchangeRateResponse>(
      url,
      {},
      60 * 60 * 1000,
    ); // 1 hour cache

    if (response.error || !response.data?.rates) {
      console.error("Exchange rate error:", response.error);
      return [];
    }

    // Select major currencies
    const majorCurrencies = [
      "EUR",
      "GBP",
      "JPY",
      "CNY",
      "CHF",
      "CAD",
      "AUD",
      "INR",
      "RUB",
      "BRL",
    ];
    const timestamp = new Date(
      response.data.time_last_updated * 1000,
    ).toISOString();

    return majorCurrencies
      .filter((currency) => response.data!.rates[currency])
      .map((currency) => ({
        base: baseCurrency,
        target: currency,
        rate: response.data!.rates[currency],
        timestamp,
      }));
  } catch (error) {
    console.error("Exchange rate fetch error:", error);
    return [];
  }
}

// ===========================================
// AGGREGATED MARKET DATA
// ===========================================

export interface MarketOverview {
  crypto: CryptoPrice[];
  globalData: GlobalMarketData | null;
  trending: TrendingCoin[];
  fearGreed: FearGreedIndex | null;
  exchangeRates: ExchangeRate[];
  lastUpdated: string;
}

/**
 * Fetch comprehensive market overview
 */
export async function fetchMarketOverview(): Promise<MarketOverview> {
  const [crypto, globalData, trending, fearGreed, exchangeRates] =
    await Promise.all([
      fetchCryptoMarkets(15).catch(() => []),
      fetchGlobalCryptoData().catch(() => null),
      fetchTrendingCoins().catch(() => []),
      fetchFearGreedIndex().catch(() => null),
      fetchExchangeRates("USD").catch(() => []),
    ]);

  return {
    crypto,
    globalData,
    trending,
    fearGreed,
    exchangeRates,
    lastUpdated: new Date().toISOString(),
  };
}

// ===========================================
// MARKET ALERTS GENERATOR
// ===========================================

/**
 * Generate alerts based on market conditions
 */
export function generateMarketAlerts(overview: MarketOverview): MarketAlert[] {
  const alerts: MarketAlert[] = [];
  const now = new Date().toISOString();

  // Check crypto for significant moves
  for (const coin of overview.crypto.slice(0, 10)) {
    const pctChange = Math.abs(coin.priceChangePercent24h);

    if (pctChange >= 15) {
      alerts.push({
        id: `ALERT-${coin.id}-${Date.now()}`,
        type: "volatility",
        severity: pctChange >= 25 ? "critical" : "high",
        asset: coin.symbol,
        message: `${coin.name} ${coin.priceChangePercent24h > 0 ? "surged" : "dropped"} ${pctChange.toFixed(1)}% in 24h`,
        value: coin.priceChangePercent24h,
        timestamp: now,
      });
    }
  }

  // Check Fear & Greed for extreme values
  if (overview.fearGreed) {
    const fgValue = overview.fearGreed.value;
    if (fgValue <= 20) {
      alerts.push({
        id: `ALERT-FEAR-${Date.now()}`,
        type: "sentiment",
        severity: fgValue <= 10 ? "critical" : "high",
        asset: "MARKET",
        message: `Extreme Fear: Market sentiment at ${fgValue} (${overview.fearGreed.classification})`,
        value: fgValue,
        timestamp: now,
      });
    } else if (fgValue >= 80) {
      alerts.push({
        id: `ALERT-GREED-${Date.now()}`,
        type: "sentiment",
        severity: fgValue >= 90 ? "critical" : "high",
        asset: "MARKET",
        message: `Extreme Greed: Market sentiment at ${fgValue} (${overview.fearGreed.classification})`,
        value: fgValue,
        timestamp: now,
      });
    }
  }

  // Check global market cap change
  if (overview.globalData) {
    const mcChange = Math.abs(overview.globalData.marketCapChange24h);
    if (mcChange >= 5) {
      alerts.push({
        id: `ALERT-MCAP-${Date.now()}`,
        type: "volatility",
        severity: mcChange >= 10 ? "critical" : "high",
        asset: "TOTAL-MCAP",
        message: `Global crypto market cap ${overview.globalData.marketCapChange24h > 0 ? "up" : "down"} ${mcChange.toFixed(1)}% in 24h`,
        value: overview.globalData.marketCapChange24h,
        timestamp: now,
      });
    }
  }

  return alerts;
}

// ===========================================
// FORMATTING UTILITIES
// ===========================================

/**
 * Format large numbers for display
 */
export function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

/**
 * Format price based on value
 */
export function formatPrice(price: number): string {
  if (price >= 1000)
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

/**
 * Format percentage change
 */
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Get Fear & Greed classification color
 */
export function getFearGreedColor(
  value: number,
): "critical" | "alert" | "info" | "active" {
  if (value <= 25) return "critical"; // Extreme Fear
  if (value <= 45) return "alert"; // Fear
  if (value <= 55) return "info"; // Neutral
  if (value <= 75) return "active"; // Greed
  return "alert"; // Extreme Greed (also warning)
}

// ===========================================
// STOCK MARKET DATA (Free endpoints)
// ===========================================

// Yahoo Finance chart API (no auth required)
interface YahooChartResult {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        previousClose: number;
        currency: string;
        shortName?: string;
        longName?: string;
        regularMarketTime: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        marketCap?: number;
        regularMarketOpen: number;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

/**
 * Fetch stock quote from Yahoo Finance
 */
export async function fetchStockQuote(
  symbol: string,
): Promise<StockQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetchWithCache<YahooChartResult>(url, {}, 60 * 1000);

    if (response.error || !response.data?.chart?.result?.[0]) {
      console.error("Yahoo Finance error:", response.error);
      return null;
    }

    const meta = response.data.chart.result[0].meta;
    const change = meta.regularMarketPrice - meta.previousClose;
    const changePercent = (change / meta.previousClose) * 100;

    return {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || meta.symbol,
      price: meta.regularMarketPrice,
      change,
      changePercent,
      previousClose: meta.previousClose,
      open: meta.regularMarketOpen,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap,
      timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Stock quote fetch error:", error);
    return null;
  }
}

/**
 * Fetch multiple stock quotes
 */
export async function fetchStockQuotes(
  symbols: string[],
): Promise<StockQuote[]> {
  const results = await Promise.allSettled(
    symbols.map((symbol) => fetchStockQuote(symbol)),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<StockQuote | null> =>
        result.status === "fulfilled" && result.value !== null,
    )
    .map((result) => result.value as StockQuote);
}

/**
 * Fetch major market indices
 */
export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const indexSymbols = [
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^DJI", name: "Dow Jones" },
    { symbol: "^IXIC", name: "NASDAQ" },
    { symbol: "^FTSE", name: "FTSE 100" },
    { symbol: "^N225", name: "Nikkei 225" },
    { symbol: "^HSI", name: "Hang Seng" },
  ];

  const quotes = await fetchStockQuotes(indexSymbols.map((i) => i.symbol));

  return quotes.map((quote) => {
    const indexInfo = indexSymbols.find((i) => i.symbol === quote.symbol);
    return {
      symbol: quote.symbol,
      name: indexInfo?.name || quote.name,
      value: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      timestamp: quote.timestamp,
    };
  });
}

/**
 * Fetch popular stock quotes (tech giants, etc.)
 */
export async function fetchPopularStocks(): Promise<StockQuote[]> {
  const popularSymbols = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "NVDA",
    "META",
    "TSLA",
    "AMD",
  ];
  return fetchStockQuotes(popularSymbols);
}

// ===========================================
// COMMODITIES (via Yahoo Finance)
// ===========================================

export interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

/**
 * Fetch commodity prices
 */
export async function fetchCommodityPrices(): Promise<CommodityPrice[]> {
  const commoditySymbols = [
    { symbol: "GC=F", name: "Gold" },
    { symbol: "SI=F", name: "Silver" },
    { symbol: "CL=F", name: "Crude Oil" },
    { symbol: "NG=F", name: "Natural Gas" },
  ];

  const quotes = await fetchStockQuotes(commoditySymbols.map((c) => c.symbol));

  return quotes.map((quote) => {
    const commodity = commoditySymbols.find((c) => c.symbol === quote.symbol);
    return {
      symbol: quote.symbol,
      name: commodity?.name || quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      timestamp: quote.timestamp,
    };
  });
}

// ===========================================
// COMPREHENSIVE MARKET OVERVIEW
// ===========================================

export interface FullMarketOverview extends MarketOverview {
  indices: MarketIndex[];
  stocks: StockQuote[];
  commodities: CommodityPrice[];
}

/**
 * Fetch comprehensive market data (crypto + stocks + commodities)
 */
export async function fetchFullMarketOverview(): Promise<FullMarketOverview> {
  const [baseOverview, indices, stocks, commodities] = await Promise.all([
    fetchMarketOverview(),
    fetchMarketIndices().catch(() => []),
    fetchPopularStocks().catch(() => []),
    fetchCommodityPrices().catch(() => []),
  ]);

  return {
    ...baseOverview,
    indices,
    stocks,
    commodities,
  };
}

/**
 * Generate stock market alerts
 */
export function generateStockAlerts(
  indices: MarketIndex[],
  stocks: StockQuote[],
): MarketAlert[] {
  const alerts: MarketAlert[] = [];
  const now = new Date().toISOString();

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

  // Check stocks for significant moves
  for (const stock of stocks) {
    const pctChange = Math.abs(stock.changePercent);
    if (pctChange >= 5) {
      alerts.push({
        id: `ALERT-${stock.symbol}-${Date.now()}`,
        type: "volatility",
        severity: pctChange >= 10 ? "critical" : "high",
        asset: stock.symbol,
        message: `${stock.name} ${stock.changePercent > 0 ? "surged" : "dropped"} ${pctChange.toFixed(2)}%`,
        value: stock.changePercent,
        timestamp: now,
      });
    }
  }

  return alerts;
}
