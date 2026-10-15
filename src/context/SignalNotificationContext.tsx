import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { supabaseClient } from '@/src/lib/supabase';
import { clearSignalNotifications, configureSignalNotifications, hasNotificationPermission, notificationsSupported, requestNotificationPermission } from '@/src/services/localNotificationService';
import { getNotificationState, setNotificationsEnabled } from '@/src/services/signalNotificationStorage';
import { processSignalNotifications } from '@/src/services/signalNotificationService';
import type { AssetSignal } from '@/src/services/signalService';

type Settings = { enabled: boolean; permission: boolean; loading: boolean; ready: boolean; busy: boolean; error: string | null };
type NotificationContextValue = Settings & {
  supported: boolean; reload: () => void; changeEnabled: (next: boolean) => Promise<void>;
  processSignals: (signals: AssetSignal[], watchlist: string[], isFocused: () => boolean) => Promise<void>;
};
const Context = createContext<NotificationContextValue | null>(null);

export function SignalNotificationProvider({ userId, children }: PropsWithChildren<{ userId: string }>) {
  const [settings, setSettings] = useState<Settings>({ enabled: false, permission: false, loading: true, ready: false, busy: false, error: null });
  const active = useRef(false);
  const sessionAlive = useRef(true);
  const enabled = useRef(false);
  const ready = useRef(false);
  const busy = useRef(false);
  const operation = useRef(0);

  const load = useCallback(() => {
    if (busy.current) return;
    const version = ++operation.current;
    const request = notificationsSupported
      ? Promise.all([getNotificationState(userId), hasNotificationPermission()])
      : Promise.resolve([{ enabled: false }, false] as const);
    void request.then(([stored, permission]) => {
      if (!active.current || version !== operation.current) return;
      enabled.current = stored.enabled;
      ready.current = true;
      setSettings({ enabled: stored.enabled, permission, loading: false, ready: true, busy: false, error: null });
    }).catch(() => {
      if (!active.current || version !== operation.current) return;
      ready.current = false;
      enabled.current = false;
      setSettings({ enabled: false, permission: false, loading: false, ready: false, busy: false, error: 'Notification settings could not be loaded. Please try again.' });
    });
  }, [userId]);

  useEffect(() => {
    active.current = true;
    sessionAlive.current = true;
    const release = notificationsSupported ? configureSignalNotifications((owner) =>
      active.current && sessionAlive.current && enabled.current && owner === userId) : () => {};
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      sessionAlive.current = session?.user.id === userId;
      if (!sessionAlive.current && notificationsSupported) void clearSignalNotifications(userId).catch(() => {});
    });
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') load(); });
    load();
    return () => {
      active.current = false;
      enabled.current = false;
      ready.current = false;
      operation.current += 1;
      subscription.unsubscribe();
      appState.remove();
      release();
      if (notificationsSupported) void clearSignalNotifications(userId).catch(() => {});
    };
  }, [load, userId]);

  const reload = useCallback(() => {
    setSettings((previous) => ({ ...previous, loading: true, error: null }));
    load();
  }, [load]);

  const changeEnabled = useCallback(async (next: boolean) => {
    if (!notificationsSupported || !ready.current || busy.current || !sessionAlive.current) return;
    busy.current = true;
    operation.current += 1;
    const previousEnabled = enabled.current;
    if (!next) enabled.current = false;
    setSettings((previous) => ({ ...previous, busy: true, error: null }));
    try {
      const permission = next ? await requestNotificationPermission() : await hasNotificationPermission();
      if (!active.current || !sessionAlive.current) return;
      if (next && !permission) {
        setSettings((previous) => ({ ...previous, permission: false, error: 'Notifications are not allowed. You can enable them in your device settings.' }));
        return;
      }
      await setNotificationsEnabled(userId, next);
      if (!active.current || !sessionAlive.current) return;
      enabled.current = next;
      setSettings((previous) => ({ ...previous, enabled: next, permission }));
      if (!next) {
        try { await clearSignalNotifications(userId); } catch {
          if (active.current) setSettings((previous) => ({ ...previous, error: 'Alerts are off, but earlier notifications could not be cleared.' }));
        }
      }
    } catch {
      if (active.current && sessionAlive.current) {
        enabled.current = previousEnabled;
        setSettings((previous) => ({ ...previous, error: 'Notification settings could not be saved. Please try again.' }));
      }
    } finally {
      busy.current = false;
      if (active.current) setSettings((previous) => ({ ...previous, busy: false }));
    }
  }, [userId]);

  const processSignals = useCallback(async (signals: AssetSignal[], watchlist: string[], isFocused: () => boolean) => {
    if (!notificationsSupported || !ready.current || busy.current) return;
    const current = () => active.current && sessionAlive.current && isFocused() && AppState.currentState === 'active';
    const canSend = () => current() && enabled.current && !busy.current;
    try {
      const result = await processSignalNotifications(userId, signals, watchlist, current, canSend);
      if (current()) setSettings((previous) => ({
        ...previous, permission: result.permissionDenied ? false : previous.permission,
        error: previous.error === 'Notifications could not be processed. Market signals remain available.' ? null : previous.error,
      }));
    } catch {
      if (current()) setSettings((previous) => ({ ...previous, error: 'Notifications could not be processed. Market signals remain available.' }));
    }
  }, [userId]);

  return <Context.Provider value={{ ...settings, supported: notificationsSupported, reload, changeEnabled, processSignals }}>{children}</Context.Provider>;
}

export function useSignalNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('useSignalNotifications must be used inside SignalNotificationProvider.');
  return value;
}
