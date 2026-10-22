import type { MarketAsset } from "@/src/types/market";

export function getMarketSuggestions(assets: MarketAsset[]): MarketAsset[] {
  return assets
    .filter(
      (asset) =>
        asset.quoteAsset === "USDT" &&
        asset.ticker &&
        Number.isFinite(asset.ticker.quoteVolume24h) &&
        asset.ticker.quoteVolume24h > 0,
    )
    .sort(
      (a, b) =>
        b.ticker!.quoteVolume24h - a.ticker!.quoteVolume24h ||
        a.symbol.localeCompare(b.symbol),
    )
    .slice(0, 10);
}
