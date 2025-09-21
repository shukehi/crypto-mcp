import ccxt from 'ccxt';
const ex = new ccxt.binance({ enableRateLimit: true });
export async function spotOhlcv(symbol, timeframe, limit, since) {
    return ex.fetchOHLCV(symbol.replace('USDT', '/USDT'), timeframe, since, limit);
}
