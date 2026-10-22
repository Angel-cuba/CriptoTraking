import { secureStorage } from "@/src/lib/secureStorage";

export const readSignalData = (key: string) => secureStorage.getItem(key);
export async function writeSignalData(
  key: string,
  value: string,
): Promise<void> {
  if (typeof window === "undefined")
    throw new Error("Local signal storage is unavailable.");
  window.localStorage.setItem(key, value);
}
export const readLegacySignalData = readSignalData;
