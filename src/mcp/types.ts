export type Candle = {
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
};

export type PriceActionStructure = 'uptrend' | 'downtrend' | 'range';

export type SupportResistanceLevel = {
  price: number;
  touches: number;
  kind: 'support' | 'resistance';
};

export type PriceActionSummary = {
  symbol: string;
  interval: string;
  lookback: number;
  structure: PriceActionStructure;
  srLevels: SupportResistanceLevel[];
  breakoutCandidates: Array<{
    window: string;
    confirmClosePct: number;
    pullbackMaxPct: number;
    rule: string;
  }>;
};
