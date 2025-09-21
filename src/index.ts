import 'dotenv/config';
import { createServer } from 'http';
import { handleRpc, toolsList } from './mcp/server.js';
import { logger } from './core/logger.js';

const TRANSPORT = process.env.TRANSPORT || 'http';

if (TRANSPORT === 'stdio') {
  process.stdin.setEncoding('utf8');
  process.stdout.setDefaultEncoding('utf8');
  logger.info({ transport: 'stdio' }, 'MCP server starting (stdio)');
  process.stdin.on('data', async (chunk) => {
    for (const line of chunk.toString().trim().split('\n')) {
      if (!line) continue;
      try {
        const req = JSON.parse(line);
        logger.debug({ req }, 'Received request');
        const res = await handleRpc(req);
        logger.debug({ res }, 'Sending response');
        process.stdout.write(JSON.stringify(res) + '\n');
      } catch (e:any) {
        logger.error({ line, error: String(e?.message||e) }, 'Parse error');
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error', data: String(e?.message||e) }}) + '\n');
      }
    }
  });
} else {
  const PORT = Number(process.env.PORT || 8080);
  const HOST = process.env.HOST || '0.0.0.0';
  const AUTH = process.env.AUTH_TOKEN || '';

  const server = createServer(async (req, res) => {
    // Simple health check
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' }); res.end('ok'); return;
    }
    if (req.method === 'GET' && req.url === '/tools') {
      // Return tools list for quick inspection
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(await toolsList())); return;
    }
    if (req.method === 'POST' && req.url === '/rpc') {
      // Bearer token check (if configured)
      if (AUTH) {
        const auth = req.headers['authorization'] || '';
        if (!auth.startsWith('Bearer ') || auth.slice(7) !== AUTH) {
          res.writeHead(401, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'unauthorized' }));
          return;
        }
      }
      let body='';
      req.on('data', (c)=> body += c);
      req.on('end', async () => {
        try {
          const json = JSON.parse(body);
          const result = await handleRpc(json);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e:any) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc:'2.0', id: null, error: { code:-32700, message:'Parse error', data: String(e?.message||e)}}));
        }
      });
      return;
    }
    res.writeHead(404); res.end();
  });
  server.listen(PORT, HOST, () => logger.info({ HOST, PORT }, 'MCP server listening (http)'));
}
