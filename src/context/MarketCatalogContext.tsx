import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  getMarketSnapshot,
  MarketRateLimitError,
} from "@/src/services/marketCatalogService";
import { compareMarketPrices } from "@/src/services/marketMovementService";
import type {
  MarketMovement,
  MarketPriceObservation,
  MarketSnapshot,
} from "@/src/types/market";

const REFRESH_INTERVAL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;
const STALE_AFTER_MS = 120_000;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

type MarketState = {
  snapshot: MarketSnapshot | null;
  loading: boolean;
  error: string | null;
  stale: boolean;
  paused: boolean;
  retryAt: number | null;
  movements: ReadonlyMap<string, MarketMovement>;
};
type PendingRequest = {
  controller: AbortController;
  timeout: ReturnType<typeof setTimeout>;
};
type MarketCatalogState = MarketState & { reload: () => Promise<void> };
export const MarketCatalogContext = createContext<
  MarketCatalogState | undefined
>(undefined);

type MarketCatalogProviderProps = PropsWithChildren<{
  onSnapshot?: (snapshot: MarketSnapshot) => void;
  onPause?: () => void;
}>;

export function MarketCatalogProvider({
  children,
  onSnapshot,
  onPause,
}: MarketCatalogProviderProps) {
  const [state, setState] = useState<MarketState>(() => ({
    snapshot: null,
    loading: true,
    error: null,
    stale: false,
    paused: false,
    retryAt: null,
    movements: new Map(),
  }));
  const refresh = useRef<() => Promise<void>>(async () => {});
  const reload = useCallback(() => refresh.current(), []);

  useEffect(() => {
    let alive = true;
    let active: boolean | null = null;
    let request: PendingRequest | null = null;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let staleTimer: ReturnType<typeof setTimeout> | undefined;
    let cooldownTimer: ReturnType<typeof setTimeout> | undefined;
    let receivedAt = 0;
    let retryAt = 0;
    let observations = new Map<string, MarketPriceObservation>();

    function cancelRequest() {
      const previous = request;
      request = null;
      if (previous) {
        clearTimeout(previous.timeout);
        previous.controller.abort();
      }
    }

    function updateFreshness() {
      clearTimeout(staleTimer);
      if (!receivedAt || !alive) return;
      const remaining = receivedAt + STALE_AFTER_MS - Date.now();
      setState((previous) => ({ ...previous, stale: remaining <= 0 }));
      if (active && remaining > 0)
        staleTimer = setTimeout(() => {
          if (alive && active)
            setState((previous) => ({ ...previous, stale: true }));
        }, remaining);
    }

    function resumeAfterLimit() {
      clearTimeout(cooldownTimer);
      if (!alive || !active) return;
      const remaining = retryAt - Date.now();
      if (remaining > 0) {
        cooldownTimer = setTimeout(
          resumeAfterLimit,
          Math.min(remaining, MAX_TIMER_DELAY_MS),
        );
      } else {
        retryAt = 0;
        void loadMarkets();
      }
    }

    async function loadMarkets(): Promise<void> {
      if (!alive || !active || request) return;
      updateFreshness();
      if (retryAt > Date.now()) {
        resumeAfterLimit();
        return;
      }
      retryAt = 0;
      clearTimeout(cooldownTimer);
      const controller = new AbortController();
      const pending: PendingRequest = {
        controller,
        timeout: setTimeout(() => {
          if (!alive || !active || request !== pending) return;
          cancelRequest();
          setState((previous) => ({
            ...previous,
            loading: false,
            error: "Market request timed out. Please try again.",
          }));
        }, REQUEST_TIMEOUT_MS),
      };
      request = pending;
      const current = () =>
        alive && active && request === pending && !controller.signal.aborted;
      setState((previous) => ({
        ...previous,
        loading: true,
        error: null,
        retryAt: null,
      }));

      await getMarketSnapshot(controller.signal)
        .then((snapshot) => {
          if (!current()) return;
          receivedAt = snapshot.receivedAt;
          const comparison = compareMarketPrices(snapshot, observations);
          observations = comparison.observations;
          setState((previous) => ({
            ...previous,
            snapshot,
            movements: comparison.movements,
            loading: false,
            error: null,
            retryAt: null,
          }));
          updateFreshness();
          onSnapshot?.(snapshot);
        })
        .catch((failure: unknown) => {
          if (!current()) return;
          if (failure instanceof MarketRateLimitError) {
            const blockedUntil = failure.retryAt;
            retryAt = blockedUntil;
            setState((previous) => ({
              ...previous,
              loading: false,
              retryAt: blockedUntil,
              error: `Market provider limit reached. Updates resume after ${new Date(blockedUntil).toLocaleTimeString()}.`,
            }));
            resumeAfterLimit();
          } else {
            setState((previous) => ({
              ...previous,
              loading: false,
              error: "Market data is unavailable. Please try again.",
            }));
          }
        })
        .finally(() => {
          clearTimeout(pending.timeout);
          if (request === pending) request = null;
        });
    }

    function handleAppState(next: AppStateStatus) {
      if (!alive) return;
      const nextActive = next === "active";
      if (nextActive === active) return;
      active = nextActive;
      clearInterval(pollTimer);
      clearTimeout(staleTimer);
      clearTimeout(cooldownTimer);
      setState((previous) => ({
        ...previous,
        paused: !active,
        loading: active ? previous.loading : false,
      }));
      if (active) {
        loadMarkets();
        pollTimer = setInterval(loadMarkets, REFRESH_INTERVAL_MS);
      } else {
        cancelRequest();
        observations = new Map();
        setState((previous) => ({ ...previous, movements: new Map() }));
        onPause?.();
      }
    }

    refresh.current = loadMarkets;
    const subscription = AppState.addEventListener("change", handleAppState);
    const initialLoad = setTimeout(
      () => handleAppState(AppState.currentState),
      0,
    );
    return () => {
      alive = false;
      active = false;
      clearTimeout(initialLoad);
      clearInterval(pollTimer);
      clearTimeout(staleTimer);
      clearTimeout(cooldownTimer);
      subscription.remove();
      cancelRequest();
      refresh.current = async () => {};
      onPause?.();
    };
  }, [onSnapshot, onPause]);

  const value = useMemo(() => ({ ...state, reload }), [state, reload]);
  return (
    <MarketCatalogContext.Provider value={value}>
      {children}
    </MarketCatalogContext.Provider>
  );
}
