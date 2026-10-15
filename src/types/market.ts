export type MarketSymbol = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
};

export type MarketTicker = {
  symbol: string;
  price: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  sourceCloseTime: number;
};

export type MarketAsset = MarketSymbol & {
  ticker: MarketTicker | null;
};

export type MarketSnapshot = {
  assets: MarketAsset[];
  receivedAt: number;
};

export type MarketPriceObservation = {
  price: number;
  sourceCloseTime: number;
  receivedAt: number;
};

export type MarketMovement = {
  changePercent: number;
  previousReceivedAt: number;
  receivedAt: number;
};
