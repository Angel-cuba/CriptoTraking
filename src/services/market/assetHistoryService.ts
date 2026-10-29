import { calculateSignal } from "@/src/api/signalApi";
import { fetchMarketData } from "./marketCatalogService";

export type AssetCandle = {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type AssetHistory = {
  candles: AssetCandle[];
  receivedAt: number;
  reading: ReturnType<typeof calculateSignal> | null;
};

const HOUR_MS = 3_600_000;
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, AssetHistory>();

export function getCachedAssetHistory(
  symbol: string,
): AssetHistory | undefined {
  return cache.get(symbol);
}

export function parseAssetCandles(data: unknown, now: number): AssetCandle[] {
  if (!Array.isArray(data)) throw new Error("Invalid candle response.");
  const candles: AssetCandle[] = [];
  for (const row of data) {
    if (!Array.isArray(row) || row.length < 7)
      throw new Error("Invalid candle response.");
    const [openTime, open, high, low, close, volume, closeTime] = row;
    const values = [open, high, low, close, volume].map((value) =>
      typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)
        ? Number(value)
        : NaN,
    );
    const [o, h, l, c, v] = values;
    if (
      typeof openTime !== "number" ||
      !Number.isSafeInteger(openTime) ||
      openTime < 0 ||
      typeof closeTime !== "number" ||
      !Number.isSafeInteger(closeTime) ||
      closeTime - openTime !== HOUR_MS - 1 ||
      !values.every(Number.isFinite) ||
      Math.min(o, h, l, c) <= 0 ||
      v < 0 ||
      h < Math.max(o, c) ||
      l > Math.min(o, c) ||
      h < l ||
      (candles.length > 0 &&
        openTime !== candles[candles.length - 1].openTime + HOUR_MS)
    )
      throw new Error("Incomplete or invalid hourly candles.");
    // The provider includes the current, unfinished hour; indicators use closed candles only.
    if (closeTime >= now) continue;
    candles.push({
      openTime,
      closeTime,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    });
  }
  return candles;
}

export async function getAssetHistory(
  symbol: string,
  signal: AbortSignal,
  refresh = false,
): Promise<AssetHistory> {
  if (!/^[\p{L}\p{N}]{2,80}$/u.test(symbol))
    throw new Error("Invalid market symbol.");
  if (signal.aborted) throw new Error("History request cancelled.");
  const cached = cache.get(symbol);
  if (!refresh && cached && Date.now() - cached.receivedAt < CACHE_TTL_MS)
    return cached;
  // Ten warm-up candles provide full SMA windows before the 24 visible hourly candles.
  const data = await fetchMarketData(
    `/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=35`,
    signal,
  );
  if (signal.aborted) throw new Error("History request cancelled.");
  const receivedAt = Date.now();
  const candles = parseAssetCandles(data, receivedAt);
  const history = {
    candles,
    receivedAt,
    reading: candles.length >= 11 ? calculateSignal(candles, receivedAt) : null,
  };
  cache.delete(symbol);
  cache.set(symbol, history);
  if (cache.size > 20) cache.delete(cache.keys().next().value!);
  return history;
}
