import { z } from 'zod';
import { RateLimiter } from '../core/limiter.js';
import { retry } from '../core/retry.js';
import { futuresOhlcv } from '../providers/binanceFutures.js';
import { spotOhlcv } from '../providers/binanceSpot.js';

export const GetOhlcvArgsSchema = z.object({
  market: z.enum(['spot','futures']).default('futures'),
  symbol: z.string().default('SOLUSDT'),
  timeframe: z.enum(['1m','5m','15m','1h','4h','1d']).default('1h'),
  limit: z.number().int().min(10).max(1500).default(500),
  since: z.number().int().nullable().optional()
});

const limiter = new RateLimiter(10, 10);

export async function getOhlcvTool(args: z.infer<typeof GetOhlcvArgsSchema>) {
  await limiter.removeToken();
  const rows = await retry(async () => {
    if (args.market === 'futures') return futuresOhlcv(args.symbol, args.timeframe, args.limit, args.since ?? undefined);
    return spotOhlcv(args.symbol, args.timeframe, args.limit, args.since ?? undefined);
  }, { retries: 3, baseMs: 300 });
  return {
    symbol: args.symbol,
    market: args.market,
    timeframe: args.timeframe,
    rows: rows.map((r:any)=> ({ t: r[0], o: r[1], h: r[2], l: r[3], c: r[4], v: r[5] }))
  };
}
