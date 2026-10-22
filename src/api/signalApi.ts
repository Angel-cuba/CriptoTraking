import type { MarketCandle } from "@/src/services/market/marketService";

export type SignalType = "BUY" | "SELL" | "NEUTRAL";
export type SignalResult = {
  type: SignalType;
  reason: string;
  timestamp: number;
  sma5: number;
  sma10: number;
};

function average(prices: number[], period: number): number {
  return prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
}

export function calculateSignal(
  candles: MarketCandle[],
  now = Date.now(),
): SignalResult {
  const closed = candles
    .filter((candle) => candle.closeTime < now)
    .sort((left, right) => left.openTime - right.openTime);
  if (closed.length < 11)
    throw new Error("At least 11 closed hourly candles are required.");

  const prices = closed.map((candle, index) => {
    if (
      !Number.isFinite(candle.close) ||
      candle.close <= 0 ||
      !Number.isFinite(candle.openTime) ||
      candle.closeTime < candle.openTime ||
      (index > 0 && closed[index - 1].openTime === candle.openTime)
    ) {
      throw new Error("Invalid closed candle data.");
    }
    return candle.close;
  });
  const previous = prices.slice(0, -1);
  const previousSMA5 = average(previous, 5);
  const previousSMA10 = average(previous, 10);
  const sma5 = average(prices, 5);
  const sma10 = average(prices, 10);
  const timestamp = closed[closed.length - 1].closeTime;

  if (previousSMA5 <= previousSMA10 && sma5 > sma10) {
    return {
      type: "BUY",
      reason: "SMA5 crossed above SMA10.",
      timestamp,
      sma5,
      sma10,
    };
  }
  if (previousSMA5 >= previousSMA10 && sma5 < sma10) {
    return {
      type: "SELL",
      reason: "SMA5 crossed below SMA10.",
      timestamp,
      sma5,
      sma10,
    };
  }
  return {
    type: "NEUTRAL",
    reason: "No new SMA5/SMA10 crossover detected.",
    timestamp,
    sma5,
    sma10,
  };
}
