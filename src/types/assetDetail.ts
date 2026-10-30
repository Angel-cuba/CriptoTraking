import type { AssetSignal } from "@/src/services/signal/signalService";
import type { MarketAsset } from "./market";
import type { PriceAlertEvent } from "./priceAlert";

export type AssetDetailContext =
  | { kind: "signal"; reading: AssetSignal; cached: boolean; failure?: string }
  | { kind: "alert"; event: PriceAlertEvent };

export type AssetDetailSelection = {
  asset: MarketAsset;
  context: AssetDetailContext;
};
