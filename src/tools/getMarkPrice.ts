import { z } from 'zod';
import { RateLimiter } from '../core/limiter.js';
import { retry } from '../core/retry.js';
import { markPrice } from '../providers/binanceFutures.js';

export const GetMarkPriceArgsSchema = z.object({
  symbol: z.string().default('SOLUSDT')
});

const limiter = new RateLimiter(10, 10);

export async function getMarkPriceTool(args: z.infer<typeof GetMarkPriceArgsSchema>) {
  await limiter.removeToken();
  const result = await retry(async () => markPrice(args.symbol), { retries: 3, baseMs: 300 });
  return result;
}
