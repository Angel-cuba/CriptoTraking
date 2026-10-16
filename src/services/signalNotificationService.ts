import {
  hasNotificationPermission,
  sendSignalNotification,
} from "@/src/services/localNotificationService";
import {
  withNotificationState,
  type NotificationState,
} from "@/src/services/signalNotificationStorage";
import type { AssetSignal } from "@/src/services/signalService";

export function getNewSignals(
  signals: AssetSignal[],
  observed: NotificationState["observed"],
  watchlist: string[],
): AssetSignal[] {
  return signals.filter(
    (signal) =>
      observed[signal.symbol] !== undefined &&
      signal.timestamp > observed[signal.symbol]! &&
      signal.type !== "NEUTRAL" &&
      watchlist.includes(signal.symbol),
  );
}

export async function processSignalNotifications(
  userId: string,
  signals: AssetSignal[],
  watchlist: string[],
  isCurrent: () => boolean,
  canSend: (symbol: string) => boolean,
): Promise<{ permissionDenied: boolean }> {
  return withNotificationState(userId, async (state, save) => {
    if (!isCurrent()) return { permissionDenied: false };
    const candidates = getNewSignals(signals, state.observed, watchlist);
    const observed = Object.fromEntries(
      Object.entries(state.observed).filter(([symbol]) =>
        watchlist.includes(symbol),
      ),
    );
    for (const signal of signals)
      observed[signal.symbol] = Math.max(
        observed[signal.symbol] ?? 0,
        signal.timestamp,
      );
    // Persist the observation before dispatch, so retries cannot send duplicate alerts.
    await save({ ...state, observed });
    if (!state.enabled || !candidates.some((signal) => canSend(signal.symbol)))
      return { permissionDenied: false };
    const permission = await hasNotificationPermission();
    if (!isCurrent()) return { permissionDenied: false };
    if (!permission) return { permissionDenied: true };
    for (const signal of candidates) {
      if (!isCurrent()) break;
      if (!canSend(signal.symbol)) continue;
      await sendSignalNotification(userId, signal, () =>
        canSend(signal.symbol),
      );
    }
    return { permissionDenied: false };
  });
}
