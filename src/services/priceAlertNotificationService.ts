import {
  clearLocalNotifications,
  getNotificationPermission,
  notificationsSupported,
  prepareNotificationChannel,
} from "@/src/services/localNotificationService";
import type { MarketSymbol } from "@/src/types/market";
import type {
  PriceAlertEvent,
  PriceAlertNotificationStatus,
} from "@/src/types/priceAlert";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function sendPriceAlertNotification(
  event: PriceAlertEvent,
  canSend: () => boolean,
  asset?: MarketSymbol,
): Promise<PriceAlertNotificationStatus> {
  if (!notificationsSupported) return "unsupported";
  if (!canSend()) return "skipped";
  const permission = await getNotificationPermission();
  if (!canSend()) return "skipped";
  if (permission !== "granted" && permission !== "provisional")
    return "permission-denied";
  await prepareNotificationChannel("price-alerts");
  if (!canSend()) return "skipped";
  const pair = asset ? `${asset.baseAsset}/${asset.quoteAsset}` : event.symbol;
  const quote = asset ? ` ${asset.quoteAsset}` : " (pair quote units)";
  const format = (price: number) =>
    price < 0.0000001
      ? price.toExponential(4)
      : price.toLocaleString("en-US", { maximumSignificantDigits: 10 });
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: `kripto.price.${event.id}`,
    content: {
      title: `${pair} ${event.direction === "up" ? "up" : "down"} ${Math.abs(event.changePercent).toFixed(2)}%`,
      body: `Since reference: ${format(event.referencePrice)} to ${format(event.price)}${quote}.`,
      sound: "default",
      data: {
        kind: "price-alert",
        userId: event.userId,
        symbol: event.symbol,
        eventId: event.id,
      },
    },
    trigger: Platform.OS === "android" ? { channelId: "price-alerts" } : null,
  });
  if (!canSend()) {
    await Promise.all([
      Notifications.cancelScheduledNotificationAsync(identifier),
      Notifications.dismissNotificationAsync(identifier),
    ]);
    return "skipped";
  }
  return "scheduled";
}

export function clearPriceAlertNotifications(
  userId: string,
  symbols?: readonly string[],
): Promise<void> {
  return clearLocalNotifications("price-alert", userId, symbols);
}

export function listenForPriceAlertNotificationTap(
  userId: string,
  openAlerts: () => void,
) {
  if (!notificationsSupported) return () => {};
  let active = true;
  const handled = new Set<string>();
  const handle = (response: Notifications.NotificationResponse) => {
    if (
      !active ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    )
      return;
    const data = response.notification.request.content.data;
    if (data?.kind !== "price-alert") return;
    Notifications.clearLastNotificationResponse();
    if (
      data.userId !== userId ||
      typeof data.eventId !== "string" ||
      !data.eventId ||
      handled.has(data.eventId)
    )
      return;
    handled.add(data.eventId);
    openAlerts();
  };
  const subscription =
    Notifications.addNotificationResponseReceivedListener(handle);
  const response = Notifications.getLastNotificationResponse();
  if (response) handle(response);
  return () => {
    active = false;
    subscription.remove();
  };
}
