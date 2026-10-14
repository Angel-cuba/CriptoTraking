import { calculateSignal, type SignalResult } from '@/src/api/signalApi';
import { getBinanceData } from '@/src/services/marketService';
import { SUPPORTED_ASSETS, type SupportedAsset } from '@/src/types/profile';

export type AssetSignal = SignalResult & { symbol: SupportedAsset };
export type SignalBatch = { signals: AssetSignal[]; failedSymbols: SupportedAsset[] };

export async function getAssetSignal(symbol: SupportedAsset, signal?: AbortSignal): Promise<AssetSignal> {
  const candles = await getBinanceData(symbol, signal);
  return { symbol, ...calculateSignal(candles) };
}

export async function getSignals(signal?: AbortSignal): Promise<SignalBatch> {
  const results = await Promise.allSettled(SUPPORTED_ASSETS.map((symbol) => getAssetSignal(symbol, signal)));
  if (signal?.aborted) throw new Error('Signal request cancelled.');
  const batch: SignalBatch = { signals: [], failedSymbols: [] };
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') batch.signals.push(result.value);
    else batch.failedSymbols.push(SUPPORTED_ASSETS[index]);
  });
  return batch;
}
