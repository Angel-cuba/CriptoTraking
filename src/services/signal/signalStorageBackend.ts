import { secureStorage } from "@/src/lib/secureStorage";
import Storage from "expo-sqlite/kv-store";

export const readSignalData = (key: string) => Storage.getItem(key);
export const writeSignalData = (key: string, value: string) =>
  Storage.setItem(key, value);
export const readLegacySignalData = (key: string) => secureStorage.getItem(key);
