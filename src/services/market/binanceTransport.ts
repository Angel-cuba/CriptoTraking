const BINANCE_BASE_URL = "https://api.binance.com";
let retryAfter = 0;

export class MarketRateLimitError extends Error {
  constructor(readonly retryAt: number) {
    super("Market provider rate limit reached.");
    this.name = "MarketRateLimitError";
  }
}

export function ensureRequestAllowed(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Market request cancelled.");
  if (Date.now() < retryAfter) throw new MarketRateLimitError(retryAfter);
}

function getRetryTime(response: Response): number {
  const now = Date.now();
  const header = response.headers.get("Retry-After")?.trim();
  if (header && /^\d+(?:\.\d+)?$/.test(header)) {
    const retryAt = Math.ceil(now + Number(header) * 1000);
    if (Number.isSafeInteger(retryAt)) return Math.max(now + 1000, retryAt);
  } else if (header) {
    const retryAt = Date.parse(header);
    if (Number.isFinite(retryAt) && retryAt > now) return retryAt;
  }
  return now + (response.status === 418 ? 120_000 : 60_000);
}

export async function fetchMarketData(
  path: string,
  signal?: AbortSignal,
): Promise<unknown> {
  ensureRequestAllowed(signal);
  const response = await fetch(`${BINANCE_BASE_URL}${path}`, { signal });

  if (response.status === 429 || response.status === 418) {
    retryAfter = Math.max(retryAfter, getRetryTime(response));
    throw new MarketRateLimitError(retryAfter);
  }
  if (!response.ok) {
    throw new Error(`Binance request failed: ${response.status}`);
  }

  const data: unknown = await response.json();
  ensureRequestAllowed(signal);
  return data;
}
