import ccxt from 'ccxt';
const ex = new ccxt.binance({ options: { defaultType: 'future' }, enableRateLimit: true });
export async function futuresOhlcv(symbol, timeframe, limit, since) {
    // For futures, ccxt expects the same 'SOL/USDT' format
    return ex.fetchOHLCV(symbol.replace('USDT', '/USDT'), timeframe, since, limit);
}
export async function markPrice(symbol) {
    const markets = await ex.loadMarkets();
    const m = markets[symbol.replace('USDT', '/USDT')];
    if (!m)
        throw new Error('Unknown symbol');
    const ticker = await ex.fetchTicker(m.symbol);
    // mark price is not always present via generic ticker; for demo fallback to last/close
    const price = (ticker.info?.markPrice) ?? ticker.last ?? ticker.close;
    return { symbol, markPrice: Number(price), t: Date.now() };
}
export async function fundingRates(symbol, limit) {
    // ccxt `fetchFundingRateHistory` varies by exchange support
    if (typeof ex.fetchFundingRateHistory !== 'function')
        throw new Error('Funding rate history not supported by ccxt version');
    const sym = symbol.replace('USDT', '/USDT');
    const rows = await ex.fetchFundingRateHistory(sym, undefined, limit);
    return rows.map((r) => ({ t: r['timestamp'], rate: Number(r['fundingRate'] ?? r['info']?.fundingRate ?? 0), interval: '8h' }));
}
export async function openInterest(symbol, timeframe, limit) {
    // Not all OI endpoints are unified in ccxt across exchanges;
    // for demo we use fetchOpenInterestHistory if present, else throw.
    if (typeof ex.fetchOpenInterestHistory !== 'function')
        throw new Error('Open interest history not supported by ccxt version');
    const sym = symbol.replace('USDT', '/USDT');
    const rows = await ex.fetchOpenInterestHistory(sym, timeframe, undefined, limit);
    return rows.map((r) => ({ t: r['timestamp'], oi: Number(r['openInterestBase'] ?? r['openInterestQuote'] ?? r['openInterest'] ?? 0) }));
}
