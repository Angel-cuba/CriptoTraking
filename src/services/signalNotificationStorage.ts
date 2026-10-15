import { secureStorage } from '@/src/lib/secureStorage';
import { SUPPORTED_ASSETS, type SupportedAsset } from '@/src/types/profile';

export type NotificationState = {
  version: 1; userId: string; enabled: boolean; observed: Partial<Record<SupportedAsset, number>>;
};
const pending = new Map<string, Promise<unknown>>();
const initial = (userId: string): NotificationState => ({ version: 1, userId, enabled: false, observed: {} });
const key = (userId: string) => `kripto.notifications.v1.${userId}`;

async function read(userId: string): Promise<NotificationState> {
  const stored = await secureStorage.getItem(key(userId));
  if (!stored) return initial(userId);
  try {
    const value = JSON.parse(stored);
    if (!value || value.version !== 1 || value.userId !== userId || typeof value.enabled !== 'boolean' ||
      !value.observed || typeof value.observed !== 'object' || Array.isArray(value.observed)) return initial(userId);
    const observed: NotificationState['observed'] = {};
    for (const [symbol, timestamp] of Object.entries(value.observed)) {
      if (!SUPPORTED_ASSETS.some((asset) => asset === symbol) || typeof timestamp !== 'number' ||
        !Number.isFinite(timestamp) || timestamp <= 0) return initial(userId);
      observed[symbol as SupportedAsset] = timestamp;
    }
    return { version: 1, userId, enabled: value.enabled, observed };
  } catch { return initial(userId); }
}

export async function withNotificationState<T>(userId: string, task: (
  state: NotificationState, save: (state: NotificationState) => Promise<void>,
) => Promise<T>): Promise<T> {
  const work = (pending.get(userId) ?? Promise.resolve()).catch(() => {}).then(async () => {
    return task(await read(userId), (state) => secureStorage.setItem(key(userId), JSON.stringify(state)));
  });
  pending.set(userId, work);
  try { return await work; } finally { if (pending.get(userId) === work) pending.delete(userId); }
}

export function getNotificationState(userId: string): Promise<NotificationState> {
  return withNotificationState(userId, async (state) => state);
}

export function setNotificationsEnabled(userId: string, enabled: boolean): Promise<void> {
  return withNotificationState(userId, async (state, save) => {
    await save({ ...state, enabled, observed: enabled ? {} : state.observed });
  });
}
