import { useCallback, useEffect, useRef, useState } from 'react';

import { getMarketSnapshot } from '@/src/services/marketCatalogService';
import type { MarketSnapshot } from '@/src/types/market';

type MarketState = { snapshot: MarketSnapshot | null; loading: boolean; error: string | null };
const REQUEST_TIMEOUT_MS = 15_000;

export function useMarketCatalog() {
  const [state, setState] = useState<MarketState>({ snapshot: null, loading: true, error: null });
  const active = useRef(false);
  const request = useRef<AbortController | null>(null);

  const loadMarkets = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = () => active.current && request.current === controller && !controller.signal.aborted;
    const timeout = setTimeout(() => {
      if (!current()) return;
      controller.abort();
      request.current = null;
      setState((previous) => ({ ...previous, loading: false, error: 'Market request timed out. Please try again.' }));
    }, REQUEST_TIMEOUT_MS);
    controller.signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });

    void getMarketSnapshot(controller.signal).then((snapshot) => {
      if (current()) setState({ snapshot, loading: false, error: null });
    }).catch(() => {
      if (current()) setState((previous) => ({ ...previous, loading: false, error: 'Market data is unavailable. Please try again.' }));
    }).finally(() => {
      clearTimeout(timeout);
      if (request.current === controller) request.current = null;
    });
  }, []);

  useEffect(() => {
    active.current = true;
    loadMarkets();
    return () => {
      active.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [loadMarkets]);

  const reload = useCallback(() => {
    if (!active.current) return;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    loadMarkets();
  }, [loadMarkets]);

  return { ...state, reload };
}
