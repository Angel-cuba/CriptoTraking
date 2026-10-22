let retryAt = 0;
export class BinanceRateLimitError extends Error {
  constructor() {
    super("Provider limit reached. Try again later.");
    this.name = "BinanceRateLimitError";
  }
}

export type MarketCandle = {
  openTime: number;
  closeTime: number;
  close: number;
};

function parseCandles(data: unknown): MarketCandle[] {
  if (!Array.isArray(data)) throw new Error("Invalid market response.");
  return data.map((row) => {
    if (
      !Array.isArray(row) ||
      row.length < 7 ||
      typeof row[0] !== "number" ||
      typeof row[6] !== "number" ||
      typeof row[4] !== "string" ||
      row[4].trim() === ""
    ) {
      throw new Error("Invalid market candle.");
    }
    const openTime = row[0];
    const close = Number(row[4]);
    const closeTime = row[6];
    if (
      !Number.isFinite(openTime) ||
      !Number.isFinite(closeTime) ||
      !Number.isFinite(close) ||
      close <= 0 ||
      openTime < 0 ||
      closeTime < openTime
    ) {
      throw new Error("Invalid market candle values.");
    }
    return { openTime, closeTime, close };
  });
}

export async function getBinanceData(
  symbol: string,
  signal?: AbortSignal,
): Promise<MarketCandle[]> {
  if (Date.now() < retryAt) throw new BinanceRateLimitError();
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 10_000);

  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=1h&limit=20`,
      { signal: controller.signal },
    );
    if (response.status === 429 || response.status === 418) {
      const seconds = Number(response.headers.get("Retry-After"));
      retryAt =
        Date.now() +
        (Number.isFinite(seconds) && seconds > 0
          ? Math.max(seconds * 1000, 1000)
          : response.status === 418
            ? 120_000
            : 60_000);
      throw new BinanceRateLimitError();
    }
    if (!response.ok)
      throw new Error(`Market request failed (${response.status}).`);
    return parseCandles(await response.json());
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
