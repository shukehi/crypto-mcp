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
      version: '1.2.1',
    },
    capabilities: {
      tools: chatgptCompatible
        ? {
            search: {
              description: 'Search crypto symbols',
            },
            fetch: {
              description: 'Fetch ticker data',
            },
          }
        : {
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
            get_binance_perp_klines: {
              description: 'Fetches Binance USDⓈ-M perpetual candlestick data',
            },
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
      logging: {},
    },
  },
  {
    basePath: '/api',
    verboseLogs: process.env.NODE_ENV !== 'production',
    disableSse: false, // Enable SSE for better ChatGPT compatibility
  },
);

const validateAuth = (req: Request): boolean => {
  // Temporarily disable auth for ChatGPT compatibility
  // ChatGPT doesn't support OAuth flow for MCP connectors yet
  if (chatgptCompatible) {
    return true;
  }

  // Skip auth for development/testing
  if (process.env.VERCEL_ENV !== 'production') {
    return true;
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  global.accessTokens = global.accessTokens || new Map();
  const tokenData = global.accessTokens.get(token);

  if (!tokenData) {
    return false;
  }

  // Check if token is expired (1 hour)
  if (Date.now() - tokenData.timestamp > 60 * 60 * 1000) {
    global.accessTokens.delete(token);
    return false;
  }

  return true;
};

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
      version: '1.2.1',
      tools: ['search', 'fetch'],
      mcp: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization'
      }
    });
  }

  // MCP discovery endpoint - required for ChatGPT
  if (url.pathname.endsWith('/.well-known/mcp')) {
    return new Response(JSON.stringify({
      mcp_version: '2025-06-18',
      server_info: {
        name: 'crypto-mcp',
        version: '1.2.1'
      },
      capabilities: {
        tools: chatgptCompatible ? {
          search: { description: 'Search crypto symbols' },
          fetch: { description: 'Fetch ticker data' }
        } : {}
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // For direct access to /api/mcp, return server info
  return new Response(JSON.stringify({
    message: 'MCP Server Ready',
    name: 'crypto-mcp',
    version: '1.2.1',
    mode: chatgptCompatible ? 'ChatGPT Compatible' : 'Full Mode',
    tools: chatgptCompatible ? ['search', 'fetch'] : ['roll_dice', 'get_binance_klines', 'search', 'fetch', 'get_binance_perp_klines'],
    endpoints: {
      mcp: 'POST /api/mcp',
      health: 'GET /api/mcp?health',
      oauth: {
        authorize: '/api/oauth/authorize',
        token: '/api/oauth/token',
        discovery: '/.well-known/oauth-authorization-server'
      }
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
export const POST = async (req: Request) => {
  try {
    // Check authentication for ChatGPT compatible mode
    if (chatgptCompatible && !validateAuth(req)) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Unauthorized access'
        }
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return handler(await normalizeRequest(req));
  } catch (error) {
    // Enhanced error handling for better debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('MCP POST error:', error);

    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal server error',
        data: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
export const DELETE = async (req: Request) => handler(await normalizeRequest(req));

export const OPTIONS = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, User-Agent',
      'Access-Control-Max-Age': '86400'
    }
  });
};
