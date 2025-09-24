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
app.post('/', (req, res) => {
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
