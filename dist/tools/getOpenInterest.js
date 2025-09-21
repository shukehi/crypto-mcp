import { RateLimiter } from '../core/limiter.js';
import { retry } from '../core/retry.js';
import { openInterest } from '../providers/binanceFutures.js';
const limiter = new RateLimiter(10, 10);
export async function getOpenInterestTool(args) {
    await limiter.removeToken();
    const rows = await retry(async () => openInterest(args.symbol, args.timeframe, args.limit), { retries: 3, baseMs: 300 });
    return { symbol: args.symbol, timeframe: args.timeframe, rows };
}
