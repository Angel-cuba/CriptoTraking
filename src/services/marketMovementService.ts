import type {
  MarketMovement,
  MarketPriceObservation,
  MarketSnapshot,
} from '@/src/types/market';

const MAX_COMPARISON_GAP_MS = 120_000;

export function compareMarketPrices(
  snapshot: MarketSnapshot,
  previous: ReadonlyMap<string, MarketPriceObservation>,
) {
  const observations = new Map<string, MarketPriceObservation>();
  const movements = new Map<string, MarketMovement>();

  for (const asset of snapshot.assets) {
    const before = previous.get(asset.symbol);
    const { ticker } = asset;
    // Missing or repeated tickers must not move the reference.
    if (before) observations.set(asset.symbol, before);
    if (!ticker || (before && ticker.sourceCloseTime <= before.sourceCloseTime)) continue;

    const elapsed = before ? snapshot.receivedAt - before.receivedAt : 0;
    if (before && elapsed > 0 && elapsed <= MAX_COMPARISON_GAP_MS) {
      const changePercent = ((ticker.price - before.price) / before.price) * 100;
      if (Number.isFinite(changePercent)) {
        movements.set(asset.symbol, {
          changePercent,
          previousReceivedAt: before.receivedAt,
          receivedAt: snapshot.receivedAt,
        });
      }
    }

    observations.set(asset.symbol, {
      price: ticker.price,
      sourceCloseTime: ticker.sourceCloseTime,
      receivedAt: snapshot.receivedAt,
    });
  }

  return { observations, movements };
}
