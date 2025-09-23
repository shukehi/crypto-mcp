export const BINANCE_INTERVALS = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M',
] as const;

export type BinanceInterval = (typeof BINANCE_INTERVALS)[number];

export const toIsoString = (ms: number): string => new Date(ms).toISOString();

export const sanitizeSymbol = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

export const makeIdempotencyKey = (payload: Record<string, unknown>): string => {
  const sortedEntries = Object.keys(payload)
    .sort()
    .map((key) => `${key}:${String(payload[key])}`)
    .join('|');
  return `idem:${sortedEntries}`;
};
