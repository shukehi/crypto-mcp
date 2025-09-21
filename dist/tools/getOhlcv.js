import { RateLimiter } from '../core/limiter.js';
import { retry } from '../core/retry.js';
import { futuresOhlcv } from '../providers/binanceFutures.js';
import { spotOhlcv } from '../providers/binanceSpot.js';
const limiter = new RateLimiter(10, 10);
export async function getOhlcvTool(args) {
    await limiter.removeToken();
    const rows = await retry(async () => {
        if (args.market === 'futures')
            return futuresOhlcv(args.symbol, args.timeframe, args.limit, args.since ?? undefined);
        return spotOhlcv(args.symbol, args.timeframe, args.limit, args.since ?? undefined);
    }, { retries: 3, baseMs: 300 });
    return {
        symbol: args.symbol,
        market: args.market,
        timeframe: args.timeframe,
        rows: rows.map((r) => ({ t: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] }))
    };
}
