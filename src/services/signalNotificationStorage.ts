import {
  readLegacySignalData,
  readSignalData,
  writeSignalData,
} from "@/src/services/signalStorageBackend";

export type NotificationState = {
  version: 2;
  userId: string;
  enabled: boolean;
  observed: Partial<Record<string, number>>;
};
const pending = new Map<string, Promise<unknown>>();
const initial = (userId: string): NotificationState => ({
  version: 2,
  userId,
  enabled: false,
  observed: {},
});
const key = (userId: string) => `kripto.notifications.v2.${userId}`;

async function read(userId: string): Promise<NotificationState> {
  const current = await readSignalData(key(userId));
  const stored =
    current ??
    (await readLegacySignalData(`kripto.notifications.v1.${userId}`));
  if (!stored) return initial(userId);
  try {
    const value = JSON.parse(stored);
    if (
      !value ||
      (value.version !== 1 && value.version !== 2) ||
      value.userId !== userId ||
      typeof value.enabled !== "boolean" ||
      !value.observed ||
      typeof value.observed !== "object" ||
      Array.isArray(value.observed)
    )
      return initial(userId);
    const observed: NotificationState["observed"] = {};
    for (const [symbol, timestamp] of Object.entries(value.observed)) {
      if (
        !/^[A-Z0-9_]{2,80}$/.test(symbol) ||
        typeof timestamp !== "number" ||
        !Number.isFinite(timestamp) ||
        timestamp <= 0
      )
        return initial(userId);
      observed[symbol] = timestamp;
    }
    return { version: 2, userId, enabled: value.enabled, observed };
  } catch {
    return initial(userId);
  }
}

export async function withNotificationState<T>(
  userId: string,
  task: (
    state: NotificationState,
    save: (state: NotificationState) => Promise<void>,
  ) => Promise<T>,
): Promise<T> {
  const work = (pending.get(userId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      return task(await read(userId), (state) =>
        writeSignalData(key(userId), JSON.stringify(state)),
      );
    });
  pending.set(userId, work);
  try {
    return await work;
  } finally {
    if (pending.get(userId) === work) pending.delete(userId);
  }
}

export function getNotificationState(
  userId: string,
): Promise<NotificationState> {
  return withNotificationState(userId, async (state) => state);
}

export function setNotificationsEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  return withNotificationState(userId, async (state, save) => {
    await save({ ...state, enabled, observed: enabled ? {} : state.observed });
  });
}
