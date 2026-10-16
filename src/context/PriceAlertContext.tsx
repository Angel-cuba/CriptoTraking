import { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MarketSnapshot } from "@/src/types/market";
import type { PriceAlertEvent, PriceAlertHistory } from "@/src/types/priceAlert";
import { applyPriceAlertSnapshot, resetPriceAlertHistory } from "@/src/services/priceAlertHistoryService";
import { loadPriceAlertHistory, savePriceAlertHistory } from "@/src/services/priceAlertStorage";
import { useProfile } from "@/src/hooks/useProfile";
import { MarketCatalogProvider } from "@/src/context/MarketCatalogContext";

type PriceAlertContextValue = {
  events: PriceAlertEvent[];
  loading: boolean;
  error: string | null;
  enabled: boolean | null;
  pendingEnabled: boolean | null;
  savingPreference: boolean;
  setEnabled: (enabled: boolean) => void;
  retry: () => void;
};

export const PriceAlertContext = createContext<PriceAlertContextValue | undefined>(undefined);

export function PriceAlertProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const { profile } = useProfile();
  const [events, setEvents] = useState<PriceAlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setSavedEnabled] = useState<boolean | null>(null);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [savingPreference, setSavingPreference] = useState(false);
  const requestedPreference = useRef<{ enabled: boolean } | null>(null);
  const saved = useRef<PriceAlertHistory | null>(null);
  const queue = useRef(Promise.resolve());
  const active = useRef(false);
  const generation = useRef(0);
  const paused = useRef(true);
  const revision = useRef(0);
  // Failed writes must not undo a pause or a membership reset.
  const resetAll = useRef(false);
  const resetSymbols = useRef(new Set<string>());
  const watchlist = useRef<string[] | null>(null);
  const latestSnapshot = useRef<MarketSnapshot | null>(null);
  const watchlistKey = useMemo(() => profile?.id === userId ? JSON.stringify([...new Set(profile.watchlist)].sort()) : null, [profile, userId]);

  // Serialize storage work; publish references and events only after a successful save.
  const enqueue = useCallback((update: (history: PriceAlertHistory) => PriceAlertHistory | null) => {
    const version = generation.current;
    const currentSession = () => active.current && version === generation.current;
    queue.current = queue.current.then(async () => {
      if (!currentSession()) return;
      let preference: { enabled: boolean } | null = null;
      try {
        if (!saved.current) {
          const history = await loadPriceAlertHistory(userId);
          if (!currentSession()) return;
          saved.current = resetPriceAlertHistory(history);
          setEvents(saved.current.events);
          setSavedEnabled(saved.current.enabled);
          setError(null);
        }
        const currentRevision = revision.current;
        let current = resetPriceAlertHistory(saved.current, resetAll.current ? undefined : resetSymbols.current);
        preference = requestedPreference.current;
        if (preference) {
          setSavingPreference(true);
          current = { ...current, enabled: preference.enabled };
        }
        const next = update(current) ?? current;
        if (next !== saved.current) {
          await savePriceAlertHistory(next);
          if (!currentSession()) return;
          saved.current = next;
          setEvents(next.events);
          setSavedEnabled(next.enabled);
          setError(null);
        }
        if (currentRevision === revision.current) {
          resetAll.current = false;
          resetSymbols.current.clear();
        }
        if (preference && requestedPreference.current === preference) {
          requestedPreference.current = null;
          setPendingEnabled(null);
          // Only quotes received after confirmation can establish a new baseline.
          revision.current++;
          latestSnapshot.current = null;
        }
      } catch (failure) {
        if (currentSession()) setError(failure instanceof Error ? failure.message : "Unable to save price alerts.");
      } finally {
        if (currentSession()) setLoading(false);
        if (currentSession() && preference &&
          (requestedPreference.current === null || requestedPreference.current === preference)) setSavingPreference(false);
      }
    });
  }, [userId]);

  useEffect(() => {
    const version = ++generation.current;
    active.current = true;
    enqueue(() => null);
    return () => {
      active.current = false;
      generation.current = version + 1;
      paused.current = true;
    };
  }, [enqueue]);

  useLayoutEffect(() => {
    const before = new Set(watchlist.current);
    const selected: string[] | null = watchlistKey === null ? null : JSON.parse(watchlistKey);
    const after = new Set(selected);
    const changed = new Set([...before, ...after].filter((symbol) => before.has(symbol) !== after.has(symbol)));
    for (const symbol of changed) resetSymbols.current.add(symbol);
    watchlist.current = selected;
    revision.current++;
    latestSnapshot.current = null;
    enqueue(() => null);
  }, [watchlistKey, enqueue]);

  const processSnapshot = useCallback((snapshot: MarketSnapshot) => {
    const currentRevision = revision.current;
    paused.current = false;
    latestSnapshot.current = snapshot;
    enqueue((history) => {
      if (paused.current || currentRevision !== revision.current || !watchlist.current ||
        !history.enabled || requestedPreference.current !== null) return null;
      return applyPriceAlertSnapshot(history, watchlist.current, snapshot, Date.now());
    });
  }, [enqueue]);

  const pause = useCallback(() => {
    paused.current = true;
    revision.current++;
    resetAll.current = true;
    latestSnapshot.current = null;
    enqueue(() => null);
  }, [enqueue]);

  const setEnabled = useCallback((next: boolean) => {
    if (!active.current || !saved.current) return;
    requestedPreference.current = { enabled: next };
    setPendingEnabled(next);
    setSavingPreference(true);
    revision.current++;
    resetAll.current = true;
    latestSnapshot.current = null;
    enqueue(() => null);
  }, [enqueue]);

  const retry = useCallback(() => {
    if (requestedPreference.current !== null) enqueue(() => null);
    else if (saved.current?.enabled && latestSnapshot.current && !paused.current) processSnapshot(latestSnapshot.current);
    else enqueue(() => null);
  }, [enqueue, processSnapshot]);

  const value = useMemo(() => ({ events, loading, error, enabled, pendingEnabled, savingPreference, setEnabled, retry }),
    [events, loading, error, enabled, pendingEnabled, savingPreference, setEnabled, retry]);

  return (
    <PriceAlertContext.Provider value={value}>
      <MarketCatalogProvider onSnapshot={processSnapshot} onPause={pause}>
        {children}
      </MarketCatalogProvider>
    </PriceAlertContext.Provider>
  );
}
