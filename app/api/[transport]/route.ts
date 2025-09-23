import { createMcpHandler } from 'mcp-handler';
import { registerTools } from '@/src/mcp/tools';

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
        get_binance_perp_klines: {
          description: 'Fetches Binance USDⓈ-M perpetual candlestick data',
        },
        price_action_summary: {
          description: 'Summarizes price action structure and S/R levels.',
        },
        get_risk_policy: {
          description: 'Returns the current risk policy snapshot.',
        },
        set_risk_policy: {
          description: 'Updates the risk policy (partial updates allowed).',
        },
        draft_order: {
          description: 'Drafts an order and evaluates it against risk rules.',
        },
        request_confirmation: {
          description: 'Creates a confirmation ticket for manual approval.',
        },
        get_confirmation: {
          description: 'Retrieves a confirmation ticket by ID.',
        },
        list_confirmations: {
          description: 'Lists pending confirmation tickets.',
        },
        search: {
          description: 'Searches Binance symbols and returns IDs for fetch.',
        },
        fetch: {
          description: 'Fetches 24h ticker data for a Binance symbol ID.',
        },
      },
    },
  },
  {
    basePath: '/api',
    verboseLogs: process.env.NODE_ENV !== 'production',
    disableSse: true,
  },
);

const ensureAcceptHeader = (req: Request): Request => {
  const accept = req.headers.get('accept') ?? '';
  if (accept.includes('text/event-stream') && accept.includes('application/json')) {
    return req;
  }
  const headers = new Headers(req.headers);
  const values = new Set(
    accept
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  values.add('application/json');
  values.add('text/event-stream');
  headers.set('accept', Array.from(values).join(', '));
  return new Request(req, { headers });
};

export const GET = (req: Request) => handler(ensureAcceptHeader(req));
export const POST = (req: Request) => handler(ensureAcceptHeader(req));
export const DELETE = (req: Request) => handler(ensureAcceptHeader(req));
