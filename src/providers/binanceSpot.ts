import ccxt from 'ccxt';
const ex = new ccxt.binance({ enableRateLimit: true });
export async function spotOhlcv(symbol: string, timeframe: string, limit: number, since?: number) {
  return ex.fetchOHLCV(symbol.replace('USDT', '/USDT'), timeframe, since, limit);
}
