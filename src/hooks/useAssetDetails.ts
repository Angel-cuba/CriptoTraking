import {
  getAssetHistory,
  getCachedAssetHistory,
  type AssetHistory,
} from "@/src/services/market/assetHistoryService";
import { MarketRateLimitError } from "@/src/services/market/marketCatalogService";
import { useEffect, useState } from "react";

export function useAssetDetails(symbol: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    symbol: string;
    attempt: number;
    history?: AssetHistory;
    error: string | null;
    retryAt: number;
  }>(() => ({
    symbol,
    attempt: -1,
    history: getCachedAssetHistory(symbol),
    error: null,
    retryAt: 0,
  }));
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    void getAssetHistory(symbol, controller.signal, attempt > 0)
      .then(
        (history) => {
          if (current)
            setState({ symbol, attempt, history, error: null, retryAt: 0 });
        },
        (error: unknown) => {
          if (!current) return;
          const retryAt =
            error instanceof MarketRateLimitError ? error.retryAt : 0;
          setWaiting(retryAt > Date.now());
          setState({
            symbol,
            attempt,
            history: getCachedAssetHistory(symbol),
            retryAt,
            error: retryAt
              ? "Binance is limiting requests. Please wait before retrying."
              : "Hourly data could not be loaded. Please try again.",
          });
        },
      )
      .finally(() => clearTimeout(timeout));
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [symbol, attempt]);

  useEffect(() => {
    if (!state.retryAt) return;
    const timer = setTimeout(
      () => setWaiting(false),
      Math.max(0, state.retryAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [state.retryAt]);

  const loading = state.symbol !== symbol || state.attempt !== attempt;
  return {
    history:
      state.symbol === symbol ? state.history : getCachedAssetHistory(symbol),
    loading,
    error: loading ? null : state.error,
    waiting: !loading && waiting,
    reload: () => {
      setWaiting(false);
      setAttempt((value) => value + 1);
    },
  };
}
