import { calculateSignal, type SignalResult } from "@/src/api/signalApi";
import {
  BinanceRateLimitError,
  getBinanceData,
} from "@/src/services/market/marketService";

export type AssetSignal = SignalResult & { symbol: string; checkedAt?: number };
type SignalBatch = {
  signals: AssetSignal[];
  failures: Record<string, string>;
};
const BATCH_SIZE = 3;

async function getAssetSignal(
  symbol: string,
  signal?: AbortSignal,
): Promise<AssetSignal> {
  const candles = await getBinanceData(symbol, signal);
  return { symbol, ...calculateSignal(candles), checkedAt: Date.now() };
}

export async function getSignals(
  symbols: readonly string[],
  signal: AbortSignal,
): Promise<SignalBatch> {
  const requested = [...new Set(symbols)].sort();
  const result: SignalBatch = { signals: [], failures: {} };
  for (let offset = 0; offset < requested.length; offset += BATCH_SIZE) {
    if (signal.aborted) throw new Error("Signal request cancelled.");
    const batch = requested.slice(offset, offset + BATCH_SIZE);
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      abort();
    }, 15_000);
    const interrupted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => reject(new Error("Request timed out. Retry this pair.")),
        { once: true },
      );
    });
    let rateLimited = false;
    const readings = new Map<string, AssetSignal>();
    const failures: Record<string, string> = {};
    try {
      await Promise.race([
        Promise.all(
          batch.map(async (symbol) => {
            try {
              const reading = await getAssetSignal(symbol, controller.signal);
              if (!controller.signal.aborted) readings.set(symbol, reading);
            } catch (failure) {
              if (controller.signal.aborted) return;
              failures[symbol] =
                failure instanceof Error
                  ? failure.message
                  : "Hourly reading unavailable.";
              if (failure instanceof BinanceRateLimitError) rateLimited = true;
            }
          }),
        ),
        interrupted,
      ]);
      if (signal.aborted) throw new Error("Signal request cancelled.");
    } catch (failure) {
      if (signal.aborted) throw new Error("Signal request cancelled.");
      for (const symbol of batch) {
        if (!readings.has(symbol) && !failures[symbol]) {
          failures[symbol] =
            failure instanceof Error
              ? failure.message
              : "Hourly reading unavailable.";
        }
      }
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    }
    result.signals.push(...readings.values());
    Object.assign(result.failures, failures);
    if (rateLimited || timedOut) {
      for (const symbol of requested.slice(offset + BATCH_SIZE))
        result.failures[symbol] = rateLimited
          ? "Provider limit reached. Try again later."
          : "Earlier requests timed out. Refresh to check this pair.";
      break;
    }
  }
  if (signal.aborted) throw new Error("Signal request cancelled.");
  return result;
}
