import { MarketCatalogProvider } from "@/src/context/MarketCatalogContext";
import { useProfile } from "@/src/hooks/useProfile";
import { supabaseClient } from "@/src/lib/supabase";
import {
  configurePriceAlertNotifications,
  getNotificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  type NotificationPermission,
} from "@/src/services/local/localNotificationService";
import {
  applyPriceAlertSnapshot,
  resetPriceAlertHistory,
  restorePriceAlertHistory,
  updatePriceAlertDelivery,
} from "@/src/services/price/priceAlertHistoryService";
import {
  clearPriceAlertNotifications,
  sendPriceAlertNotification,
} from "@/src/services/price/priceAlertNotificationService";
import { MAX_PRICE_OBSERVATION_AGE_MS } from "@/src/services/price/priceAlertService";
import {
  loadPriceAlertHistory,
  savePriceAlertHistory,
} from "@/src/services/price/priceAlertStorage";
import type { MarketSnapshot } from "@/src/types/market";
import type {
  PriceAlertEvent,
  PriceAlertHistory,
} from "@/src/types/priceAlert";
import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

type PriceAlertContextValue = {
  events: PriceAlertEvent[];
  loading: boolean;
  error: string | null;
  enabled: boolean | null;
  pendingEnabled: boolean | null;
  savingPreference: boolean;
  setEnabled: (enabled: boolean) => void;
  notificationsEnabled: boolean | null;
  pendingNotificationsEnabled: boolean | null;
  notificationBusy: boolean;
  notificationSupported: boolean;
  permission: NotificationPermission | "unknown";
  notificationError: string | null;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  retry: () => void;
};

export const PriceAlertContext = createContext<
  PriceAlertContextValue | undefined
>(undefined);
type Preference = Partial<
  Pick<PriceAlertHistory, "enabled" | "notificationsEnabled">
>;

export function PriceAlertProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const { profile } = useProfile();
  const [events, setEvents] = useState<PriceAlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setSavedEnabled] = useState<boolean | null>(null);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [savingPreference, setSavingPreference] = useState(false);
  const [notificationsEnabled, setSavedNotificationsEnabled] = useState<
    boolean | null
  >(null);
  const [pendingNotificationsEnabled, setPendingNotificationsEnabled] =
    useState<boolean | null>(null);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unknown"
  >(notificationsSupported ? "unknown" : "unsupported");
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const requestedPreference = useRef<Preference | null>(null);
  const permissionRequest = useRef(0);
  const permissionRead = useRef(0);
  const requestingPermission = useRef(false);
  const saved = useRef<PriceAlertHistory | null>(null);
  const pendingDeliveries = useRef(
    new Map<string, NonNullable<PriceAlertEvent["notificationStatus"]>>(),
  );
  const queue = useRef(Promise.resolve());
  const active = useRef(false);
  const sessionAlive = useRef(true);
  const generation = useRef(0);
  const paused = useRef(true);
  const revision = useRef(0);
  // Failed writes must not undo a pause or a membership reset.
  const resetAll = useRef(false);
  const resetSymbols = useRef(new Set<string>());
  const watchlist = useRef<string[] | null>(null);
  const latestSnapshot = useRef<MarketSnapshot | null>(null);
  const watchlistKey = useMemo(
    () =>
      profile?.id === userId
        ? JSON.stringify([...new Set(profile.watchlist)].sort())
        : null,
    [profile, userId],
  );

  const invalidateSession = useCallback(() => {
    generation.current++;
    permissionRequest.current++;
  }, []);

  const refreshPermission = useCallback(() => {
    const version = generation.current;
    const read = ++permissionRead.current;
    void getNotificationPermission()
      .then((next) => {
        if (
          active.current &&
          sessionAlive.current &&
          version === generation.current &&
          read === permissionRead.current
        )
          setPermission(next);
      })
      .catch(() => {
        if (
          active.current &&
          sessionAlive.current &&
          version === generation.current &&
          read === permissionRead.current
        ) {
          setPermission("unknown");
          setNotificationError(
            "Notification permission could not be checked. Please try again.",
          );
        }
      });
  }, []);

  const clearNotifications = useCallback(
    (symbols?: readonly string[]) => {
      const version = generation.current;
      void clearPriceAlertNotifications(userId, symbols).catch(() => {
        if (
          active.current &&
          sessionAlive.current &&
          version === generation.current
        )
          setNotificationError(
            "Earlier price notifications could not be cleared. Please try again.",
          );
      });
    },
    [userId],
  );

  const canNotify = useCallback(
    (symbol: string) =>
      active.current &&
      sessionAlive.current &&
      !paused.current &&
      AppState.currentState === "active" &&
      saved.current?.enabled === true &&
      saved.current.notificationsEnabled &&
      requestedPreference.current === null &&
      !requestingPermission.current &&
      watchlist.current?.includes(symbol) === true,
    [],
  );

  // Serialize storage work; publish references and events only after a successful save.
  const enqueue = useCallback(
    (update: (history: PriceAlertHistory) => PriceAlertHistory | null) => {
      const version = generation.current;
      const currentSession = () =>
        active.current &&
        sessionAlive.current &&
        version === generation.current;
      queue.current = queue.current.then(async () => {
        if (!currentSession()) return;
        let preference: Preference | null = null;
        try {
          if (!saved.current) {
            const history = await loadPriceAlertHistory(userId);
            if (!currentSession()) return;
            saved.current = restorePriceAlertHistory(history);
            setEvents(saved.current.events);
            setSavedEnabled(saved.current.enabled);
            setSavedNotificationsEnabled(saved.current.notificationsEnabled);
            setError(null);
          }
          const currentRevision = revision.current;
          let current = resetPriceAlertHistory(
            saved.current,
            resetAll.current ? undefined : resetSymbols.current,
          );
          for (const [eventId, status] of pendingDeliveries.current)
            current = updatePriceAlertDelivery(current, eventId, status);
          preference = requestedPreference.current;
          if (preference) {
            setSavingPreference(true);
            current = { ...current, ...preference };
          }
          const next = update(current) ?? current;
          const previousIds = new Set(
            saved.current.events.map((event) => event.id),
          );
          const newEvents = next.events.filter(
            (event) =>
              event.notificationStatus === "pending" &&
              !previousIds.has(event.id),
          );
          if (next !== saved.current) {
            await savePriceAlertHistory(next);
            if (!currentSession()) return;
            saved.current = next;
            setEvents(next.events);
            setSavedEnabled(next.enabled);
            setSavedNotificationsEnabled(next.notificationsEnabled);
            setError(null);
          }
          for (const [eventId, status] of pendingDeliveries.current) {
            const event = next.events.find((item) => item.id === eventId);
            if (!event || event.notificationStatus === status)
              pendingDeliveries.current.delete(eventId);
          }
          if (currentRevision === revision.current) {
            resetAll.current = false;
            resetSymbols.current.clear();
          }
          if (preference && requestedPreference.current === preference) {
            requestedPreference.current = null;
            setPendingEnabled(null);
            setPendingNotificationsEnabled(null);
            // Only quotes received after confirmation can establish a new baseline.
            revision.current++;
            latestSnapshot.current = null;
          }
          // Dispatch only newly persisted events. Retries and restored history never replay them.
          for (const event of newEvents) {
            if (!currentSession()) return;
            let status: NonNullable<PriceAlertEvent["notificationStatus"]>;
            try {
              status = await sendPriceAlertNotification(
                event,
                () =>
                  currentSession() &&
                  canNotify(event.symbol) &&
                  currentRevision === revision.current &&
                  Date.now() >= event.receivedAt &&
                  Date.now() - event.receivedAt < MAX_PRICE_OBSERVATION_AGE_MS,
                latestSnapshot.current?.assets.find(
                  (asset) => asset.symbol === event.symbol,
                ),
              );
            } catch {
              status = "failed";
              if (currentSession())
                setNotificationError(
                  "A price notification could not be scheduled. Your alert is saved in the history.",
                );
            }
            if (!currentSession()) return;
            if (status === "permission-denied") refreshPermission();
            const delivered = updatePriceAlertDelivery(
              saved.current,
              event.id,
              status,
            );
            pendingDeliveries.current.set(event.id, status);
            await savePriceAlertHistory(delivered);
            if (!currentSession()) return;
            saved.current = delivered;
            pendingDeliveries.current.delete(event.id);
            setEvents(delivered.events);
          }
        } catch (failure) {
          if (currentSession())
            setError(
              failure instanceof Error
                ? failure.message
                : "Unable to save price alerts.",
            );
        } finally {
          if (currentSession()) setLoading(false);
          if (
            currentSession() &&
            preference &&
            (requestedPreference.current === null ||
              requestedPreference.current === preference)
          )
            setSavingPreference(false);
        }
      });
    },
    [userId, canNotify, refreshPermission],
  );

  useEffect(() => {
    invalidateSession();
    active.current = true;
    sessionAlive.current = true;
    const removeGuard = configurePriceAlertNotifications(
      (owner, symbol) => owner === userId && canNotify(symbol),
    );
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      sessionAlive.current = session?.user.id === userId;
      if (!sessionAlive.current) {
        invalidateSession();
        clearNotifications();
      }
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    refreshPermission();
    enqueue(() => null);
    return () => {
      active.current = false;
      invalidateSession();
      paused.current = true;
      requestingPermission.current = false;
      subscription.unsubscribe();
      appState.remove();
      removeGuard();
      clearNotifications();
    };
  }, [
    enqueue,
    userId,
    canNotify,
    clearNotifications,
    refreshPermission,
    invalidateSession,
  ]);

  useLayoutEffect(() => {
    const before = new Set(watchlist.current);
    const selected: string[] | null =
      watchlistKey === null ? null : JSON.parse(watchlistKey);
    const after = new Set(selected);
    const changed = new Set(
      [...before, ...after].filter(
        (symbol) => before.has(symbol) !== after.has(symbol),
      ),
    );
    const removed = [...before].filter((symbol) => !after.has(symbol));
    for (const symbol of changed) resetSymbols.current.add(symbol);
    watchlist.current = selected;
    revision.current++;
    latestSnapshot.current = null;
    if (removed.length) clearNotifications(removed);
    enqueue(() => null);
  }, [watchlistKey, enqueue, clearNotifications]);

  const processSnapshot = useCallback(
    (snapshot: MarketSnapshot) => {
      const currentRevision = revision.current;
      paused.current = false;
      latestSnapshot.current = snapshot;
      enqueue((history) => {
        if (
          paused.current ||
          currentRevision !== revision.current ||
          !watchlist.current ||
          !history.enabled ||
          requestedPreference.current !== null
        )
          return null;
        return applyPriceAlertSnapshot(
          history,
          watchlist.current,
          snapshot,
          Date.now(),
        );
      });
    },
    [enqueue],
  );

  const pause = useCallback(() => {
    paused.current = true;
    revision.current++;
    resetAll.current = true;
    latestSnapshot.current = null;
    clearNotifications();
    enqueue(() => null);
  }, [enqueue, clearNotifications]);

  const setEnabled = useCallback(
    (next: boolean) => {
      if (!active.current || !sessionAlive.current || !saved.current) return;
      requestedPreference.current = {
        ...requestedPreference.current,
        enabled: next,
      };
      setPendingEnabled(next);
      setSavingPreference(true);
      revision.current++;
      resetAll.current = true;
      latestSnapshot.current = null;
      if (!next) clearNotifications();
      enqueue(() => null);
    },
    [enqueue, clearNotifications],
  );

  const setNotificationsEnabled = useCallback(
    async (next: boolean) => {
      if (
        !notificationsSupported ||
        !active.current ||
        !sessionAlive.current ||
        !saved.current ||
        requestingPermission.current
      )
        return;
      const version = generation.current;
      const request = ++permissionRequest.current;
      const currentSession = () =>
        active.current &&
        sessionAlive.current &&
        version === generation.current &&
        request === permissionRequest.current;
      requestingPermission.current = true;
      setNotificationBusy(true);
      setNotificationError(null);
      try {
        if (next) {
          const allowed = await requestNotificationPermission("price-alerts");
          if (!currentSession()) return;
          refreshPermission();
          if (!allowed) {
            setNotificationError(
              "Notifications are not allowed. You can enable them in your device settings.",
            );
            return;
          }
        }
        requestedPreference.current = {
          ...requestedPreference.current,
          notificationsEnabled: next,
        };
        setPendingNotificationsEnabled(next);
        setSavingPreference(true);
        revision.current++;
        latestSnapshot.current = null;
        if (!next) clearNotifications();
        enqueue(() => null);
      } catch {
        if (currentSession())
          setNotificationError(
            "Notification settings could not be changed. Please try again.",
          );
      } finally {
        if (currentSession()) {
          requestingPermission.current = false;
          setNotificationBusy(false);
        }
      }
    },
    [enqueue, clearNotifications, refreshPermission],
  );

  const retry = useCallback(() => {
    setNotificationError(null);
    refreshPermission();
    if (
      saved.current?.enabled === false ||
      saved.current?.notificationsEnabled === false
    )
      clearNotifications();
    if (requestedPreference.current !== null) enqueue(() => null);
    else if (
      saved.current?.enabled &&
      latestSnapshot.current &&
      !paused.current
    )
      processSnapshot(latestSnapshot.current);
    else enqueue(() => null);
  }, [enqueue, processSnapshot, refreshPermission, clearNotifications]);

  const value = useMemo(
    () => ({
      events,
      loading,
      error,
      enabled,
      pendingEnabled,
      savingPreference,
      setEnabled,
      retry,
      notificationsEnabled,
      pendingNotificationsEnabled,
      notificationBusy,
      notificationSupported: notificationsSupported,
      permission,
      notificationError,
      setNotificationsEnabled,
    }),
    [
      events,
      loading,
      error,
      enabled,
      pendingEnabled,
      savingPreference,
      setEnabled,
      retry,
      notificationsEnabled,
      pendingNotificationsEnabled,
      notificationBusy,
      permission,
      notificationError,
      setNotificationsEnabled,
    ],
  );

  return (
    <PriceAlertContext.Provider value={value}>
      <MarketCatalogProvider onSnapshot={processSnapshot} onPause={pause}>
        {children}
      </MarketCatalogProvider>
    </PriceAlertContext.Provider>
  );
}
