import type { AssetSignal } from '@/src/services/signalService';

export const notificationsSupported = false;
export function configureSignalNotifications(_guard: (userId: string) => boolean): () => void { return () => {}; }
export async function hasNotificationPermission(): Promise<boolean> { return false; }
export async function requestNotificationPermission(): Promise<boolean> { return false; }
export async function sendSignalNotification(_userId: string, _signal: AssetSignal, _isCurrent: () => boolean): Promise<void> {}
export async function clearSignalNotifications(_userId: string): Promise<void> {}
