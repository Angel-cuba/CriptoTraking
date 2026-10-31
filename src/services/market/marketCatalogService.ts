import type {
  MarketSnapshot,
  MarketSymbol,
  MarketTicker,
} from "@/src/types/market";

import { ensureRequestAllowed, fetchMarketData } from "./binanceTransport";

const CATALOG_TTL_MS = 5 * 60 * 1000;
let cachedCatalog: MarketSymbol[] | null = null;
let catalogExpiresAt = 0;

export async function getMarketSnapshot(
  signal?: AbortSignal,
): Promise<MarketSnapshot> {
  ensureRequestAllowed(signal);
  const catalog = await getMarketCatalog(signal);
  const data = await fetchMarketData(
    "/api/v3/ticker/24hr?symbolStatus=TRADING",
    signal,
  );
  const tickers = parseMarketTickers(data);

  return {
    assets: catalog.map((asset) => ({
      ...asset,
      ticker: tickers.get(asset.symbol) ?? null,
    })),
    receivedAt: Date.now(),
  };
}

async function getMarketCatalog(signal?: AbortSignal): Promise<MarketSymbol[]> {
  if (cachedCatalog && Date.now() < catalogExpiresAt) {
    return cachedCatalog;
  }

  const data = await fetchMarketData(
    "/api/v3/exchangeInfo?permissions=SPOT&symbolStatus=TRADING&showPermissionSets=false",
    signal,
  );
  ensureRequestAllowed(signal);
  cachedCatalog = parseMarketCatalog(data);
  catalogExpiresAt = Date.now() + CATALOG_TTL_MS;
  return cachedCatalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAssetName(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.trim() === value
  );
}

function parseDecimal(value: unknown): number {
  if (typeof value !== "string" || !/^-?\d+(?:\.\d+)?$/.test(value)) {
    return NaN;
  }

  return Number(value);
}

function parseMarketCatalog(data: unknown): MarketSymbol[] {
  if (!isRecord(data) || !Array.isArray(data.symbols)) {
    throw new Error("Invalid market catalog response.");
  }

  const symbols = new Map<string, MarketSymbol>();

  for (const item of data.symbols) {
    if (
      !isRecord(item) ||
      item.status !== "TRADING" ||
      item.isSpotTradingAllowed !== true ||
      !isAssetName(item.symbol) ||
      !isAssetName(item.baseAsset) ||
      !isAssetName(item.quoteAsset) ||
      symbols.has(item.symbol)
    ) {
      continue;
    }

    symbols.set(item.symbol, {
      symbol: item.symbol,
      baseAsset: item.baseAsset,
      quoteAsset: item.quoteAsset,
    });
  }

  return [...symbols.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

function parseMarketTickers(data: unknown): Map<string, MarketTicker> {
  if (!Array.isArray(data)) {
    throw new Error("Invalid market ticker response.");
  }

  const tickers = new Map<string, MarketTicker>();

  for (const item of data) {
    if (!isRecord(item) || !isAssetName(item.symbol)) continue;

    const price = parseDecimal(item.lastPrice);
    const changePercent24h = parseDecimal(item.priceChangePercent);
    const high24h = parseDecimal(item.highPrice);
    const low24h = parseDecimal(item.lowPrice);
    const volume24h = parseDecimal(item.volume);
    const quoteVolume24h = parseDecimal(item.quoteVolume);
    const sourceCloseTime = item.closeTime;
    const numbers = [
      price,
      changePercent24h,
      high24h,
      low24h,
      volume24h,
      quoteVolume24h,
    ];

    if (
      !numbers.every(Number.isFinite) ||
      price <= 0 ||
      high24h <= 0 ||
      low24h <= 0 ||
      high24h < low24h ||
      volume24h < 0 ||
      quoteVolume24h < 0 ||
      typeof sourceCloseTime !== "number" ||
      !Number.isSafeInteger(sourceCloseTime) ||
      sourceCloseTime <= 0
    ) {
      continue;
    }

    const previous = tickers.get(item.symbol);
    if (previous && previous.sourceCloseTime >= sourceCloseTime) continue;

    tickers.set(item.symbol, {
      symbol: item.symbol,
      price,
      changePercent24h,
      high24h,
      low24h,
      volume24h,
      quoteVolume24h,
      sourceCloseTime,
    });
  }

  return tickers;
}
