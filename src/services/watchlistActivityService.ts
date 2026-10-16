import type { MarketSnapshot } from "@/src/types/market";

export const ACTIVITY_REFRESH_MS = 6 * 60 * 60 * 1000;
export type WatchlistActivity = {
  version: 1;
  symbols: string[];
  rangePercent: number;
  calculatedAt: number;
  sourceReceivedAt: number;
};
export const watchlistKey = (symbols: string[]) =>
  JSON.stringify([...new Set(symbols)].sort());

export function getActivityLevel(range: number): {
  label: string;
  tone: "success" | "primary" | "accent";
} {
  if (range < 3) return { label: "Low range", tone: "success" };
  if (range < 10) return { label: "Moderate range", tone: "primary" };
  return { label: "High range", tone: "accent" };
}

export function getWatchlistRanges(
  symbols: string[],
  snapshot: MarketSnapshot | null,
): number[] {
  const assets = new Map(
    snapshot?.assets.map((asset) => [asset.symbol, asset]),
  );
  const ranges: number[] = [];
  for (const symbol of new Set(symbols)) {
    const ticker = assets.get(symbol)?.ticker;
    if (
      !ticker ||
      !Number.isFinite(ticker.high24h) ||
      !Number.isFinite(ticker.low24h) ||
      ticker.low24h <= 0 ||
      ticker.high24h < ticker.low24h
    )
      continue;
    const midpoint = ticker.high24h / 2 + ticker.low24h / 2;
    const range = ((ticker.high24h - ticker.low24h) / midpoint) * 100;
    if (Number.isFinite(range)) ranges.push(range);
  }
  return ranges;
}

export function calculateWatchlistActivity(
  symbols: string[],
  snapshot: MarketSnapshot,
  now = Date.now(),
): WatchlistActivity | null {
  const unique = [...new Set(symbols)].sort();
  const ranges = getWatchlistRanges(unique, snapshot).sort((a, b) => a - b);
  if (
    unique.length === 0 ||
    ranges.length !== unique.length ||
    snapshot.receivedAt > now
  )
    return null;
  const middle = Math.floor(ranges.length / 2);
  const rangePercent =
    ranges.length % 2
      ? ranges[middle]
      : (ranges[middle - 1] + ranges[middle]) / 2;
  return {
    version: 1,
    symbols: unique,
    rangePercent,
    calculatedAt: now,
    sourceReceivedAt: snapshot.receivedAt,
  };
}

export function activityIsCurrent(
  activity: WatchlistActivity,
  symbols: string[],
  now = Date.now(),
): boolean {
  return (
    watchlistKey(activity.symbols) === watchlistKey(symbols) &&
    now >= activity.calculatedAt &&
    now - activity.calculatedAt < ACTIVITY_REFRESH_MS
  );
}

export function parseWatchlistActivity(
  stored: string | null,
  userId: string,
): WatchlistActivity | null {
  if (stored === null) return null;
  const item: unknown = JSON.parse(stored);
  if (
    !item ||
    typeof item !== "object" ||
    !("userId" in item) ||
    item.userId !== userId ||
    !("activity" in item)
  )
    throw new Error("Saved activity unavailable.");
  const value = item.activity as Partial<WatchlistActivity> | null;
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.symbols) ||
    value.symbols.length === 0 ||
    !value.symbols.every(
      (symbol) => typeof symbol === "string" && symbol.length > 0,
    ) ||
    new Set(value.symbols).size !== value.symbols.length ||
    typeof value.rangePercent !== "number" ||
    !Number.isFinite(value.rangePercent) ||
    value.rangePercent < 0 ||
    value.rangePercent > 200 ||
    typeof value.calculatedAt !== "number" ||
    !Number.isSafeInteger(value.calculatedAt) ||
    value.calculatedAt <= 0 ||
    typeof value.sourceReceivedAt !== "number" ||
    !Number.isSafeInteger(value.sourceReceivedAt) ||
    value.sourceReceivedAt <= 0 ||
    value.sourceReceivedAt > value.calculatedAt
  )
    throw new Error("Saved activity unavailable.");
  return value as WatchlistActivity;
}
