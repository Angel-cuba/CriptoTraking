import type { MarketPriceObservation } from "@/src/types/market";
import type {
  PriceAlertEvent,
  PriceAlertResult,
  PriceAlertRule,
  PriceAlertState,
} from "@/src/types/priceAlert";

export const DEFAULT_PRICE_ALERT_SETTINGS = {
  thresholdPercent: 1,
  cooldownMs: 5 * 60_000,
};

export const MAX_PRICE_OBSERVATION_AGE_MS = 120_000;

// Call on pause or cold start; keep cooldown and the source watermark.
export function resetPriceAlertBaseline(
  state: PriceAlertState,
): PriceAlertState {
  return { ...state, referencePrice: null };
}

export function evaluatePriceAlert({
  rule,
  observation,
  previous,
  isWatched,
  now,
}: {
  rule: PriceAlertRule;
  observation: MarketPriceObservation | null;
  previous: PriceAlertState | null;
  isWatched: boolean;
  now: number;
}): PriceAlertResult {
  const state: PriceAlertState =
    previous?.userId === rule.userId && previous.symbol === rule.symbol
      ? { ...previous }
      : {
          userId: rule.userId,
          symbol: rule.symbol,
          thresholdPercent: rule.thresholdPercent,
          referencePrice: null,
          lastObservation: null,
          lastEventAt: null,
        };
  const result = (reason: PriceAlertResult["reason"]): PriceAlertResult => ({
    state,
    event: null,
    reason,
  });

  if (state.thresholdPercent !== rule.thresholdPercent)
    state.referencePrice = null;
  state.thresholdPercent = rule.thresholdPercent;

  if (
    !rule.userId ||
    !rule.symbol ||
    !Number.isFinite(rule.thresholdPercent) ||
    rule.thresholdPercent <= 0 ||
    !Number.isFinite(rule.cooldownMs) ||
    rule.cooldownMs < 0
  ) {
    state.referencePrice = null;
    return result("invalid-rule");
  }
  if (!isWatched || !rule.enabled) {
    state.referencePrice = null;
    return result(!isWatched ? "not-watched" : "disabled");
  }
  if (!observation) return result("missing-price");
  if (
    !Number.isFinite(observation.price) ||
    observation.price <= 0 ||
    !Number.isFinite(observation.sourceCloseTime) ||
    observation.sourceCloseTime < 0 ||
    !Number.isFinite(observation.receivedAt) ||
    observation.receivedAt < 0 ||
    !Number.isFinite(now) ||
    now < observation.receivedAt
  )
    return result("invalid-price");
  if (now - observation.receivedAt >= MAX_PRICE_OBSERVATION_AGE_MS)
    return result("stale");

  const before = state.lastObservation;
  if (
    before &&
    (observation.sourceCloseTime <= before.sourceCloseTime ||
      observation.receivedAt <= before.receivedAt)
  )
    return result("duplicate");

  if (
    state.referencePrice === null ||
    !before ||
    observation.receivedAt - before.receivedAt > MAX_PRICE_OBSERVATION_AGE_MS
  ) {
    state.referencePrice = observation.price;
    state.lastObservation = { ...observation };
    return result("baseline");
  }

  const changePercent =
    ((observation.price - state.referencePrice) / state.referencePrice) * 100;
  if (!Number.isFinite(changePercent)) return result("invalid-price");
  state.lastObservation = { ...observation };

  if (state.lastEventAt !== null && now - state.lastEventAt < rule.cooldownMs) {
    return result("cooldown");
  }
  // Ordinary updates and cooldowns leave the alert reference unchanged.
  // Allow only floating-point noise at an exact boundary, not display rounding.
  const tolerance = Number.EPSILON * Math.max(100, Math.abs(changePercent)) * 2;
  if (
    changePercent === 0 ||
    Math.abs(changePercent) + tolerance < rule.thresholdPercent
  ) {
    return result("below-threshold");
  }

  const event: PriceAlertEvent = {
    id: JSON.stringify([
      rule.userId,
      rule.symbol,
      rule.thresholdPercent,
      observation.sourceCloseTime,
    ]),
    userId: rule.userId,
    symbol: rule.symbol,
    direction: changePercent > 0 ? "up" : "down",
    referencePrice: state.referencePrice,
    price: observation.price,
    changePercent,
    sourceCloseTime: observation.sourceCloseTime,
    receivedAt: observation.receivedAt,
    createdAt: now,
  };
  state.referencePrice = observation.price;
  state.lastEventAt = now;
  return { state, event, reason: "alert" };
}
