import type { MarketPriceObservation, MarketSnapshot } from "@/src/types/market";
import type { PriceAlertHistory, PriceAlertNotificationStatus } from "@/src/types/priceAlert";
import { DEFAULT_PRICE_ALERT_SETTINGS, MAX_PRICE_OBSERVATION_AGE_MS, evaluatePriceAlert, resetPriceAlertBaseline } from "@/src/services/priceAlertService";

export const MAX_PRICE_ALERT_EVENTS = 100;

export function createPriceAlertHistory(userId: string): PriceAlertHistory {
  return { version: 3, userId, enabled: true, notificationsEnabled: false, states: [], events: [] };
}

export function restorePriceAlertHistory(history: PriceAlertHistory): PriceAlertHistory {
  const restored = resetPriceAlertHistory(history);
  if (!restored.events.some((event) => event.notificationStatus === 'pending')) return restored;
  // An interrupted attempt may already have reached the OS. Never replay it.
  return { ...restored, events: restored.events.map((event) => event.notificationStatus === 'pending'
    ? { ...event, notificationStatus: 'unknown' } : event) };
}

export function updatePriceAlertDelivery(history: PriceAlertHistory, eventId: string, status: PriceAlertNotificationStatus): PriceAlertHistory {
  const event = history.events.find((item) => item.id === eventId);
  if (!event || event.notificationStatus === status) return history;
  return { ...history, events: history.events.map((item) => item.id === eventId ? { ...item, notificationStatus: status } : item) };
}

export function resetPriceAlertHistory(history: PriceAlertHistory, symbols?: Set<string>): PriceAlertHistory {
  let changed = false;
  const states = history.states.map((state) => {
    if (state.referencePrice === null || (symbols && !symbols.has(state.symbol))) return state;
    changed = true;
    return resetPriceAlertBaseline(state);
  });
  return changed ? { ...history, states } : history;
}

export function applyPriceAlertSnapshot(
  history: PriceAlertHistory,
  watchlist: readonly string[],
  snapshot: MarketSnapshot,
  now: number,
): PriceAlertHistory {
  if (!history.enabled) return history;
  if (!Number.isFinite(now) || !Number.isFinite(snapshot.receivedAt) ||
    now < snapshot.receivedAt || now - snapshot.receivedAt >= MAX_PRICE_OBSERVATION_AGE_MS) return history;
  const watched = new Set(watchlist);
  const previous = new Map(history.states.map((state) => [state.symbol, state]));
  const assets = new Map(snapshot.assets.map((asset) => [asset.symbol, asset]));
  const states: PriceAlertHistory["states"] = [];
  const events: PriceAlertHistory["events"] = [];
  const eventIds = new Set(history.events.map((event) => event.id));
  let changed = false;

  for (const symbol of new Set([...watched, ...previous.keys()])) {
    const before = previous.get(symbol);
    const asset = assets.get(symbol);
    if (!watched.has(symbol) || !asset) {
      if (!before) continue;
      const keepCooldown = before.lastEventAt !== null && now - before.lastEventAt < DEFAULT_PRICE_ALERT_SETTINGS.cooldownMs;
      if (watched.has(symbol) || keepCooldown) {
        states.push(before.referencePrice === null ? before : resetPriceAlertBaseline(before));
        if (before.referencePrice !== null) changed = true;
      } else changed = true;
      continue;
    }
    if (!before && !asset.ticker) continue;

    const observation = asset.ticker ? {
      price: asset.ticker.price,
      sourceCloseTime: asset.ticker.sourceCloseTime,
      receivedAt: snapshot.receivedAt,
    } : null;
    const result = evaluatePriceAlert({
      rule: { ...DEFAULT_PRICE_ALERT_SETTINGS, userId: history.userId, symbol, enabled: true },
      observation,
      previous: before ?? null,
      isWatched: true,
      now,
    });
    const accepted = ["baseline", "below-threshold", "cooldown", "alert"].includes(result.reason);
    if (!accepted && !before) continue;
    states.push(accepted || !before ? result.state : before);
    if (accepted || !before) changed = true;
    if (result.event && !eventIds.has(result.event.id)) {
      events.push({ ...result.event, notificationStatus: history.notificationsEnabled ? 'pending' : 'disabled' });
      eventIds.add(result.event.id);
    }
  }
  if (!changed) return history;
  return { ...history, states, events: [...events, ...history.events].slice(0, MAX_PRICE_ALERT_EVENTS) };
}

const validTime = (value: number) => Number.isFinite(value) && value >= 0;
const validPrice = (value: number) => Number.isFinite(value) && value > 0;
const validObservation = (value: MarketPriceObservation | null) => value === null || (
  value && validPrice(value.price) && validTime(value.receivedAt) && validTime(value.sourceCloseTime)
);

export function parsePriceAlertHistory(stored: string | null, userId: string): PriceAlertHistory {
  if (stored === null) return createPriceAlertHistory(userId);
  const history = JSON.parse(stored) as Omit<PriceAlertHistory, 'version' | 'enabled' | 'notificationsEnabled'> & {
    version: 1 | 2 | 3; enabled?: boolean; notificationsEnabled?: boolean;
  };
  if (
    !history || ![1, 2, 3].includes(history.version) || history.userId !== userId ||
    (history.version !== 1 && typeof history.enabled !== 'boolean') ||
    (history.version === 3 && typeof history.notificationsEnabled !== 'boolean') ||
    !Array.isArray(history.states) || !Array.isArray(history.events) ||
    history.events.length > MAX_PRICE_ALERT_EVENTS ||
    !history.states.every((state) => state && state.userId === userId &&
      typeof state.symbol === "string" && state.symbol.length > 0 &&
      validPrice(state.thresholdPercent) &&
      (state.referencePrice === null || validPrice(state.referencePrice)) &&
      (state.lastEventAt === null || validTime(state.lastEventAt)) &&
      validObservation(state.lastObservation)) ||
    !history.events.every((event) => event && event.userId === userId &&
      typeof event.symbol === "string" && event.symbol.length > 0 &&
      typeof event.id === "string" && event.id.length > 0 &&
      validPrice(event.price) && validPrice(event.referencePrice) &&
      Number.isFinite(event.changePercent) && event.changePercent !== 0 &&
      event.direction === (event.changePercent > 0 ? "up" : "down") &&
      (event.notificationStatus === undefined || ['pending', 'scheduled', 'permission-denied', 'disabled', 'failed', 'unsupported', 'skipped', 'unknown'].includes(event.notificationStatus)) &&
      validTime(event.sourceCloseTime) && validTime(event.receivedAt) && validTime(event.createdAt) && event.createdAt >= event.receivedAt) ||
    new Set(history.states.map((state) => state.symbol)).size !== history.states.length ||
    new Set(history.events.map((event) => event.id)).size !== history.events.length
  ) throw new Error("Stored price alert history is invalid. Existing data has not been replaced.");
  return { ...history, version: 3, enabled: history.version === 1 || history.enabled === true,
    notificationsEnabled: history.version === 3 && history.notificationsEnabled === true };
}
