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

## Deployment Options (No Domain Required)

### 🚀 Option 1: Direct IP Access (Simplest)
```bash
# Run without reverse proxy
PORT=8080 AUTH_TOKEN=your-secret npm start

# Access via: http://YOUR_SERVER_IP:8080
# Test: curl http://YOUR_SERVER_IP:8080/healthz
```

### 🌐 Option 2: Tunnel Services (Recommended)
Get instant HTTPS domain without buying one:

#### Ngrok (Free tier available)
```bash
# Install ngrok, then:
./deploy/start-with-ngrok.sh
# Gets you: https://random-name.ngrok.io
```

#### Cloudflare Tunnel (Free & reliable)
```bash
# Install cloudflared, then:
cloudflared tunnel login
cloudflared tunnel create mcp-binance
# Edit deploy/cloudflare-tunnel.yml with your tunnel ID
cloudflared tunnel --config deploy/cloudflare-tunnel.yml run
```

### 🆓 Option 3: Free Domain Services
Get a real domain for free:

#### DuckDNS (Recommended)
1. Register at [duckdns.org](https://duckdns.org) → Get `yourname.duckdns.org`
2. Point domain to your server IP
3. Run setup script: `sudo ./deploy/setup-free-domain.sh`
4. Includes free SSL certificate via Let's Encrypt

#### Other free options:
- **No-IP**: yourname.ddns.net (dynamic DNS)
- **FreeDNS**: Various TLD options
- **EU.org**: Free EU domain (longer approval)

### 📊 Comparison Table

| Method | Cost | SSL | Stable | Setup |
|--------|------|-----|--------|-------|
| Direct IP | Free | ❌ | ✅ | 1 min |
| Ngrok | Free* | ✅ | ⚠️ | 2 min |
| Cloudflare | Free | ✅ | ✅ | 5 min |
| DuckDNS | Free | ✅ | ✅ | 10 min |

*Free tier has limitations

### 🛠️ Configuration Files

Different deployment scenarios:
- `deploy/nginx-http-only.conf` - Direct IP or behind load balancer
- `deploy/nginx-free-domain.conf` - Free domains with SSL
- `deploy/ngrok.yml` - Ngrok tunnel configuration
- `deploy/cloudflare-tunnel.yml` - Cloudflare tunnel setup

## 🧪 Local Domain Testing

Test your registered domain locally before deploying to a server:

### 🚀 One-Click Setup (Recommended)
```bash
# Interactive setup with menu
./deploy/setup-local-test.sh

# Choose:
# 1) HTTP mode (quick setup)
# 2) HTTPS mode (full experience with self-signed cert)
```

### 📋 Manual Setup

#### HTTP Testing
```bash
# 1. Add to hosts file
echo "127.0.0.1 shukehi.duckdns.org" | sudo tee -a /etc/hosts

# 2. Configure Nginx
sudo cp deploy/nginx-local-test.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-local-test.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. Start MCP server
npm run build && npm start

# 4. Test
curl http://shukehi.duckdns.org/healthz
curl http://shukehi.duckdns.org/tools
```

#### HTTPS Testing (Self-Signed Certificate)
```bash
# 1. Generate SSL certificate
./deploy/generate-local-ssl.sh

# 2. Install certificate
sudo ./ssl/install-commands.sh

# 3. Configure HTTPS Nginx
sudo cp deploy/nginx-local-https.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/nginx-local-https.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. Test HTTPS (accept security warning)
curl -k https://shukehi.duckdns.org/healthz
```

### 🧹 Cleanup
```bash
# Remove test setup
./deploy/setup-local-test.sh --cleanup
```

### ✅ Benefits of Local Testing

- **Validate domain configuration** before server deployment
- **Test MCP client connections** with real domain names
- **Debug SSL/TLS issues** in controlled environment
- **Verify authentication flows** with realistic URLs
- **Perfect for development** and integration testing

## Security
- Set `AUTH_TOKEN` in `.env` and configure your reverse proxy (Nginx) with TLS.
- Keep any exchange API keys **read-only** and in environment variables.

## Traditional Deployment (With Domain)

### Systemd unit (example)
See `deploy/mcp-binance.service`

### Nginx reverse proxy (example)
See `deploy/nginx.conf`
