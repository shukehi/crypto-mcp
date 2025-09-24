import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "mcp-demo";
const SERVER_VERSION = "1.0.0";

// Middleware
const ALLOWED_ORIGINS = [
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://platform.openai.com'
];

const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'MCP-Protocol-Version',
  'MCP-Client-ID',
  'MCP-Connection-ID',
  'MCP-Sequence-ID',
  'MCP-Session-ID',
  'MCP-Tenant-ID',
  'OpenAI-Beta'
];

const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];

app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    return next();
  }

  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return res.sendStatus(403);
  }

  const requestHeaders = req.headers['access-control-request-headers'];

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', ALLOWED_METHODS.join(','));
  res.header(
    'Access-Control-Allow-Headers',
    requestHeaders || DEFAULT_ALLOWED_HEADERS.join(',')
  );
  res.header('Vary', 'Origin');
  res.sendStatus(204);
});

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  // Allow ChatGPT MCP browser clients to send their custom headers
  allowedHeaders: DEFAULT_ALLOWED_HEADERS,
  methods: ALLOWED_METHODS,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// MCP Protocol Handler
app.post('/', async (req, res) => {
  const { jsonrpc, method, params = {}, id } = req.body;

  switch (method) {
    case 'initialize':
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            logging: {},
            prompts: { listChanged: false },
            resources: { listChanged: false },
            tools: { listChanged: false }
          },
          serverInfo: {
            name: SERVER_NAME,
            title: 'MCP Demo Server',
            version: SERVER_VERSION
          }
        }
      });
      break;

    case 'initialized':
      res.status(200).end();
      break;

    case 'tools/list':
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'search',
              title: 'Search',
              description: 'Search for information',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search query' }
                },
                required: ['query'],
                additionalProperties: false
              }
            },
            {
              name: 'fetch',
              title: 'Fetch Data',
              description: 'Fetch data by ID',
              inputSchema: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Resource ID' }
                },
                required: ['id'],
                additionalProperties: false
              }
            },
            {
              name: 'calculate',
              title: 'Calculate',
              description: 'Perform calculations',
              inputSchema: {
                type: 'object',
                properties: {
                  expression: { type: 'string', description: 'Math expression' }
                },
                required: ['expression'],
                additionalProperties: false
              }
            },
            {
              name: 'binance_klines',
              title: 'Binance K-Line Data',
              description: 'Fetch candlestick data from Binance public API',
              inputSchema: {
                type: 'object',
                properties: {
                  symbol: {
                    type: 'string',
                    description: 'Trading pair symbol, e.g., BTCUSDT'
                  },
                  interval: {
                    type: 'string',
                    description: 'K-line interval per Binance spec',
                    default: '1h'
                  },
                  limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 1000,
                    description: 'Number of candles to return (max 1000)',
                    default: 100
                  }
                },
                required: ['symbol'],
                additionalProperties: false
              }
            }
          ]
        }
      });
      break;

    case 'tools/call':
      const { name, arguments: args = {} } = params;
      let content;

      switch (name) {
        case 'search':
          // Mock search results
          content = [{
            type: 'text',
            text: JSON.stringify([
              { id: '1', title: 'Result 1', content: `Found: ${args.query}` },
              { id: '2', title: 'Result 2', content: 'Additional result' }
            ])
          }];
          break;

        case 'fetch':
          // Mock fetch result
          content = [{
            type: 'text',
            text: JSON.stringify({
              id: args.id,
              title: `Resource ${args.id}`,
              content: `Data for ${args.id}`,
              timestamp: new Date().toISOString()
            })
          }];
          break;

        case 'calculate':
          // Simple calculator
          try {
            // WARNING: eval is dangerous! Use a proper math library in production
            const result = eval(args.expression.replace(/[^0-9+\-*/().\s]/g, ''));
            content = [{
              type: 'text',
              text: `${args.expression} = ${result}`
            }];
          } catch (error) {
            content = [{
              type: 'text',
              text: `Error: Invalid expression`
            }];
          }
          break;

        case 'binance_klines':
          {
            const symbol = String(args.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const interval = String(args.interval || '1h');
            const limit = Math.min(Math.max(parseInt(args.limit ?? 100, 10) || 100, 1), 1000);

            const allowedIntervals = new Set([
              '1m','3m','5m','15m','30m',
              '1h','2h','4h','6h','8h','12h',
              '1d','3d','1w','1M'
            ]);

            if (!symbol) {
              content = [{ type: 'text', text: 'Error: symbol is required' }];
              break;
            }

            if (!allowedIntervals.has(interval)) {
              content = [{ type: 'text', text: `Error: interval must be one of ${Array.from(allowedIntervals).join(', ')}` }];
              break;
            }

            try {
              const url = new URL('https://api.binance.com/api/v3/klines');
              url.searchParams.set('symbol', symbol);
              url.searchParams.set('interval', interval);
              url.searchParams.set('limit', String(limit));

              const response = await fetch(url, {
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'crypto-mcp-demo'
                }
              });

              if (!response.ok) {
                content = [{
                  type: 'text',
                  text: `Error: Binance API responded with ${response.status}`
                }];
                break;
              }

              const data = await response.json();
              content = [{
                type: 'text',
                text: JSON.stringify({
                  symbol,
                  interval,
                  limit,
                  candles: data.map(([openTime, open, high, low, close, volume, closeTime]) => ({
                    openTime,
                    open,
                    high,
                    low,
                    close,
                    volume,
                    closeTime
                  }))
                })
              }];
            } catch (error) {
              content = [{
                type: 'text',
                text: `Error: Failed to fetch Binance data (${error.message})`
              }];
            }
          }
          break;

        default:
          return res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Unknown tool: ${name}` }
          });
      }

      res.json({
        jsonrpc: '2.0',
        id,
        result: { content, isError: false }
      });
      break;

    case 'resources/list':
      res.json({
        jsonrpc: '2.0',
        id,
        result: { resources: [], nextCursor: null }
      });
      break;

    case 'prompts/list':
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          prompts: [
            {
              name: 'analyze_code',
              description: 'Analyze code quality',
              arguments: [
                {
                  name: 'code',
                  description: 'Code to analyze',
                  required: true
                }
              ]
            }
          ]
        }
      });
      break;

    default:
      res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' }
      });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocol: PROTOCOL_VERSION,
    status: 'running'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
});
