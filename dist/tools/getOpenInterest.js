import { z } from 'zod';
import { RateLimiter } from '../core/limiter.js';
import { retry } from '../core/retry.js';
import { openInterest } from '../providers/binanceFutures.js';
export const GetOpenInterestArgsSchema = z.object({
    symbol: z.string().default('SOLUSDT'),
    timeframe: z.enum(['5m', '15m', '1h', '4h', '1d']).default('1h'),
    limit: z.number().int().min(1).max(1000).default(200)
});
const limiter = new RateLimiter(10, 10);
export async function getOpenInterestTool(args) {
    await limiter.removeToken();
    const rows = await retry(async () => openInterest(args.symbol, args.timeframe, args.limit), { retries: 3, baseMs: 300 });
    return { symbol: args.symbol, timeframe: args.timeframe, rows };
}
