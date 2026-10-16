import type { AssetSignal } from '@/src/services/signalService';
export type NotificationPermission = 'granted' | 'provisional' | 'denied' | 'undetermined' | 'unsupported';
export type NotificationChannel = 'signals' | 'price-alerts';

export const notificationsSupported = false;
export function configureSignalNotifications(_guard: (userId: string) => boolean): () => void { return () => {}; }
export function configurePriceAlertNotifications(_guard: (userId: string, symbol: string) => boolean): () => void { return () => {}; }
export async function getNotificationPermission(): Promise<NotificationPermission> { return 'unsupported'; }
export async function prepareNotificationChannel(_channelId: NotificationChannel): Promise<void> {}
export async function hasNotificationPermission(): Promise<boolean> { return false; }
export async function requestNotificationPermission(_channelId: NotificationChannel = 'signals'): Promise<boolean> { return false; }
export async function sendSignalNotification(_userId: string, _signal: AssetSignal, _isCurrent: () => boolean): Promise<void> {}
export async function clearSignalNotifications(_userId: string): Promise<void> {}
export async function clearLocalNotifications(_kind: string, _userId: string, _symbols?: readonly string[]): Promise<void> {}
