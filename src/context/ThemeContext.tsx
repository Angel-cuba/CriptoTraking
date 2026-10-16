import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Appearance, Platform } from 'react-native';

import { isThemeMode, themeColors, type ThemeColors, type ThemeMode } from '@/src/lib/theme';
import { loadTheme, saveTheme } from '@/src/services/themeStorage';

type ThemeState = {
  mode: ThemeMode;
  colors: ThemeColors;
  ready: boolean;
  saving: boolean;
  error: string | null;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [mode, updateMode] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const currentMode = useRef<ThemeMode>('dark');
  const request = useRef(0);

  useEffect(() => {
    let current = true;
    active.current = true;
    void loadTheme().then((stored) => {
      if (!current) return;
      currentMode.current = stored ?? 'dark';
      updateMode(currentMode.current);
    }).catch(() => {
      if (current) setError('Your saved appearance could not be loaded. You can still switch themes.');
    }).finally(() => {
      if (current) setReady(true);
    });
    return () => { current = false; active.current = false; };
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    if (!active.current || !ready || !isThemeMode(next) || currentMode.current === next) return;
    const version = ++request.current;
    currentMode.current = next;
    updateMode(next);
    setSaving(true);
    setError(null);
    try {
      await saveTheme(next);
    } catch {
      if (active.current && request.current === version) {
        setError('Your appearance changed, but could not be saved on this device.');
      }
    } finally {
      if (active.current && request.current === version) setSaving(false);
    }
  }, [ready]);

  const colors = themeColors[mode];
  useEffect(() => {
    if (ready && Platform.OS !== 'web') Appearance.setColorScheme(mode);
  }, [mode, ready]);

  useEffect(() => {
    if (!ready || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = mode;
    document.documentElement.style.backgroundColor = colors.background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.background);
  }, [colors, mode, ready]);

  const value = useMemo(() => ({ mode, colors, ready, saving, error, setMode }), [mode, colors, ready, saving, error, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within AppThemeProvider.');
  return context;
}

export function useThemeStyles<T>(createStyles: (colors: ThemeColors) => T): T {
  const { colors } = useAppTheme();
  return useMemo(() => createStyles(colors), [colors, createStyles]);
}
