import { z } from 'zod';
import { RateLimiter } from '../core/limiter.js';
import { retry } from '../core/retry.js';
import { fundingRates } from '../providers/binanceFutures.js';
export const GetFundingRateArgsSchema = z.object({
    symbol: z.string().default('SOLUSDT'),
    limit: z.number().int().min(1).max(1000).default(100)
});
const limiter = new RateLimiter(10, 10);
export async function getFundingRateTool(args) {
    await limiter.removeToken();
    const rows = await retry(async () => fundingRates(args.symbol, args.limit), { retries: 3, baseMs: 300 });
    return { symbol: args.symbol, rows };
}
