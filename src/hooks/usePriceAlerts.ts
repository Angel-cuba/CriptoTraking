import { useContext } from "react";
import { PriceAlertContext } from "@/src/context/PriceAlertContext";

export function usePriceAlerts() {
  const context = useContext(PriceAlertContext);
  if (!context) throw new Error("usePriceAlerts must be used inside PriceAlertProvider.");
  return context;
}
