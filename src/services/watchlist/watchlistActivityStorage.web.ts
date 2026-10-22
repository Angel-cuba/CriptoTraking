import {
  parseWatchlistActivity,
  type WatchlistActivity,
} from "@/src/services/watchlist/watchlistActivityService";

const storageKey = (userId: string) => `kripto.watchlist-activity.v1.${userId}`;
export async function loadWatchlistActivity(
  userId: string,
): Promise<WatchlistActivity | null> {
  return parseWatchlistActivity(
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(storageKey(userId)),
    userId,
  );
}
export async function saveWatchlistActivity(
  userId: string,
  activity: WatchlistActivity,
): Promise<void> {
  if (typeof window === "undefined")
    throw new Error("Local activity storage is unavailable.");
  const value = JSON.stringify({ userId, activity });
  parseWatchlistActivity(value, userId);
  window.localStorage.setItem(storageKey(userId), value);
}
