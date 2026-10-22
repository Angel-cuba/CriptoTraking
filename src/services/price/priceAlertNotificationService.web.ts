import type { MarketSymbol } from "@/src/types/market";
import type {
  PriceAlertEvent,
  PriceAlertNotificationStatus,
} from "@/src/types/priceAlert";

export async function sendPriceAlertNotification(
  _event: PriceAlertEvent,
  _canSend: () => boolean,
  _asset?: MarketSymbol,
): Promise<PriceAlertNotificationStatus> {
  return "unsupported";
}

export async function clearPriceAlertNotifications(
  _userId: string,
  _symbols?: readonly string[],
): Promise<void> {}

export function listenForPriceAlertNotificationTap(
  _userId: string,
  _openAlerts: () => void,
): () => void {
  return () => {};
}
