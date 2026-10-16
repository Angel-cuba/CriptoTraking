import Storage from 'expo-sqlite/kv-store';
import { isThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '@/src/lib/theme';

let pending: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.catch(() => {}).then(operation);
  pending = next;
  return next;
}

export function loadTheme(): Promise<ThemeMode | null> {
  return serialize(async () => {
    const value = await Storage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(value) ? value : null;
  });
}

export function saveTheme(mode: ThemeMode): Promise<void> {
  return serialize(() => {
    if (!isThemeMode(mode)) throw new Error('Invalid appearance preference.');
    return Storage.setItem(THEME_STORAGE_KEY, mode);
  });
}
