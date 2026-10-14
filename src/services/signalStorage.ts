import { secureStorage } from '@/src/lib/secureStorage';
import type { AssetSignal } from '@/src/services/signalService';
import { SUPPORTED_ASSETS } from '@/src/types/profile';

export type SavedSignals = { version: 1; userId: string; savedAt: number; signals: AssetSignal[] };
const pendingWrites = new Map<string, Promise<void>>();
const storageKey = (userId: string) => `kripto.signals.v1.${userId}`;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isPositiveNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

function isSnapshot(value: unknown, userId: string): value is SavedSignals {
  if (!isRecord(value) || value.version !== 1 || value.userId !== userId ||
    !isPositiveNumber(value.savedAt) || value.savedAt > 8.64e15 ||
    !Array.isArray(value.signals) || value.signals.length === 0 || value.signals.length > SUPPORTED_ASSETS.length) return false;
  const savedAt = value.savedAt;
  const symbols = new Set<string>();
  return value.signals.every((signal: unknown) => {
    if (!isRecord(signal) || typeof signal.symbol !== 'string' ||
      !SUPPORTED_ASSETS.some((symbol) => symbol === signal.symbol) || symbols.has(signal.symbol) ||
      typeof signal.type !== 'string' || !['BUY', 'SELL', 'NEUTRAL'].includes(signal.type) || typeof signal.reason !== 'string' ||
      !isPositiveNumber(signal.timestamp) || signal.timestamp > savedAt ||
      !isPositiveNumber(signal.sma5) || !isPositiveNumber(signal.sma10)) return false;
    symbols.add(signal.symbol);
    return true;
  });
}

export async function getSavedSignals(userId: string): Promise<SavedSignals | null> {
  const stored = await secureStorage.getItem(storageKey(userId));
  if (!stored) return null;
  let value: unknown;
  try { value = JSON.parse(stored); } catch { return null; }
  return isSnapshot(value, userId) ? value : null;
}

export async function saveSignals(userId: string, signals: AssetSignal[], savedAt: number): Promise<void> {
  const snapshot: SavedSignals = { version: 1, userId, signals, savedAt };
  if (!isSnapshot(snapshot, userId)) throw new Error('Invalid signal snapshot.');
  const key = storageKey(userId);
  const serialized = JSON.stringify(snapshot);
  // Keep overlapping saves ordered, including across screen remounts.
  const write = (pendingWrites.get(key) ?? Promise.resolve()).catch(() => {}).then(() => secureStorage.setItem(key, serialized));
  pendingWrites.set(key, write);
  try { await write; } finally { if (pendingWrites.get(key) === write) pendingWrites.delete(key); }
}
