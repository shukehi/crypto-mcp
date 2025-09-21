import { RateLimiter } from '../core/limiter.js';
import { retry } from '../core/retry.js';
import { fundingRates } from '../providers/binanceFutures.js';

export interface GetFundingRateArgs {
  symbol: string;
  limit: number;
}

const limiter = new RateLimiter(10, 10);

export async function getFundingRateTool(args: GetFundingRateArgs) {
  await limiter.removeToken();
  const rows = await retry(async () => fundingRates(args.symbol, args.limit), { retries: 3, baseMs: 300 });
  return { symbol: args.symbol, rows };
}
