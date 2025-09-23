import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { Candle } from '@/src/mcp/types';
import { BINANCE_INTERVALS, type BinanceInterval, sanitizeSymbol, toIsoString } from '@/src/mcp/utils';

const BASE_URL = 'https://fapi.binance.com';

const schema = {
  symbol: z.string().min(1, 'Symbol is required'),
  interval: z.enum(BINANCE_INTERVALS),
  limit: z.number().int().min(1).max(1000).default(120),
  startTime: z.number().int().nonnegative().optional(),
  endTime: z.number().int().nonnegative().optional(),
};

type BinanceFuturesKlineRow = [
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

const DEFAULT_INTERVAL: BinanceInterval = '1h';

const normalizeSymbol = (value: string): string => {
  const trimmed = value.replace(/_PERP$/i, '');
  const sanitized = sanitizeSymbol(trimmed);
  if (!sanitized) {
    throw new Error(`Invalid futures symbol: ${value}`);
  }
  return sanitized;
};

export function registerFuturesKlinesTool(server: McpServer) {
  server.tool(
    'get_binance_perp_klines',
    'Fetch Binance USDⓈ-M perpetual candlesticks (e.g. BTCUSDT)',
    schema,
    async ({ symbol, interval, limit, startTime, endTime }) => {
      const apiSymbol = normalizeSymbol(symbol);
      const params = new URLSearchParams({
        symbol: apiSymbol,
        interval,
        limit: String(limit ?? 120),
      });

      if (startTime !== undefined) params.set('startTime', String(startTime));
      if (endTime !== undefined) params.set('endTime', String(endTime));

      try {
        const response = await fetch(`${BASE_URL}/fapi/v1/klines?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`Binance Futures error: ${response.status} ${message}`.trim());
        }

        const data = (await response.json()) as unknown;
        if (!Array.isArray(data) || data.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Binance 未返回 ${apiSymbol} (${interval}) 的任何永续 K 线数据。`,
              },
            ],
          };
        }

        const candles: Candle[] = (data as BinanceFuturesKlineRow[]).map((row) => ({
          openTime: Number(row[0]),
          open: row[1],
          high: row[2],
          low: row[3],
          close: row[4],
          volume: row[5],
          closeTime: Number(row[6]),
        }));

        const first = candles[0];
        const last = candles[candles.length - 1];

        const preview = candles
          .slice(-5)
          .map((candle) =>
            [
              toIsoString(candle.closeTime),
              `O:${candle.open}`,
              `H:${candle.high}`,
              `L:${candle.low}`,
              `C:${candle.close}`,
              `V:${candle.volume}`,
            ].join(' '),
          )
          .join('\n');

        const summaryLines = [
          `交易对: ${apiSymbol}`,
          `周期: ${interval}`,
          `返回条目: ${candles.length} (limit=${limit ?? 120})`,
          `时间范围: ${toIsoString(first.openTime)} → ${toIsoString(last.closeTime)}`,
          `最新收盘价: ${last.close} (最高 ${last.high} / 最低 ${last.low})`,
          '',
          '最近 5 根永续 K 线:',
          preview,
        ];

        return {
          content: [{ type: 'text', text: summaryLines.join('\n') }],
          structuredContent: {
            symbol: apiSymbol,
            interval,
            market: 'USD-M Perpetual',
            candles,
            summary: {
              count: candles.length,
              limit: limit ?? 120,
              openTime: toIsoString(first.openTime),
              closeTime: toIsoString(last.closeTime),
              lastCandle: {
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                volume: last.volume,
                closeTime: toIsoString(last.closeTime),
              },
            },
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error fetching futures data';
        return {
          content: [{ type: 'text', text: `获取 Binance 永续 K 线失败: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
