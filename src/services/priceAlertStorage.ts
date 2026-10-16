import Storage from 'expo-sqlite/kv-store';

import { parsePriceAlertHistory } from '@/src/services/priceAlertHistoryService';
import type { PriceAlertHistory } from '@/src/types/priceAlert';

const pending = new Map<string, Promise<unknown>>();
const storageKey = (userId: string) => `kripto.price-alerts.v1.${userId}`;

function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const next = (pending.get(key) ?? Promise.resolve()).catch(() => {}).then(operation);
  pending.set(key, next);
  return next.finally(() => { if (pending.get(key) === next) pending.delete(key); });
}

export function loadPriceAlertHistory(userId: string): Promise<PriceAlertHistory> {
  const key = storageKey(userId);
  return serialize(key, async () => parsePriceAlertHistory(await Storage.getItem(key), userId));
}

export function savePriceAlertHistory(history: PriceAlertHistory): Promise<void> {
  const key = storageKey(history.userId);
  const stored = JSON.stringify(history);
  parsePriceAlertHistory(stored, history.userId);
  // Store the events and their evaluation state together, including across remounts.
  return serialize(key, () => Storage.setItem(key, stored));
}
