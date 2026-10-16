import { useAuth } from "@/src/hooks/useAuth";
import { useMarketCatalog } from "@/src/hooks/useMarketCatalog";
import { useProfile } from "@/src/hooks/useProfile";
import {
  activityIsCurrent,
  calculateWatchlistActivity,
  getWatchlistRanges,
  watchlistKey,
  type WatchlistActivity,
} from "@/src/services/watchlistActivityService";
import {
  loadWatchlistActivity,
  saveWatchlistActivity,
} from "@/src/services/watchlistActivityStorage";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useWatchlistActivity() {
  const { user } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useProfile();
  const market = useMarketCatalog();
  const userId = user?.id;
  const symbols = profile?.watchlist ?? [];
  const signature = profile ? watchlistKey(symbols) : null;
  const [stored, setStored] = useState<{
    userId: string;
    activity: WatchlistActivity | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const owner = useRef<{
    userId: string | undefined;
    signature: string | null;
    refresh: boolean;
    active: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    const previous = owner.current;
    const identity = {
      userId,
      signature,
      active: true,
      refresh: Boolean(
        previous &&
        previous.userId === userId &&
        previous.signature !== null &&
        previous.signature !== signature,
      ),
    };
    owner.current = identity;
    return () => {
      identity.active = false;
    };
  }, [userId, signature]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadWatchlistActivity(userId)
      .then((activity) => {
        if (cancelled) return;
        setStored((previous) =>
          previous?.userId === userId &&
          previous.activity &&
          (!activity || previous.activity.calculatedAt > activity.calculatedAt)
            ? previous
            : { userId, activity },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setStored((previous) =>
            previous?.userId === userId ? previous : { userId, activity: null },
          );
          setError("Saved activity unavailable on this device.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, retryCount]);

  const ready = Boolean(userId && stored?.userId === userId);
  const matching =
    ready &&
    stored?.activity &&
    watchlistKey(stored.activity.symbols) === signature
      ? stored.activity
      : null;
  const missingCount =
    new Set(symbols).size - getWatchlistRanges(symbols, market.snapshot).length;

  useEffect(() => {
    if (
      !userId ||
      !ready ||
      !profile ||
      profileLoading ||
      profileError ||
      signature === null ||
      !market.snapshot ||
      market.paused ||
      market.stale ||
      market.error ||
      missingCount > 0
    )
      return;
    const currentSymbols: string[] = JSON.parse(signature);
    if (
      currentSymbols.length === 0 ||
      (!owner.current?.refresh &&
        matching &&
        activityIsCurrent(matching, currentSymbols))
    )
      return;
    const identity = owner.current;
    const snapshot = market.snapshot;
    const timer = setTimeout(() => {
      if (owner.current !== identity || !identity?.active) return;
      const activity = calculateWatchlistActivity(currentSymbols, snapshot);
      if (!activity) return;
      identity.refresh = false;
      setStored({ userId, activity });
      setError(null);
      void saveWatchlistActivity(userId, activity).catch(() => {
        if (owner.current === identity && identity.active)
          setError("Activity could not be saved on this device.");
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [
    userId,
    ready,
    profile,
    profileLoading,
    profileError,
    signature,
    matching,
    market.snapshot,
    market.paused,
    market.stale,
    market.error,
    missingCount,
    retryCount,
  ]);

  const activity =
    profile && (!market.snapshot || missingCount === 0) ? matching : null;
  const outdated = Boolean(
    activity &&
    (!market.snapshot ||
      profileLoading ||
      profileError ||
      market.paused ||
      market.stale ||
      market.error ||
      !activityIsCurrent(activity, symbols)),
  );
  return {
    activity,
    outdated,
    missingCount,
    loading: Boolean(userId && !ready),
    error,
    retry: () => {
      if (owner.current) owner.current.refresh = true;
      setRetryCount((value) => value + 1);
    },
  };
}
