import type { AssetSignal } from "@/src/services/signal/signalService";
import type { MarketSymbol } from "@/src/types/market";
import type {
  PriceAlertEvent,
  PriceAlertNotificationStatus,
} from "@/src/types/priceAlert";

export const DELIVERY_LABELS: Record<PriceAlertNotificationStatus, string> = {
  pending: "Notification status unconfirmed",
  unknown: "Notification status unconfirmed",
  scheduled: "Notification scheduled",
  "permission-denied": "Notification permission denied",
  disabled: "Price notifications off",
  failed: "Notification scheduling failed",
  unsupported: "Notifications unavailable",
  skipped: "Notification skipped",
};

export function formatAssetPrice(
  value: number,
  maximumSignificantDigits = 10,
): string {
  return value.toLocaleString("en-US", {
    maximumSignificantDigits,
    notation: value !== 0 && Math.abs(value) < 0.0000001 ? "scientific" : "standard",
  });
}

function notificationPair(symbol: string, asset?: MarketSymbol): string {
  return asset?.symbol === symbol
    ? `${asset.baseAsset}/${asset.quoteAsset}`
    : symbol;
}

export function getSignalNotificationCopy(
  signal: AssetSignal,
  asset?: MarketSymbol,
): { title: string; body: string } | null {
  if (signal.type === "NEUTRAL") return null;
  const direction = signal.type === "BUY" ? "Upward" : "Downward";
  return {
    title: `${notificationPair(signal.symbol, asset)} · ${direction} signal`,
    body: `${direction} shift in hourly price analysis.`,
  };
}

export function getPriceAlertNotificationCopy(
  event: PriceAlertEvent,
  asset?: MarketSymbol,
): { title: string; body: string } {
  const quote = asset?.symbol === event.symbol ? ` ${asset.quoteAsset}` : "";
  return {
    title: `${notificationPair(event.symbol, asset)} · Price ${event.direction} ${Math.abs(event.changePercent).toFixed(2)}%`,
    body: `${formatAssetPrice(event.referencePrice)} → ${formatAssetPrice(event.price)}${quote}.`,
  };
}
