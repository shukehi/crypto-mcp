import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { Candle, PriceActionSummary, SupportResistanceLevel, PriceActionStructure } from '@/src/mcp/types';
import { BINANCE_INTERVALS, sanitizeSymbol, toIsoString } from '@/src/mcp/utils';

const SPOT_ENDPOINT = 'https://api.binance.com/api/v3/klines';
const PERP_ENDPOINT = 'https://fapi.binance.com/fapi/v1/klines';

const PriceActionInput = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  interval: z.enum(BINANCE_INTERVALS),
  lookback: z.number().int().min(50).max(1000).default(180),
  market: z.enum(['spot', 'perp']).default('perp'),
});

type BinanceKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

async function fetchCandles({ symbol, interval, limit, market }: { symbol: string; interval: string; limit: number; market: 'spot' | 'perp'; }): Promise<Candle[]> {
  const sanitized = sanitizeSymbol(symbol);
  const baseUrl = market === 'spot' ? SPOT_ENDPOINT : PERP_ENDPOINT;
  const params = new URLSearchParams({
    symbol: sanitized,
    interval,
    limit: String(Math.min(limit, 1000)),
  });

  const res = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Binance price action error: ${res.status} ${message}`.trim());
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Binance did not return enough candles for ${sanitized}`);
  }

  return (data as BinanceKlineRow[]).map((row) => ({
    openTime: Number(row[0]),
    open: row[1],
    high: row[2],
    low: row[3],
    close: row[4],
    volume: row[5],
    closeTime: Number(row[6]),
  }));
}

function determineStructure(candles: Candle[]): PriceActionStructure {
  const firstClose = parseFloat(candles[0].close);
  const lastClose = parseFloat(candles[candles.length - 1].close);
  const changePct = (lastClose - firstClose) / firstClose;
  if (changePct > 0.02) return 'uptrend';
  if (changePct < -0.02) return 'downtrend';
  return 'range';
}

function computeSupportResistance(candles: Candle[]): SupportResistanceLevel[] {
  const lows = candles.map((candle) => parseFloat(candle.low));
  const highs = candles.map((candle) => parseFloat(candle.high));

  const minLow = Math.min(...lows);
  const maxHigh = Math.max(...highs);

  const supportTouches = lows.filter((price) => Math.abs(price - minLow) / minLow < 0.002).length;
  const resistanceTouches = highs.filter((price) => Math.abs(price - maxHigh) / maxHigh < 0.002).length;

  return [
    { price: minLow, touches: supportTouches, kind: 'support' },
    { price: maxHigh, touches: resistanceTouches, kind: 'resistance' },
  ];
}

function buildBreakoutCandidates(levels: SupportResistanceLevel[], structure: PriceActionStructure) {
  const support = levels.find((level) => level.kind === 'support');
  const resistance = levels.find((level) => level.kind === 'resistance');

  const candidates: PriceActionSummary['breakoutCandidates'] = [];
  if (resistance) {
    candidates.push({
      window: 'recent-high',
      confirmClosePct: 0.5,
      pullbackMaxPct: 0.3,
      rule: `Close above ${resistance.price.toFixed(2)} with volume confirmation`,
    });
  }
  if (support) {
    candidates.push({
      window: 'recent-low',
      confirmClosePct: 0.5,
      pullbackMaxPct: 0.3,
      rule: `Close below ${support.price.toFixed(2)} with strong follow-through`,
    });
  }
  if (structure === 'range' && support && resistance) {
    candidates.push({
      window: 'range-trading',
      confirmClosePct: 0,
      pullbackMaxPct: 0.5,
      rule: `Fade the range ${support.price.toFixed(2)} - ${resistance.price.toFixed(2)} with tight stops`,
    });
  }
  return candidates;
}

export function registerPriceActionTool(server: McpServer) {
  server.tool(
    'price_action_summary',
    'Analyze recent price action and return structure/support/resistance levels.',
    PriceActionInput.shape,
    async (args) => {
      const { symbol, interval, lookback, market } = PriceActionInput.parse(args);
      try {
        const candles = await fetchCandles({ symbol, interval, limit: lookback, market });
        const sampled = candles.slice(-lookback);

        const structure = determineStructure(sampled);
        const srLevels = computeSupportResistance(sampled);
        const breakoutCandidates = buildBreakoutCandidates(srLevels, structure);

        const first = sampled[0];
        const last = sampled[sampled.length - 1];
        const closeChangePct = ((parseFloat(last.close) - parseFloat(first.close)) / parseFloat(first.close)) * 100;

        const summary: PriceActionSummary = {
          symbol: sanitizeSymbol(symbol),
          interval,
          lookback,
          structure,
          srLevels,
          breakoutCandidates,
        };

        const text = [
          `Symbol: ${summary.symbol} (${market})`,
          `Interval: ${interval}`,
          `Lookback: ${lookback} candles`,
          `Structure: ${structure}`,
          `Close change: ${closeChangePct.toFixed(2)}%`,
          `Support: ${srLevels[0]?.price.toFixed(2) ?? 'N/A'} (touches ${srLevels[0]?.touches ?? 0})`,
          `Resistance: ${srLevels[1]?.price.toFixed(2) ?? 'N/A'} (touches ${srLevels[1]?.touches ?? 0})`,
          'Breakout ideas:',
          ...breakoutCandidates.map((candidate, index) => `${index + 1}. ${candidate.rule}`),
        ].join('\n');

        return {
          content: [{ type: 'text', text }],
          structuredContent: {
            summary,
            window: {
              start: toIsoString(first.openTime),
              end: toIsoString(last.closeTime),
            },
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown price action error';
        return {
          content: [{ type: 'text', text: `生成价格行为摘要失败: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
