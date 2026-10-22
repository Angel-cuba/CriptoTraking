import type { AssetSignal } from "@/src/services/signal/signalService";
import {
  readLegacySignalData,
  readSignalData,
  writeSignalData,
} from "@/src/services/signal/signalStorageBackend";

export type SavedSignals = {
  version: 2;
  userId: string;
  savedAt: number;
  signals: AssetSignal[];
};
const pending = new Map<string, Promise<unknown>>();
const storageKey = (userId: string) => `kripto.signals.v2.${userId}`;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

function isSnapshot(value: unknown, userId: string): value is SavedSignals {
  if (
    !isRecord(value) ||
    (value.version !== 1 && value.version !== 2) ||
    value.userId !== userId ||
    !isPositiveNumber(value.savedAt) ||
    value.savedAt > 8.64e15 ||
    !Array.isArray(value.signals) ||
    value.signals.length > 5000
  )
    return false;
  const savedAt = value.savedAt;
  const symbols = new Set<string>();
  return value.signals.every((signal: unknown) => {
    if (
      !isRecord(signal) ||
      typeof signal.symbol !== "string" ||
      !/^[A-Z0-9_]{2,80}$/.test(signal.symbol) ||
      symbols.has(signal.symbol) ||
      typeof signal.type !== "string" ||
      !["BUY", "SELL", "NEUTRAL"].includes(signal.type) ||
      typeof signal.reason !== "string" ||
      !isPositiveNumber(signal.timestamp) ||
      signal.timestamp > savedAt ||
      !isPositiveNumber(signal.sma5) ||
      !isPositiveNumber(signal.sma10) ||
      (signal.checkedAt !== undefined &&
        (!isPositiveNumber(signal.checkedAt) ||
          signal.checkedAt < signal.timestamp ||
          signal.checkedAt > savedAt))
    )
      return false;
    symbols.add(signal.symbol);
    return true;
  });
}

function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const work = (pending.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(operation);
  pending.set(key, work);
  return work.finally(() => {
    if (pending.get(key) === work) pending.delete(key);
  });
}

export function getSavedSignals(userId: string): Promise<SavedSignals | null> {
  return serialize(storageKey(userId), async () => {
    const current = await readSignalData(storageKey(userId));
    const stored =
      current ?? (await readLegacySignalData(`kripto.signals.v1.${userId}`));
    if (!stored) return null;
    let value: unknown;
    try {
      value = JSON.parse(stored);
    } catch {
      throw new Error("Saved readings are unavailable.");
    }
    if (!isSnapshot(value, userId))
      throw new Error("Saved readings are unavailable.");
    const snapshot: SavedSignals = { ...value, version: 2 };
    // Serialize migration and live saves; retain the original record.
    if (current === null)
      await writeSignalData(storageKey(userId), JSON.stringify(snapshot));
    return snapshot;
  });
}

export async function saveSignals(
  userId: string,
  signals: AssetSignal[],
  savedAt: number,
): Promise<void> {
  const snapshot: SavedSignals = { version: 2, userId, signals, savedAt };
  if (!isSnapshot(snapshot, userId))
    throw new Error("Invalid signal snapshot.");
  const key = storageKey(userId);
  const serialized = JSON.stringify(snapshot);
  // Keep overlapping saves ordered, including across screen remounts.
  return serialize(key, () => writeSignalData(key, serialized));
}
