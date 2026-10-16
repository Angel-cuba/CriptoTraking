import { PriceAlertContext } from "@/src/context/PriceAlertContext";
import { useContext } from "react";

export function usePriceAlerts() {
  const context = useContext(PriceAlertContext);
  if (!context)
    throw new Error("usePriceAlerts must be used inside PriceAlertProvider.");
  return context;
}
