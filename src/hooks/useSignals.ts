import { useCallback, useEffect, useRef, useState } from 'react';
import { getSignals, type AssetSignal } from '@/src/services/signalService';

type SignalState = { signals: AssetSignal[]; loading: boolean; error: string | null };

export function useSignals() {
  const [state, setState] = useState<SignalState>({ signals: [], loading: true, error: null });
  const active = useRef(false);
  const pending = useRef<AbortController | null>(null);

  const load = useCallback((controller: AbortController) => {
    void getSignals(controller.signal).then((result) => {
      if (!active.current || controller.signal.aborted) return;
      setState((previous) => {
        const allFailed = result.signals.length === 0;
        let error: string | null = null;
        if (allFailed) {
          error = previous.signals.length > 0
            ? 'Refresh failed. Previously loaded signals are shown below. Try again to update them.'
            : 'Unable to load market signals. Check your connection and try again.';
        } else if (result.failedSymbols.length > 0) {
          error = `Signals unavailable for ${result.failedSymbols.join(', ')}. Refresh to retry.`;
        }
        return { signals: allFailed ? previous.signals : result.signals, loading: false, error };
      });
    }).catch(() => {
      if (!active.current || controller.signal.aborted) return;
      setState((previous) => ({ ...previous, loading: false, error: 'Unable to update market signals. Please try again.' }));
    }).finally(() => {
      if (pending.current === controller) pending.current = null;
    });
  }, []);

  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    pending.current = controller;
    void load(controller);
    return () => { active.current = false; controller.abort(); pending.current?.abort(); };
  }, [load]);

  const refresh = useCallback(() => {
    if (!active.current || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    void load(controller);
  }, [load]);

  return { ...state, refresh };
}
