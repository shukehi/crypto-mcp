import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "mcp-demo";
const SERVER_VERSION = "1.0.0";

// Middleware
app.use(cors({
  origin: ['https://chatgpt.com', 'https://chat.openai.com'],
  credentials: true,
  // Allow ChatGPT MCP browser clients to send their custom headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'MCP-Protocol-Version',
    'MCP-Client-ID',
    'MCP-Connection-ID',
    'MCP-Sequence-ID',
    'MCP-Session-ID',
    'MCP-Tenant-ID',
    'OpenAI-Beta'
  ],
  methods: ['GET', 'POST', 'OPTIONS']
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
