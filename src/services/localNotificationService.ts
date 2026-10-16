import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import type { AssetSignal } from '@/src/services/signalService';

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';
export type NotificationPermission = 'granted' | 'provisional' | 'denied' | 'undetermined' | 'unsupported';
export type NotificationChannel = 'signals' | 'price-alerts';
const kind = 'kripto.signal';
let presentationGuard: ((userId: string) => boolean) | null = null;
let pricePresentationGuard: ((userId: string, symbol: string) => boolean) | null = null;
const granted = (settings: Notifications.NotificationPermissionsStatus) => settings.granted ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;

function configureHandler() {
  if (!notificationsSupported) return;
  if (!presentationGuard && !pricePresentationGuard) {
    Notifications.setNotificationHandler(null);
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data ?? {};
      const show = typeof data.userId === 'string' && AppState.currentState === 'active' && (
        (data.kind === kind && presentationGuard?.(data.userId) === true) ||
        (data.kind === 'price-alert' && typeof data.symbol === 'string' && pricePresentationGuard?.(data.userId, data.symbol) === true)
      );
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
}

export function configureSignalNotifications(guard: (userId: string) => boolean): () => void {
  presentationGuard = guard;
  configureHandler();
  return () => {
    if (presentationGuard === guard) {
      presentationGuard = null;
      configureHandler();
    }
  };
}

export function configurePriceAlertNotifications(guard: (userId: string, symbol: string) => boolean): () => void {
  pricePresentationGuard = guard;
  configureHandler();
  return () => {
    if (pricePresentationGuard === guard) {
      pricePresentationGuard = null;
      configureHandler();
    }
  };
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported) return 'unsupported';
  const settings = await Notifications.getPermissionsAsync();
  if (settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'provisional';
  if (granted(settings)) return 'granted';
  return settings.status === 'denied' || !settings.canAskAgain ? 'denied' : 'undetermined';
}

export async function hasNotificationPermission(): Promise<boolean> {
  return notificationsSupported && granted(await Notifications.getPermissionsAsync());
}

export async function prepareNotificationChannel(channelId: NotificationChannel) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: channelId === 'signals' ? 'Market signals' : 'Price alerts', importance: Notifications.AndroidImportance.HIGH, sound: 'default',
    });
  }
}

export async function requestNotificationPermission(channelId: NotificationChannel = 'signals'): Promise<boolean> {
  if (!notificationsSupported) return false;
  await prepareNotificationChannel(channelId);
  const existing = await Notifications.getPermissionsAsync();
  if (granted(existing)) return true;
  if (!existing.canAskAgain) return false;
  return granted(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
}

export async function sendSignalNotification(userId: string, signal: AssetSignal, isCurrent: () => boolean): Promise<void> {
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: `${kind}.${userId}.${signal.symbol}.${signal.timestamp}.${signal.type}`,
    content: {
      title: `${signal.symbol} · ${signal.type}`, body: signal.reason, sound: 'default',
      data: { kind, userId, symbol: signal.symbol, type: signal.type, timestamp: signal.timestamp },
    },
    trigger: Platform.OS === 'android' ? { channelId: 'signals' } : null,
  });
  if (!isCurrent()) {
    await Promise.all([Notifications.cancelScheduledNotificationAsync(identifier), Notifications.dismissNotificationAsync(identifier)]);
  }
}

export async function clearSignalNotifications(userId: string): Promise<void> {
  return clearLocalNotifications(kind, userId);
}

export async function clearLocalNotifications(notificationKind: string, userId: string, symbols?: readonly string[]): Promise<void> {
  if (!notificationsSupported) return;
  const [scheduled, presented] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(), Notifications.getPresentedNotificationsAsync(),
  ]);
  const own = (data: Record<string, unknown> | undefined) => data?.kind === notificationKind && data.userId === userId &&
    (!symbols || (typeof data.symbol === 'string' && symbols.includes(data.symbol)));
  await Promise.all([
    ...scheduled.filter((item) => own(item.content.data)).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    ...presented.filter((item) => own(item.request.content.data)).map((item) => Notifications.dismissNotificationAsync(item.request.identifier)),
  ]);
}
