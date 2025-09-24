import { createMcpHandler } from 'mcp-handler';
import { registerTools } from '@/src/mcp/tools';

const enableAdvanced = process.env.ENABLE_ADVANCED_TOOLS === 'true';
const chatgptCompatible = process.env.CHATGPT_COMPATIBLE_MODE === 'true';

const handler = createMcpHandler(
  async (server) => {
    registerTools(server);
  },
  {
    serverInfo: {
      name: 'crypto-mcp',
      version: '1.2.0',
    },
    capabilities: {
      tools: {
        roll_dice: {
          description: 'Rolls dice',
        },
        get_binance_klines: {
          description: 'Get market data',
        },
        search: {
          description: 'Search crypto symbols',
        },
        fetch: {
          description: 'Fetch ticker data',
        },
        ...(!chatgptCompatible
          ? {
              get_binance_perp_klines: {
                description: 'Fetches Binance USDⓈ-M perpetual candlestick data',
              },
            }
          : {}),
        ...(enableAdvanced
          ? {
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
              schedule_task: {
                description: 'Schedule an analysis or alert task (demo).',
              },
              list_jobs: {
                description: 'List in-memory scheduled tasks.',
              },
              cancel_job: {
                description: 'Cancel a scheduled task by ID.',
              },
            }
          : {}),
      },
    },
  },
  {
    basePath: '/api',
    verboseLogs: process.env.NODE_ENV !== 'production',
    disableSse: true,
  },
);

const normalizeRequest = async (req: Request): Promise<Request> => {
  const accept = req.headers.get('accept') ?? '';
  const headers = new Headers(req.headers);
  if (!(accept.includes('text/event-stream') && accept.includes('application/json'))) {
    const values = new Set(
      accept
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
    values.add('application/json');
    values.add('text/event-stream');
    headers.set('accept', Array.from(values).join(', '));
  }

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return new Request(req.url, {
      method: req.method,
      headers,
    });
  }

  const bodyText = await req.text();
  return new Request(req.url, {
    method: req.method,
    headers,
    body: bodyText,
  });
};

export const GET = async (req: Request) => {
  const url = new URL(req.url);

  // Health check endpoint for ChatGPT compatibility
  if (url.searchParams.has('health') || req.headers.get('user-agent')?.includes('ChatGPT')) {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'crypto-mcp',
      version: '1.2.0',
      tools: ['search', 'fetch', 'get_binance_klines', 'roll_dice'],
      mcp: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  // Default MCP handler
  return handler(await normalizeRequest(req));
};
export const POST = async (req: Request) => handler(await normalizeRequest(req));
export const DELETE = async (req: Request) => handler(await normalizeRequest(req));
