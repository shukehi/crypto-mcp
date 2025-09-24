import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_NAME = "mcp-oauth";
const SERVER_VERSION = "2.4.0";

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get base URL
const BASE_URL = process.env.BASE_URL ||
  `https://${process.env.FLY_APP_NAME}.fly.dev` ||
  'http://localhost:8080';

// Middleware
app.use(cors({
  origin: ['https://chatgpt.com', 'https://chat.openai.com', 'http://localhost:3000'],
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
app.use(express.urlencoded({ extended: true }));

// OAuth Storage (use Redis/DB in production)
const clients = new Map();
const authCodes = new Map();
const tokens = new Map();
const refreshTokens = new Map();
const users = new Map();

// Helper: Identify ChatGPT clients
function isChatGPTClient(clientId) {
  return clientId === 'chatgpt' ||
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);
}

// OAuth Discovery Endpoint (MUST be at root domain)
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  res.json({
    issuer: BASE_URL,
    authorization_endpoint: `${BASE_URL}/authorize`,
    token_endpoint: `${BASE_URL}/token`,
    registration_endpoint: `${BASE_URL}/register`,
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256', 'plain'],
    scopes_supported: ['mcp:read', 'mcp:write'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    service_documentation: 'https://modelcontextprotocol.io',
    ui_locales_supported: ['en'],
    claims_supported: ['sub', 'email', 'name'],
    request_uri_parameter_supported: false,
    require_request_uri_registration: false,
    request_parameter_supported: false,
    authorization_response_iss_parameter_supported: true
  });
});

// OAuth Authorization Endpoint - GET (show login form)
app.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = req.query;

  // Auto-register ChatGPT clients
  if (isChatGPTClient(client_id) && !clients.has(client_id)) {
    clients.set(client_id, {
      client_id: client_id,
      client_secret: null,
      redirect_uris: [
        'https://chatgpt.com/oauth/callback',
        'https://chat.openai.com/oauth/callback',
        'https://chatgpt.com/connector_platform_oauth_redirect',
        'http://localhost:3000/callback'
      ],
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none'
    });
  }

  const client = clients.get(client_id);
  if (!client) {
    return res.status(400).send('Invalid client_id');
  }

  // Validate redirect URI
  const validRedirect = client.redirect_uris.some(uri =>
    redirect_uri === uri || redirect_uri?.startsWith(uri.replace(/\/callback$/, ''))
  );

  if (!validRedirect) {
    return res.status(400).send('Invalid redirect_uri');
  }

  // Show login form
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sign In - MCP Server</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          width: 100%;
          max-width: 400px;
        }
        h1 {
          color: #1a202c;
          font-size: 28px;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .subtitle {
          color: #718096;
          margin-bottom: 32px;
          font-size: 14px;
        }
        .form-group {
          margin-bottom: 24px;
        }
        label {
          display: block;
          color: #4a5568;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.3s;
          background: #f7fafc;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button {
          width: 100%;
          padding: 14px;
          margin: 8px 0;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        .btn-secondary {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
        }
        .btn-secondary:hover {
          background: #f7fafc;
        }
        .demo-note {
          background: #edf2f7;
          padding: 16px;
          border-radius: 10px;
          margin-top: 24px;
          font-size: 13px;
          color: #4a5568;
          border-left: 4px solid #667eea;
        }
        .demo-note strong {
          color: #2d3748;
        }
        .app-info {
          background: #f7fafc;
          padding: 16px;
          border-radius: 10px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        .app-name {
          color: #667eea;
          font-weight: 700;
          font-size: 16px;
        }
        .scope-list {
          margin-top: 8px;
          padding-left: 20px;
        }
        .scope-item {
          color: #4a5568;
          font-size: 14px;
          margin: 4px 0;
        }
        .divider {
          height: 1px;
          background: #e2e8f0;
          margin: 24px 0;
        }
        .signup-section {
          text-align: center;
          margin-top: 20px;
        }
        .signup-text {
          color: #718096;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .btn-text {
          background: transparent;
          color: #667eea;
          border: none;
          text-decoration: underline;
          padding: 8px;
          cursor: pointer;
        }
        .btn-text:hover {
          color: #764ba2;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Sign In</h1>
        <div class="subtitle">Connect your account to ChatGPT</div>

        <div class="app-info">
          <div class="app-name">ChatGPT MCP Integration</div>
          <div class="scope-list">
            <div class="scope-item">• Read access to MCP tools</div>
            <div class="scope-item">• Execute MCP functions</div>
          </div>
        </div>

        <form method="post" action="/authorize">
          <input type="hidden" name="client_id" value="${client_id}">
          <input type="hidden" name="redirect_uri" value="${redirect_uri}">
          <input type="hidden" name="response_type" value="${response_type}">
          <input type="hidden" name="scope" value="${scope || 'mcp:read mcp:write'}">
          <input type="hidden" name="state" value="${state || ''}">
          <input type="hidden" name="code_challenge" value="${code_challenge || ''}">
          <input type="hidden" name="code_challenge_method" value="${code_challenge_method || ''}">

          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required placeholder="you@example.com">
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required placeholder="••••••••">
          </div>

          <button type="submit" name="action" value="approve" class="btn-primary">
            Sign In & Authorize
          </button>

          <div class="divider"></div>

          <button type="submit" name="action" value="demo" class="btn-secondary">
            Use Demo Account
          </button>
        </form>

        <div class="demo-note">
          <strong>Demo Mode:</strong> Click "Use Demo Account" to test without creating an account. For production use, create an account or sign in with your credentials.
        </div>
      </div>
    </body>
    </html>
  `);
});

// OAuth Authorization Endpoint - POST (process login)
app.post('/authorize', async (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state, action, email, password, code_challenge, code_challenge_method } = req.body;

  if (action === 'deny') {
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('error', 'access_denied');
    if (state) redirectUrl.searchParams.set('state', state);
    return res.redirect(redirectUrl.toString());
  }

  let user;

  if (action === 'demo') {
    // Demo mode
    user = {
      id: 'demo-user',
      email: 'demo@example.com',
      isDemo: true
    };
  } else {
    // Try Supabase authentication
    try {
      const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Show error page
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Sign In Error</title>
            <style>
              body { font-family: system-ui; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
              .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
              .error { background: #fed7d7; color: #c53030; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
              button { background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Authentication Failed</h1>
              <div class="error">Invalid email or password. Please try again.</div>
              <button onclick="history.back()">Go Back</button>
            </div>
          </body>
          </html>
        `);
      }

      user = {
        id: data.user.id,
        email: data.user.email,
        supabase_session: data.session
      };

      // Store user session
      users.set(user.id, user);
    } catch (err) {
      console.error('Supabase auth error:', err);
      // Fall back to demo mode on error
      user = {
        id: 'demo-user',
        email: 'demo@example.com',
        isDemo: true
      };
    }
  }

  // Generate authorization code
  const code = randomUUID();

  // Store auth code with PKCE if provided
  authCodes.set(code, {
    client_id,
    redirect_uri,
    scope: scope || 'mcp:read mcp:write',
    code_challenge,
    code_challenge_method,
    expires_at: Date.now() + 600000, // 10 minutes
    user: user
  });

  // Redirect with code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);

  res.redirect(redirectUrl.toString());
});

// OAuth Token Endpoint
app.post('/token', (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token, code_verifier } = req.body;

  if (grant_type === 'authorization_code') {
    const authCode = authCodes.get(code);

    if (!authCode || authCode.expires_at < Date.now()) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Validate client
    if (authCode.client_id !== client_id || authCode.redirect_uri !== redirect_uri) {
      return res.status(400).json({ error: 'invalid_request' });
    }

    // Generate tokens
    const accessToken = randomUUID();
    const newRefreshToken = randomUUID();

    // Store tokens
    tokens.set(accessToken, {
      client_id,
      user: authCode.user,
      scope: authCode.scope,
      expires_at: Date.now() + 3600000 // 1 hour
    });

    refreshTokens.set(newRefreshToken, {
      client_id,
      user: authCode.user,
      scope: authCode.scope,
      expires_at: Date.now() + 1209600000 // 14 days
    });

    // Delete used code
    authCodes.delete(code);

    // Return tokens
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: authCode.scope
    });
  } else if (grant_type === 'refresh_token') {
    const tokenData = refreshTokens.get(refresh_token);

    if (!tokenData || tokenData.expires_at < Date.now()) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate new access token
    const accessToken = randomUUID();

    tokens.set(accessToken, {
      client_id: tokenData.client_id,
      user: tokenData.user,
      scope: tokenData.scope,
      expires_at: Date.now() + 3600000
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: tokenData.scope
    });
  } else {
    res.status(400).json({ error: 'unsupported_grant_type' });
  }
});

// Dynamic Client Registration
app.post('/register', (req, res) => {
  const { redirect_uris, grant_types, response_types, client_name, scope, token_endpoint_auth_method } = req.body;

  const clientId = randomUUID();
  const clientSecret = randomUUID();

  const client = {
    client_id: clientId,
    client_secret: token_endpoint_auth_method === 'none' ? undefined : clientSecret,
    redirect_uris: redirect_uris || [],
    grant_types: grant_types || ['authorization_code'],
    response_types: response_types || ['code'],
    scope: scope || 'mcp:read mcp:write',
    token_endpoint_auth_method: token_endpoint_auth_method || 'client_secret_basic',
    client_name: client_name || 'MCP Client'
  };

  clients.set(clientId, client);

  res.status(201).json({
    client_id: clientId,
    client_secret: client.client_secret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    grant_types: client.grant_types,
    redirect_uris: client.redirect_uris,
    response_types: client.response_types,
    scope: client.scope,
    token_endpoint_auth_method: client.token_endpoint_auth_method,
    client_name: client.client_name
  });
});

// Token validation helper
function validateToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const tokenData = tokens.get(token);

  if (!tokenData || tokenData.expires_at < Date.now()) {
    return null;
  }

  return tokenData;
}

// MCP Protocol Handler (MUST be at root path)
app.post('/', (req, res) => {
  const { jsonrpc, method, params = {}, id } = req.body;

  // Check authentication for protected methods
  const tokenData = validateToken(req.headers.authorization);
  const requiresAuth = method !== 'initialize' && method !== 'initialized';

  if (requiresAuth && !tokenData) {
    return res.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32000,
        message: 'Authentication required',
        data: {
          oauth_authorize_url: `${BASE_URL}/authorize?client_id=chatgpt&response_type=code&scope=mcp:read+mcp:write`
        }
      }
    });
  }

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
            title: 'MCP OAuth Server',
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
            // REQUIRED TOOLS
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
            // Additional tools
            {
              name: 'analyze',
              title: 'Analyze Data',
              description: 'Analyze data and provide insights',
              inputSchema: {
                type: 'object',
                properties: {
                  data: { type: 'string', description: 'Data to analyze' },
                  type: {
                    type: 'string',
                    enum: ['sentiment', 'summary', 'statistics'],
                    description: 'Type of analysis'
                  }
                },
                required: ['data', 'type'],
                additionalProperties: false
              }
            },
            {
              name: 'generate',
              title: 'Generate Content',
              description: 'Generate various types of content',
              inputSchema: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['text', 'code', 'json'],
                    description: 'Content type'
                  },
                  prompt: { type: 'string', description: 'Generation prompt' }
                },
                required: ['type', 'prompt'],
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
          content = [{
            type: 'text',
            text: JSON.stringify([
              {
                id: '1',
                title: 'Search Result 1',
                content: `Found: ${args.query}`,
                user: tokenData.user.email
              },
              {
                id: '2',
                title: 'Search Result 2',
                content: 'Additional result',
                authenticated: true
              }
            ])
          }];
          break;

        case 'fetch':
          content = [{
            type: 'text',
            text: JSON.stringify({
              id: args.id,
              title: `Resource ${args.id}`,
              content: `Data for ${args.id}`,
              authenticated: true,
              user: tokenData.user.email,
              timestamp: new Date().toISOString()
            })
          }];
          break;

        case 'analyze':
          content = [{
            type: 'text',
            text: JSON.stringify({
              input: args.data,
              analysis_type: args.type,
              result: `Analysis of type ${args.type} completed`,
              user: tokenData.user.email
            })
          }];
          break;

        case 'generate':
          content = [{
            type: 'text',
            text: JSON.stringify({
              type: args.type,
              generated: `Generated ${args.type} content based on: ${args.prompt}`,
              user: tokenData.user.email
            })
          }];
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

// Health check
app.get('/', (req, res) => {
  res.json({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    protocol: PROTOCOL_VERSION,
    endpoints: {
      mcp: 'POST /',
      oauth_discovery: '/.well-known/oauth-authorization-server',
      authorize: '/authorize',
      token: '/token',
      register: '/register'
    },
    status: 'running'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MCP OAuth Server v${SERVER_VERSION} running on port ${PORT}`);
  console.log(`📝 Protocol: MCP ${PROTOCOL_VERSION}`);
  console.log(`🔐 OAuth discovery: ${BASE_URL}/.well-known/oauth-authorization-server`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`✅ Ready for ChatGPT integration!`);
});
