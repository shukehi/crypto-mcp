# MCP Binance (TypeScript)

A minimal Model Context Protocol (MCP) server exposing tools to fetch Binance data.
Tools:
- `get_ohlcv` (spot/futures)
- `get_mark_price`
- `get_funding_rate` (futures)
- `get_open_interest` (futures, simple endpoint)

## Quick start (VPS)
```bash
# 1) Install Node 20+, then:
npm i
cp .env.example .env
# edit .env (PORT, AUTH_TOKEN, TRANSPORT)

# 2) Dev run (HTTP transport by default):
npm run dev

# 3) Build & run
npm run build && npm start
```

### HTTP JSON-RPC endpoint
- POST `http://<host>:<port>/rpc`
- Headers: `Content-Type: application/json`, `Authorization: Bearer <AUTH_TOKEN>` (if set)
- Body:
  - `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
  - `{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_ohlcv","arguments":{...}}}`

### Register in ChatGPT (custom connector)
- Add a new MCP connector and point it to your HTTP endpoint (or run with TRANSPORT=stdio for local/desktop hosts).
- The model will call `tools/list` to discover the schema, then `tools/call` with arguments.

## Security
- Set `AUTH_TOKEN` in `.env` and configure your reverse proxy (Nginx) with TLS.
- Keep any exchange API keys **read-only** and in environment variables.

## Systemd unit (example)
See `deploy/mcp-binance.service`

## Nginx reverse proxy (example)
See `deploy/nginx.conf`
