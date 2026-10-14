import { useCallback, useEffect, useRef, useState } from 'react';
import { getSignals, type AssetSignal } from '@/src/services/signalService';
import { getSavedSignals, saveSignals } from '@/src/services/signalStorage';

type SignalState = {
  userId: string; signals: AssetSignal[]; loading: boolean; error: string | null;
  cacheError: string | null; updatedAt: number | null; fromCache: boolean;
};
const initialState = (userId: string): SignalState => ({
  userId, signals: [], loading: true, error: null, cacheError: null, updatedAt: null, fromCache: false,
});

export function useSignals(userId: string) {
  const [state, setState] = useState<SignalState>(() => initialState(userId));
  const active = useRef(false);
  const pending = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const freshRevision = useRef(0);

  const load = useCallback((controller: AbortController, currentGeneration: number) => {
    const current = () => active.current && generation.current === currentGeneration && !controller.signal.aborted;
    void getSignals(controller.signal).then((result) => {
      if (!current()) return;
      const allFailed = result.signals.length === 0;
      const updatedAt = Date.now();
      const revision = allFailed ? freshRevision.current : ++freshRevision.current;
      setState((stored) => {
        const previous = stored.userId === userId ? stored : initialState(userId);
        let error: string | null = null;
        if (allFailed) {
          error = previous.signals.length > 0
            ? 'Refresh failed. Previously loaded signals are shown below. Try again to update them.'
            : 'Unable to load market signals. Check your connection and try again.';
        } else if (result.failedSymbols.length > 0) {
          error = `Signals unavailable for ${result.failedSymbols.join(', ')}. Refresh to retry.`;
        }
        return allFailed ? { ...previous, loading: false, error } : {
          ...previous, signals: result.signals, loading: false, error, updatedAt, fromCache: false,
        };
      });
      if (!allFailed) {
        void saveSignals(userId, result.signals, updatedAt).then(() => {
          if (current() && freshRevision.current === revision) setState((previous) => ({ ...previous, cacheError: null }));
        }).catch(() => {
          if (current() && freshRevision.current === revision) setState((previous) => ({
            ...previous, cacheError: 'Signals updated, but could not be saved on this device.',
          }));
        });
      }
    }).catch(() => {
      if (!current()) return;
      setState((stored) => ({
        ...(stored.userId === userId ? stored : initialState(userId)),
        loading: false, error: 'Unable to update market signals. Please try again.',
      }));
    }).finally(() => {
      if (pending.current === controller) pending.current = null;
    });
  }, [userId]);

  useEffect(() => {
    active.current = true;
    freshRevision.current = 0;
    const currentGeneration = ++generation.current;
    const controller = new AbortController();
    pending.current = controller;
    const current = () => active.current && generation.current === currentGeneration && !controller.signal.aborted;

    void getSavedSignals(userId).then((saved) => {
      if (!current() || freshRevision.current > 0 || !saved) return;
      setState((stored) => ({
        ...(stored.userId === userId ? stored : initialState(userId)),
        signals: saved.signals, updatedAt: saved.savedAt, fromCache: true,
      }));
    }).catch(() => {
      if (!current() || freshRevision.current > 0) return;
      setState((stored) => ({
        ...(stored.userId === userId ? stored : initialState(userId)),
        cacheError: 'Saved signals could not be restored on this device. Live updates are still available.',
      }));
    });
    load(controller, currentGeneration);
    return () => { active.current = false; controller.abort(); pending.current?.abort(); };
  }, [load, userId]);

  const refresh = useCallback(() => {
    if (!active.current || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setState((stored) => ({ ...(stored.userId === userId ? stored : initialState(userId)), loading: true, error: null }));
    load(controller, generation.current);
  }, [load, userId]);

  return { ...(state.userId === userId ? state : initialState(userId)), refresh };
}
