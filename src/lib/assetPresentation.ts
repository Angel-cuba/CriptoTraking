import type { AssetSignal } from "@/src/services/signal/signalService";
import type { MarketSymbol } from "@/src/types/market";
import type {
  PriceAlertEvent,
  PriceAlertNotificationStatus,
} from "@/src/types/priceAlert";

export const SIGNAL_COPY: Record<
  AssetSignal["type"],
  { label: string; summary: string }
> = {
  BUY: {
    label: "Upward signal",
    summary: "The recent price average moved above the longer average.",
  },
  SELL: {
    label: "Downward signal",
    summary: "The recent price average moved below the longer average.",
  },
  NEUTRAL: {
    label: "No new signal",
    summary: "The recent and longer price averages did not cross in the latest completed hour.",
  },
};

export const DELIVERY_LABELS: Record<PriceAlertNotificationStatus, string> = {
  pending: "Notification status unknown",
  unknown: "Notification status unknown",
  scheduled: "Notification queued",
  "permission-denied": "Blocked by device settings",
  disabled: "Notifications off",
  failed: "Could not create notification",
  unsupported: "Notifications unavailable here",
  skipped: "Notification not created",
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
    title: `${notificationPair(signal.symbol, asset)} · ${SIGNAL_COPY[signal.type].label}`,
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
