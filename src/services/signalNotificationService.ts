import { hasNotificationPermission, sendSignalNotification } from '@/src/services/localNotificationService';
import { withNotificationState, type NotificationState } from '@/src/services/signalNotificationStorage';
import type { AssetSignal } from '@/src/services/signalService';

export function getNewSignals(signals: AssetSignal[], observed: NotificationState['observed'], watchlist: string[]): AssetSignal[] {
  return signals.filter((signal) => observed[signal.symbol] !== undefined &&
    signal.timestamp > observed[signal.symbol]! && signal.type !== 'NEUTRAL' && watchlist.includes(signal.symbol));
}

export async function processSignalNotifications(
  userId: string, signals: AssetSignal[], watchlist: string[],
  isCurrent: () => boolean, canSend: () => boolean,
): Promise<{ permissionDenied: boolean }> {
  return withNotificationState(userId, async (state, save) => {
    if (!isCurrent()) return { permissionDenied: false };
    const candidates = getNewSignals(signals, state.observed, watchlist);
    const observed = { ...state.observed };
    for (const signal of signals) observed[signal.symbol] = Math.max(observed[signal.symbol] ?? 0, signal.timestamp);
    // Persist the observation before dispatch, so retries cannot send duplicate alerts.
    await save({ ...state, observed });
    if (!state.enabled || !canSend() || candidates.length === 0) return { permissionDenied: false };
    if (!await hasNotificationPermission()) return { permissionDenied: true };
    for (const signal of candidates) {
      if (!canSend()) break;
      await sendSignalNotification(userId, signal, canSend);
    }
    return { permissionDenied: false };
  });
}
