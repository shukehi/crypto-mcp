# Railway Deployment Guide

## Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/mcp-demo-server)

## Manual Deployment Steps

### 1. Prerequisites
- GitHub repository with your MCP server code
- Railway account (sign up at [railway.app](https://railway.app))

### 2. Deploy from GitHub

1. **Connect Railway to GitHub**
   - Visit [railway.app](https://railway.app) and sign in
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your MCP server repository

2. **Configure Deployment**
   - Railway will auto-detect the Node.js project
   - No additional configuration needed for standard version
   - The `railway.json` file provides optimized settings

### 3. Environment Variables (OAuth Version Only)

For the OAuth version (`server-oauth.js`), set these environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BASE_URL=https://your-app.railway.app
```

Set variables in Railway dashboard:
- Go to your project → Variables tab
- Add each variable with its value

### 4. Deploy Specific Version

- **Standard MCP Server**: Use default `npm start` (runs `server.js`)
- **OAuth MCP Server**: Change start command to `npm run start:oauth`

To change the start command:
1. Go to project → Settings → Deploy
2. Update "Start Command" to `npm run start:oauth`

### 5. Domain Configuration

Railway provides automatic domain:
- Format: `https://your-app.railway.app`
- Custom domains available in project settings

## Testing Your Deployment

1. **Health Check**
   ```bash
   curl https://your-app.railway.app
   ```

2. **MCP Protocol Test**
   ```bash
   curl -X POST https://your-app.railway.app \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

## Railway Features

- **Automatic deploys** from GitHub pushes
- **Built-in monitoring** and logs
- **Environment variables** management
- **Custom domains** support
- **Horizontal scaling** available
- **Database add-ons** (PostgreSQL, MySQL, Redis)

## Pricing

- **Starter Plan**: $5/month per service
- **Hobby Plan**: Pay per usage
- **Pro Plan**: Advanced features

Visit [railway.app/pricing](https://railway.app/pricing) for current rates.

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Community: [railway.app/discord](https://railway.app/discord)