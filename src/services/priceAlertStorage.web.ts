import { parsePriceAlertHistory } from "@/src/services/priceAlertHistoryService";
import type { PriceAlertHistory } from "@/src/types/priceAlert";

const pending = new Map<string, Promise<unknown>>();
const storageKey = (userId: string) => `kripto.price-alerts.v1.${userId}`;

function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const next = (pending.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(operation);
  pending.set(key, next);
  return next.finally(() => {
    if (pending.get(key) === next) pending.delete(key);
  });
}

export function loadPriceAlertHistory(
  userId: string,
): Promise<PriceAlertHistory> {
  const key = storageKey(userId);
  return serialize(key, async () =>
    parsePriceAlertHistory(
      typeof window === "undefined" ? null : window.localStorage.getItem(key),
      userId,
    ),
  );
}

export function savePriceAlertHistory(
  history: PriceAlertHistory,
): Promise<void> {
  const key = storageKey(history.userId);
  const stored = JSON.stringify(history);
  parsePriceAlertHistory(stored, history.userId);
  return serialize(key, async () => {
    if (typeof window === "undefined")
      throw new Error("Price alert storage is unavailable.");
    window.localStorage.setItem(key, stored);
  });
}
