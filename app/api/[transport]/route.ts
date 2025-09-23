import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';

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

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      { sides: z.number().int().min(2) },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return { content: [{ type: 'text', text: `You rolled a ${value}!` }] };
      },
    );

    server.tool(
      'get_binance_klines',
      '获取币安现货市场的最新 K 线数据',
      {
        symbol: z
          .string()
          .min(1, 'Symbol is required')
          .transform((value) => value.replace('/', '').toUpperCase()),
        interval: z.enum(binanceIntervals),
        limit: z.number().int().min(1).max(1000).optional(),
        startTime: z.number().int().nonnegative().optional(),
        endTime: z.number().int().nonnegative().optional(),
      },
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
            `https://api.binance.com/api/v3/klines?${params.toString()}`,
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

          return {
            content: [{ type: 'text', text: summaryLines.join('\n') }],
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
  },
  {},
  { basePath: '/api' },
);

export { handler as GET, handler as POST, handler as DELETE };
