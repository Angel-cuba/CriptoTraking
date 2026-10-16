import {
  parseWatchlistActivity,
  type WatchlistActivity,
} from "@/src/services/watchlistActivityService";
import Storage from "expo-sqlite/kv-store";

const pending = new Map<string, Promise<void>>();
const storageKey = (userId: string) => `kripto.watchlist-activity.v1.${userId}`;
export async function loadWatchlistActivity(
  userId: string,
): Promise<WatchlistActivity | null> {
  await pending.get(userId)?.catch(() => {});
  return parseWatchlistActivity(
    await Storage.getItem(storageKey(userId)),
    userId,
  );
}
export async function saveWatchlistActivity(
  userId: string,
  activity: WatchlistActivity,
): Promise<void> {
  const value = JSON.stringify({ userId, activity });
  parseWatchlistActivity(value, userId);
  const write = (pending.get(userId) ?? Promise.resolve())
    .catch(() => {})
    .then(() => Storage.setItem(storageKey(userId), value));
  pending.set(userId, write);
  try {
    await write;
  } finally {
    if (pending.get(userId) === write) pending.delete(userId);
  }
}
