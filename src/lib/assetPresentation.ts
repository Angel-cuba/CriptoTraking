import type { PriceAlertNotificationStatus } from "@/src/types/priceAlert";

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
