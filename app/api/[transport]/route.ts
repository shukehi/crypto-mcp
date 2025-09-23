import { createMcpHandler } from 'mcp-handler';
import { registerTools } from '@/src/mcp/tools/registerBinanceKlinesTool';

const handler = createMcpHandler(
  async (server) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: 'crypto-mcp',
      version: '1.0.0',
    },
    capabilities: {
      tools: {
        roll_dice: {
          description: 'Rolls an N-sided die',
        },
        get_binance_klines: {
          description: 'Fetches recent Binance spot market candlestick data',
        },
      },
    },
  },
  {
    basePath: '/api',
    verboseLogs: process.env.NODE_ENV !== 'production',
  },
);

export { handler as GET, handler as POST, handler as DELETE };
