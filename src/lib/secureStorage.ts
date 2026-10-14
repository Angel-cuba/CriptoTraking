import * as SecureStore from 'expo-secure-store';

type Manifest = { chunks: string[] };

async function readManifest(key: string): Promise<Manifest | null> {
  const value = await SecureStore.getItemAsync(key);
  return value ? JSON.parse(value) as Manifest : null;
}

async function removeChunks(chunks: string[]) {
  await Promise.all(chunks.map((key) => SecureStore.deleteItemAsync(key).catch(() => {})));
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const manifest = await readManifest(key);
    if (!manifest) return null;
    const chunks = await Promise.all(manifest.chunks.map((part) => SecureStore.getItemAsync(part)));
    return chunks.some((part) => part === null) ? null : chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previous = await readManifest(key);
    const characters = Array.from(value);
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chunks: string[] = [];
    try {
      // Keep each encrypted value below historical native payload limits.
      for (let offset = 0; offset < characters.length; offset += 400) {
        const part = `${key}.${generation}.${chunks.length}`;
        chunks.push(part);
        await SecureStore.setItemAsync(part, characters.slice(offset, offset + 400).join(''));
      }
      await SecureStore.setItemAsync(key, JSON.stringify({ chunks }));
    } catch (error) {
      await removeChunks(chunks);
      throw error;
    }
    await removeChunks(previous?.chunks ?? []);
  },

  async removeItem(key: string): Promise<void> {
    const previous = await readManifest(key);
    await SecureStore.deleteItemAsync(key);
    await removeChunks(previous?.chunks ?? []);
  },
};
