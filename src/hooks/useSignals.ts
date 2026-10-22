import {
  getSignals,
  type AssetSignal,
} from "@/src/services/signal/signalService";
import {
  getSavedSignals,
  saveSignals,
} from "@/src/services/signal/signalStorage";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

type SignalState = {
  userId: string;
  signature: string | null;
  signals: AssetSignal[];
  freshSymbols: string[];
  failures: Record<string, string>;
  loading: boolean;
  error: string | null;
  cacheError: string | null;
};
type Scope = {
  active: boolean;
  foreground: boolean;
  ready: boolean;
  revision: number;
  symbols: string[] | null;
  pending: AbortController | null;
  readings: AssetSignal[];
};
const initialState = (
  userId: string,
  signature: string | null,
): SignalState => ({
  userId,
  signature,
  signals: [],
  freshSymbols: [],
  failures: {},
  loading: signature !== null && JSON.parse(signature).length > 0,
  error: null,
  cacheError: null,
});

export function useSignals(userId: string, symbols: string[] | null) {
  const signature =
    symbols === null ? null : JSON.stringify([...new Set(symbols)].sort());
  const scope = useRef<Scope | null>(null);
  const [state, setState] = useState<SignalState>(() =>
    initialState(userId, signature),
  );

  useLayoutEffect(() => {
    // Each account/watchlist owns its requests; late results cannot replace a newer scope.
    const current: Scope = {
      active: true,
      foreground: AppState.currentState === "active",
      ready: false,
      revision: 0,
      symbols: signature === null ? null : JSON.parse(signature),
      pending: null,
      readings: [],
    };
    scope.current = current;
    return () => {
      current.active = false;
      current.pending?.abort();
      current.pending = null;
    };
  }, [userId, signature]);

  const refresh = useCallback(() => {
    const owner = scope.current;
    if (
      !owner?.active ||
      !owner.ready ||
      !owner.foreground ||
      owner.pending ||
      owner.symbols === null
    )
      return;
    if (owner.symbols.length === 0) {
      setState(initialState(userId, signature));
      return;
    }
    const controller = new AbortController();
    owner.pending = controller;
    const current = () =>
      scope.current === owner &&
      owner.active &&
      owner.foreground &&
      !controller.signal.aborted;
    setState((previous) => ({
      ...(previous.userId === userId && previous.signature === signature
        ? previous
        : initialState(userId, signature)),
      loading: true,
      error: null,
      failures: {},
      freshSymbols: [],
    }));
    void getSignals(owner.symbols, controller.signal)
      .then((result) => {
        if (!current()) return;
        const updatedAt = Date.now();
        const revision = ++owner.revision;
        const merged = new Map(
          owner.readings.map((item) => [item.symbol, item]),
        );
        result.signals.forEach((item) => merged.set(item.symbol, item));
        owner.readings = [...merged.values()];
        setState((previous) => ({
          ...previous,
          signals: owner.readings,
          failures: result.failures,
          freshSymbols: result.signals.map((item) => item.symbol),
          loading: false,
          error:
            result.signals.length === 0
              ? "Unable to update hourly readings. Saved readings are shown where available."
              : null,
        }));
        if (result.signals.length) {
          void saveSignals(userId, owner.readings, updatedAt)
            .then(() => {
              if (current() && owner.revision === revision)
                setState((previous) => ({ ...previous, cacheError: null }));
            })
            .catch(() => {
              if (current() && owner.revision === revision)
                setState((previous) => ({
                  ...previous,
                  cacheError:
                    "Readings loaded, but could not be saved on this device.",
                }));
            });
        }
      })
      .catch(() => {
        if (current())
          setState((previous) => ({
            ...previous,
            loading: false,
            error: "Unable to update hourly readings. Please try again.",
          }));
      })
      .finally(() => {
        if (owner.pending === controller) owner.pending = null;
      });
  }, [userId, signature]);

  useEffect(() => {
    const owner = scope.current;
    if (!owner) return;
    const current = () => scope.current === owner && owner.active;
    void getSavedSignals(userId)
      .then((saved) => {
        if (!current()) return;
        owner.readings = saved
          ? owner.symbols === null
            ? saved.signals
            : saved.signals.filter((item) =>
                owner.symbols?.includes(item.symbol),
              )
          : [];
        setState({
          ...initialState(userId, signature),
          signals: owner.readings,
        });
      })
      .catch(() => {
        if (current())
          setState({
            ...initialState(userId, signature),
            cacheError:
              "Saved readings could not be restored. Live updates remain available.",
          });
      })
      .finally(() => {
        if (!current()) return;
        owner.ready = true;
        if (owner.foreground) refresh();
        else setState((previous) => ({ ...previous, loading: false }));
      });
    const subscription = AppState.addEventListener("change", (next) => {
      const wasForeground = owner.foreground;
      owner.foreground = next === "active";
      if (owner.foreground) {
        if (!wasForeground) refresh();
      } else {
        owner.pending?.abort();
        owner.pending = null;
        setState((previous) => ({
          ...previous,
          loading: false,
          freshSymbols: [],
        }));
      }
    });
    return () => {
      subscription.remove();
      owner.pending?.abort();
      owner.pending = null;
    };
  }, [signature, refresh, userId]);

  const visible =
    state.userId === userId && state.signature === signature
      ? state
      : initialState(userId, signature);
  return { ...visible, refresh };
}
