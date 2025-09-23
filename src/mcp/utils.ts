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
