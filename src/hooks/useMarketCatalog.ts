import { useContext } from 'react';
import { MarketCatalogContext } from '@/src/context/MarketCatalogContext';

export function useMarketCatalog() {
  const context = useContext(MarketCatalogContext);
  if (!context) throw new Error('useMarketCatalog must be used inside MarketCatalogProvider.');
  return context;
}
