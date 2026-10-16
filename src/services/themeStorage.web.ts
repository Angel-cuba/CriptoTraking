import { isThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '@/src/lib/theme';

export async function loadTheme(): Promise<ThemeMode | null> {
  const value = typeof window === 'undefined' ? null : window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(value) ? value : null;
}

export async function saveTheme(mode: ThemeMode): Promise<void> {
  if (!isThemeMode(mode)) throw new Error('Invalid appearance preference.');
  if (typeof window === 'undefined') throw new Error('Appearance storage is unavailable.');
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}
