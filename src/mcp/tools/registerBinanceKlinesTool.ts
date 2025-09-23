import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const binanceIntervals = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M',
] as const;

type BinanceInterval = (typeof binanceIntervals)[number];

type BinanceKline = [
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
  interval: z.enum(binanceIntervals),
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
  const match = binanceIntervals.find((item) => item.toLowerCase() === normalized.toLowerCase());
  return (match ?? DEFAULT_INTERVAL) as BinanceInterval;
}

function sanitizeSymbol(input: string) {
  return input.replace(/[^A-Z0-9]/g, '').slice(0, 20);
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
    '获取币安现货市场的最新 K 线数据',
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
                text: `Binance 未返回 ${symbol} (${interval}) 的任何 K 线数据。`,
              },
            ],
          };
        }

        const candles = (data as BinanceKline[]).map((kline) => ({
          openTime: Number(kline[0]),
          open: kline[1],
          high: kline[2],
          low: kline[3],
          close: kline[4],
          volume: kline[5],
          closeTime: Number(kline[6]),
        }));

        if (candles.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Binance 未返回 ${symbol} (${interval}) 的任何 K 线数据。`,
              },
            ],
          };
        }

        const first = candles[0];
        const last = candles[candles.length - 1];

        const formatTime = (ms: number) => new Date(ms).toISOString();

        const recentPreview = candles
          .slice(-5)
          .map((candle) =>
            [
              formatTime(candle.closeTime),
              `O:${candle.open}`,
              `H:${candle.high}`,
              `L:${candle.low}`,
              `C:${candle.close}`,
              `V:${candle.volume}`,
            ].join(' '),
          )
          .join('\n');

        const summaryLines = [
          `交易对: ${symbol}`,
          `周期: ${interval}`,
          `返回条目: ${candles.length} (limit=${limit ?? 50})`,
          `时间范围: ${formatTime(first.openTime)} → ${formatTime(last.closeTime)}`,
          `最新收盘价: ${last.close} (最高 ${last.high} / 最低 ${last.low})`,
          '',
          '最近 5 根 K 线:',
          recentPreview,
        ];

        const resultId = makeResultId(symbol, interval);
        rememberResult(
          resultId,
          `${symbol} (${interval})`,
          '最新 K 线摘要，可配合 fetch 工具查看 24h 行情。',
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
              openTime: formatTime(first.openTime),
              closeTime: formatTime(last.closeTime),
              lastCandle: {
                open: last.open,
                high: last.high,
                low: last.low,
                close: last.close,
                volume: last.volume,
                closeTime: formatTime(last.closeTime),
              },
            },
          },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error fetching Binance data';
        return {
          content: [{ type: 'text', text: `获取 Binance K 线失败: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

export function registerRollDiceTool(server: McpServer) {
  server.tool(
    'roll_dice',
    'Rolls an N-sided die',
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
    'Searches Binance spot markets and returns IDs usable with fetch.',
    searchToolSchema,
    async ({ query }) => {
      const tokens = query.trim().split(/\s+/);
      const symbolCandidate = tokens[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '') ?? '';
      if (!symbolCandidate) {
        return {
          content: [{ type: 'text', text: '请输入有效的交易对，例如 "BTCUSDT" 或 "BTCUSDT 1h"。' }],
          structuredContent: { results: [] },
        };
      }

      const intervalCandidate = resolveInterval(tokens[1]);
      const resultId = makeResultId(symbolCandidate, intervalCandidate);

      const entry: SearchCacheEntry = {
        id: resultId,
        title: `${symbolCandidate} (${intervalCandidate})`,
        description: '使用 fetch 工具获取 24h 行情或 get_binance_klines 查看 K 线。',
        symbol: symbolCandidate,
        interval: intervalCandidate,
      };

      rememberResult(entry.id, entry.title, entry.description, symbolCandidate, intervalCandidate);

      return {
        content: [
          {
            type: 'text',
            text: `找到 1 个匹配项:\n1. ${entry.title} — ${entry.description}\n\n调用 fetch 工具并传入 ID ${entry.id} 获取行情摘要。`,
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
    'Fetches detailed Binance data for the provided ID returned by search.',
    fetchToolSchema,
    async ({ id }) => {
      const entry = searchCache.get(id);
      const [symbolPart, intervalPart] = id.split('_');
      const symbol = sanitizeSymbol(entry?.symbol ?? symbolPart ?? '');
      const interval = entry?.interval ?? resolveInterval(intervalPart);

      if (!symbol) {
        return {
          content: [{ type: 'text', text: `无法解析 ID ${id}，请先通过 search 生成有效 ID。` }],
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
          `交易对: ${symbol}`,
          `周期: ${interval}`,
          `最新价格: ${ticker.lastPrice ?? '未知'}`,
          `24h 涨跌幅: ${ticker.priceChangePercent ?? '未知'} %`,
          `高/低: ${ticker.highPrice ?? '未知'} / ${ticker.lowPrice ?? '未知'}`,
          `成交量: ${ticker.volume ?? '未知'}`,
        ];

        if (!entry) {
          rememberResult(id, `${symbol} (${interval})`, '通过 search 发现的交易对。', symbol, interval);
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
          content: [{ type: 'text', text: `获取 Binance 行情失败: ${message}` }],
          isError: true,
        };
      }
    },
  );
}

export function registerTools(server: McpServer) {
  registerRollDiceTool(server);
  registerBinanceKlinesTool(server);
  registerSearchTool(server);
  registerFetchTool(server);
}
