import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import type { AssetSignal } from '@/src/services/signalService';

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';
const kind = 'kripto.signal';
let presentationGuard: ((userId: string) => boolean) | null = null;
const granted = (settings: Notifications.NotificationPermissionsStatus) => settings.granted ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  settings.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;

export function configureSignalNotifications(guard: (userId: string) => boolean): () => void {
  presentationGuard = guard;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data ?? {};
      const show = data.kind === kind && typeof data.userId === 'string' &&
        presentationGuard?.(data.userId) === true && AppState.currentState === 'active';
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
  return () => {
    if (presentationGuard === guard) {
      presentationGuard = null;
      Notifications.setNotificationHandler(null);
    }
  };
}

export async function hasNotificationPermission(): Promise<boolean> {
  return notificationsSupported && granted(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('signals', {
      name: 'Market signals', importance: Notifications.AndroidImportance.HIGH, sound: 'default',
    });
  }
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
  const [scheduled, presented] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(), Notifications.getPresentedNotificationsAsync(),
  ]);
  const own = (data: Record<string, unknown> | undefined) => data?.kind === kind && data.userId === userId;
  await Promise.all([
    ...scheduled.filter((item) => own(item.content.data)).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    ...presented.filter((item) => own(item.request.content.data)).map((item) => Notifications.dismissNotificationAsync(item.request.identifier)),
  ]);
}
