import type { MarketPriceObservation } from "@/src/types/market";

export type PriceAlertRule = {
  userId: string;
  symbol: string;
  enabled: boolean;
  thresholdPercent: number;
  cooldownMs: number;
};

export type PriceAlertState = {
  userId: string;
  symbol: string;
  thresholdPercent: number;
  referencePrice: number | null;
  lastObservation: MarketPriceObservation | null;
  lastEventAt: number | null;
};

export type PriceAlertNotificationStatus =
  | "pending"
  | "scheduled"
  | "permission-denied"
  | "disabled"
  | "failed"
  | "unsupported"
  | "skipped"
  | "unknown";

export type PriceAlertEvent = {
  id: string;
  userId: string;
  symbol: string;
  direction: "up" | "down";
  referencePrice: number;
  price: number;
  changePercent: number;
  sourceCloseTime: number;
  receivedAt: number;
  createdAt: number;
  notificationStatus?: PriceAlertNotificationStatus;
};

export type PriceAlertResult = {
  state: PriceAlertState;
  event: PriceAlertEvent | null;
  reason:
    | "invalid-rule"
    | "not-watched"
    | "disabled"
    | "missing-price"
    | "invalid-price"
    | "stale"
    | "duplicate"
    | "baseline"
    | "cooldown"
    | "below-threshold"
    | "alert";
};

export type PriceAlertHistory = {
  version: 3;
  userId: string;
  enabled: boolean;
  notificationsEnabled: boolean;
  states: PriceAlertState[];
  events: PriceAlertEvent[];
};
