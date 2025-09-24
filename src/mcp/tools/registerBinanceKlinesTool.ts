import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { Candle } from '@/src/mcp/types';
import { BINANCE_INTERVALS, type BinanceInterval, sanitizeSymbol, toIsoString } from '@/src/mcp/utils';

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

const schema = {
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .transform((value) => value.replace('/', '').toUpperCase()),
  interval: z.enum(BINANCE_INTERVALS),
  limit: z.number().int().min(1).max(1000).optional(),
  startTime: z.number().int().nonnegative().optional(),
  endTime: z.number().int().nonnegative().optional(),
};

const BINANCE_BASE_URL = process.env.BINANCE_API_BASE_URL ?? 'https://api.binance.com';

const DEFAULT_INTERVAL: BinanceInterval = '1h';

type SearchCacheEntry = {
  id: string;
  title: string;
  description: string;
  symbol: string;
  interval: BinanceInterval;
};

const searchCache = new Map<string, SearchCacheEntry>();

const searchToolSchema = {
  query: z.string().min(1, 'Query is required').describe('The search query string.'),
};

const fetchToolSchema = {
  id: z.string().min(1, 'Identifier is required').describe('Identifier returned by the search tool.'),
};

function makeResultId(symbol: string, interval: string) {
  return `${symbol.toUpperCase()}_${interval}`;
}

function resolveInterval(input?: string): BinanceInterval {
  if (!input) return DEFAULT_INTERVAL;
  const normalized = input.trim();
  const match = BINANCE_INTERVALS.find((item) => item.toLowerCase() === normalized.toLowerCase());
  return (match ?? DEFAULT_INTERVAL) as BinanceInterval;
}

function rememberResult(id: string, title: string, description: string, symbol: string, interval: BinanceInterval) {
  searchCache.set(id, {
    id,
    title,
    description,
    symbol: sanitizeSymbol(symbol.toUpperCase().trim()),
    interval,
  });
}

export function registerBinanceKlinesTool(server: McpServer) {
  server.tool(
    'get_binance_klines',
    'Get market data',
    schema,
    async ({ symbol, interval, limit, startTime, endTime }) => {
      const params = new URLSearchParams({
        symbol,
        interval,
        limit: String(limit ?? 50),
      });

      if (startTime !== undefined) params.set('startTime', String(startTime));
      if (endTime !== undefined) params.set('endTime', String(endTime));

      try {
        const response = await fetch(
          `${BINANCE_BASE_URL}/api/v3/klines?${params.toString()}`,
          { headers: { Accept: 'application/json' } },
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`Binance API error: ${response.status} ${message}`.trim());
        }

        const data = (await response.json()) as unknown;

        if (!Array.isArray(data) || data.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Binance returned no kline data for ${symbol} (${interval}).`,
              },
            ],
          };
        }

        const candles: Candle[] = (data as BinanceKlineRow[]).map((row) => ({
          openTime: Number(row[0]),
          open: row[1],
          high: row[2],
          low: row[3],
          close: row[4],
          volume: row[5],
          closeTime: Number(row[6]),
        }));

        if (candles.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Binance returned no kline data for ${symbol} (${interval}).`,
              },
            ],
          };
        }

        const first = candles[0];
        const last = candles[candles.length - 1];

        const recentPreview = candles
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
          `Symbol: ${symbol}`,
          `Interval: ${interval}`,
          `Returned entries: ${candles.length} (limit=${limit ?? 50})`,
          `Time range: ${toIsoString(first.openTime)} → ${toIsoString(last.closeTime)}`,
          `Latest close: ${last.close} (high ${last.high} / low ${last.low})`,
          '',
          'Recent 5 candles:',
          recentPreview,
        ];

        const resultId = makeResultId(symbol, interval);
        rememberResult(
          resultId,
          `${symbol} (${interval})`,
          'Latest kline summary, use with fetch tool for 24h ticker data.',
          symbol,
          interval as BinanceInterval,
        );

        return {
          content: [{ type: 'text', text: summaryLines.join('\n') }],
          structuredContent: {
            id: resultId,
            symbol,
            interval,
            candles,
            summary: {
              count: candles.length,
              limit: limit ?? 50,
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
        const message =
          error instanceof Error ? error.message : 'Unknown error fetching Binance data';
        return {
          content: [{ type: 'text', text: `Failed to fetch Binance data: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

export function registerRollDiceTool(server: McpServer) {
  server.tool(
    'roll_dice',
    'Rolls dice',
    { sides: z.number().int().min(2) },
    async ({ sides }) => {
      const value = 1 + Math.floor(Math.random() * sides);
      return { content: [{ type: 'text', text: `You rolled a ${value}!` }] };
    },
  );
}

export function registerSearchTool(server: McpServer) {
  server.tool(
    'search',
    'Search crypto symbols',
    searchToolSchema,
    async ({ query }) => {
      const tokens = query.trim().split(/\s+/);
      const symbolCandidate = sanitizeSymbol(tokens[0] ?? '');
      if (!symbolCandidate) {
        return {
          content: [{ type: 'text', text: 'Please enter a valid symbol, e.g. "BTCUSDT" or "BTCUSDT 1h".' }],
          structuredContent: { results: [] },
        };
      }

      const intervalCandidate = resolveInterval(tokens[1]);
      const resultId = makeResultId(symbolCandidate, intervalCandidate);

      const entry: SearchCacheEntry = {
        id: resultId,
        title: `${symbolCandidate} (${intervalCandidate})`,
        description: `Use fetch tool to get 24h ticker data or get_binance_klines to view charts.`,
        symbol: symbolCandidate,
        interval: intervalCandidate,
      };

      rememberResult(entry.id, entry.title, entry.description, symbolCandidate, intervalCandidate);

      return {
        content: [
          {
            type: 'text',
            text: `Found 1 match:\n1. ${entry.title} — ${entry.description}\n\nCall fetch tool with ID ${entry.id} to get ticker summary.`,
          },
        ],
        structuredContent: {
          results: [entry],
        },
      };
    },
  );
}

export function registerFetchTool(server: McpServer) {
  server.tool(
    'fetch',
    'Fetch ticker data',
    fetchToolSchema,
    async ({ id }) => {
      const entry = searchCache.get(id);
      const [symbolPart, intervalPart] = id.split('_');
      const symbol = sanitizeSymbol(entry?.symbol ?? symbolPart ?? '');
      const interval = entry?.interval ?? resolveInterval(intervalPart);

      if (!symbol) {
        return {
          content: [{ type: 'text', text: `Unable to parse ID ${id}, please generate a valid ID through search first.` }],
          isError: true,
        };
      }

      const params = new URLSearchParams({ symbol });

      try {
        const response = await fetch(
          `${BINANCE_BASE_URL}/api/v3/ticker/24hr?${params.toString()}`,
          { headers: { Accept: 'application/json' } },
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`Binance API error: ${response.status} ${message}`.trim());
        }

        const ticker = (await response.json()) as Record<string, string>;
        const summaryLines = [
          `Symbol: ${symbol}`,
          `Interval: ${interval}`,
          `Latest Price: ${ticker.lastPrice ?? 'Unknown'}`,
          `24h Change: ${ticker.priceChangePercent ?? 'Unknown'} %`,
          `High/Low: ${ticker.highPrice ?? 'Unknown'} / ${ticker.lowPrice ?? 'Unknown'}`,
          `Volume: ${ticker.volume ?? 'Unknown'}`,
        ];

        if (!entry) {
          rememberResult(id, `${symbol} (${interval})`, 'Symbol discovered through search.', symbol, interval);
        }

        return {
          content: [
            {
              type: 'text',
              text: summaryLines.join('\n'),
            },
          ],
          structuredContent: {
            id,
            symbol,
            interval,
            ticker,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error fetching Binance ticker data';
        return {
          content: [{ type: 'text', text: `Failed to fetch Binance ticker: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
