import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getRiskPolicy } from '@/src/mcp/state/riskPolicy';
import { sanitizeSymbol } from '@/src/mcp/utils';

const PERP_TICKER_ENDPOINT = 'https://fapi.binance.com/fapi/v1/ticker/price';
const SPOT_TICKER_ENDPOINT = 'https://api.binance.com/api/v3/ticker/price';

const DraftOrderInput = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['BUY', 'SELL']),
  notionalUsd: z.number().positive(),
  stopLossPct: z.number().positive().max(50),
  takeProfitPct: z.number().positive().max(200),
  leverage: z.number().positive().max(125),
  equityUsd: z.number().positive(),
  market: z.enum(['perp', 'spot']).default('perp'),
});

async function fetchLatestPrice(symbol: string, market: 'perp' | 'spot'): Promise<number> {
  const sanitized = sanitizeSymbol(symbol);
  const baseUrl = market === 'perp' ? PERP_TICKER_ENDPOINT : SPOT_TICKER_ENDPOINT;
  const params = new URLSearchParams({ symbol: sanitized });
  const res = await fetch(`${baseUrl}?${params.toString()}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Binance ticker error: ${res.status} ${message}`.trim());
  }
  const data = (await res.json()) as { price: string };
  const price = parseFloat(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price returned for ${sanitized}`);
  }
  return price;
}

export function registerDraftOrderTool(server: McpServer) {
  server.tool(
    'draft_order',
    'Draft a potential order with RR calculations and risk policy checks.',
    DraftOrderInput.shape,
    async (args) => {
      const { symbol, side, notionalUsd, stopLossPct, takeProfitPct, leverage, equityUsd, market } =
        DraftOrderInput.parse(args);
      try {
        const policy = getRiskPolicy();
        const sanitizedSymbol = sanitizeSymbol(symbol);
        const entryPrice = await fetchLatestPrice(sanitizedSymbol, market);

        const stopLossRatio = stopLossPct / 100;
        const takeProfitRatio = takeProfitPct / 100;

        const riskUsd = notionalUsd * stopLossRatio;
        const rewardUsd = notionalUsd * takeProfitRatio;
        const riskPct = (riskUsd / equityUsd) * 100;
        const rr = rewardUsd / (riskUsd || 1);

        const stopLossPrice = side === 'BUY'
          ? entryPrice * (1 - stopLossRatio)
          : entryPrice * (1 + stopLossRatio);
        const takeProfitPrice = side === 'BUY'
          ? entryPrice * (1 + takeProfitRatio)
          : entryPrice * (1 - takeProfitRatio);

        const policyFlags = {
          riskExceeded: riskPct > policy.perTradeMaxRiskPct,
          leverageExceeded: leverage > policy.maxLeverage,
          symbolRestricted: policy.allowlist.length > 0 && !policy.allowlist.includes(sanitizedSymbol),
        };

        const needsConfirm = Object.values(policyFlags).some(Boolean);

        const lines = [
          `Symbol: ${sanitizedSymbol} (${market})`,
          `Side: ${side}`,
          `Latest price: ${entryPrice.toFixed(4)}`,
          `Notional: $${notionalUsd.toFixed(2)} (leverage x${leverage})`,
          `Stop loss: ${stopLossPct}% (${stopLossPrice.toFixed(4)})`,
          `Take profit: ${takeProfitPct}% (${takeProfitPrice.toFixed(4)})`,
          `Risk USD: $${riskUsd.toFixed(2)} (${riskPct.toFixed(2)}% of equity)`,
          `Reward USD: $${rewardUsd.toFixed(2)} (RR ${rr.toFixed(2)})`,
          `Needs confirmation: ${needsConfirm ? 'YES' : 'No'}`,
        ];

        const policySummary = [
          policyFlags.riskExceeded ? `• Risk per trade ${riskPct.toFixed(2)}% > policy ${policy.perTradeMaxRiskPct}%` : '',
          policyFlags.leverageExceeded ? `• Leverage ${leverage}x > policy ${policy.maxLeverage}x` : '',
          policyFlags.symbolRestricted ? `• ${sanitizedSymbol} not in allowlist` : '',
        ].filter(Boolean).join('\n') || '• Within policy limits';

        lines.push('Policy check:', policySummary);

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
          structuredContent: {
            draft: {
              symbol: sanitizedSymbol,
              market,
              side,
              entryPrice,
              stopLossPrice,
              takeProfitPrice,
              stopLossPct,
              takeProfitPct,
              notionalUsd,
              equityUsd,
              leverage,
              riskUsd,
              riskPct,
              rewardUsd,
              rr,
              needsConfirm,
              policyFlags,
            },
            policySnapshot: policy,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown draft order error';
        return {
          content: [{ type: 'text', text: `生成交易草案失败: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
