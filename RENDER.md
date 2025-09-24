# Render Deployment Guide

## Quick Deploy

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your-username/crypto-mcp)

## Manual Deployment Steps

### 1. Prerequisites
- GitHub repository with your MCP server code
- Render account (sign up at [render.com](https://render.com))

### 2. Deploy from GitHub

#### Option A: Manual Service Creation (Recommended)
This is the most reliable deployment method with explicit configuration.

1. **Connect Repository**
   - Fork this repository to your GitHub account
   - Visit [render.com](https://render.com) and sign in
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Standard MCP Server**
   Use these exact settings:
   ```
   Name: mcp-demo-server
   Runtime: Node
   Build Command: npm ci
   Start Command: npm start
   Node Version: 20.16.0 (in Advanced settings)
   ```

3. **Environment Variables** (if needed)
   ```
   NODE_ENV=production
   ```

4. **For OAuth MCP Server** (separate service)
   Create another Web Service with:
   ```
   Name: mcp-oauth-server
   Runtime: Node
   Build Command: npm ci
   Start Command: npm run start:oauth
   Node Version: 20.16.0 (in Advanced settings)
   ```

   **Required Environment Variables**:
   ```
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   BASE_URL=https://your-app.onrender.com
   ```

#### Option B: Using render.yaml Blueprint (Alternative)
If Option A doesn't work, try the Blueprint approach:

1. **Fork and Connect Repository**
   - Fork this repository to your GitHub account
   - Visit [render.com](https://render.com) and sign in
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` configuration

2. **Important Notes**:
   - Blueprint may have configuration conflicts
   - If deployment fails, use Option A (Manual) instead
   - Check logs for specific error messages

### 3. Environment Variables

#### Standard Version
No environment variables required.

#### OAuth Version
Set these environment variables in Render dashboard:

```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BASE_URL=https://your-app.onrender.com
```

To set variables:
1. Go to your service dashboard
2. Click "Environment" tab
3. Add each variable

### 4. Custom Domain (Optional)

1. **Add Custom Domain**
   - Go to service → "Settings" → "Custom Domains"
   - Add your domain (e.g., `mcp.yourdomain.com`)
   - Configure DNS CNAME to point to Render URL

### 5. Deploy OAuth Version

For OAuth server deployment:
1. Create a new service with start command: `npm run start:oauth`
2. Add all required environment variables
3. Deploy manually or enable auto-deploy

## Testing Your Deployment

1. **Health Check**
   ```bash
   curl https://your-app.onrender.com
   ```

2. **MCP Protocol Test**
   ```bash
   curl -X POST https://your-app.onrender.com \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
   ```

## Render Features

- **Free Plan Available** (with limitations)
- **Automatic HTTPS** certificates
- **Custom domains** support
- **Auto-deploy** from GitHub
- **Built-in monitoring** and logs
- **Horizontal scaling** (paid plans)
- **Database add-ons** (PostgreSQL, Redis)

## Important Notes

### Free Plan Limitations
- Service spins down after 15 minutes of inactivity
- 750 hours/month free compute time
- Service takes ~30 seconds to wake up (cold start)

### Recommended for Production
- Use **Starter plan** ($7/month) or higher
- Keeps service always running
- No cold starts
- Better performance

### Wake-Up Service (Free Plan)
To keep free services warm, you can:
1. Use external ping services (UptimeRobot, Pingdom)
2. Set up GitHub Actions to ping your endpoint
3. Upgrade to paid plan for always-on service

## Pricing

- **Free**: $0/month (with limitations)
- **Starter**: $7/month per service
- **Standard**: $25/month per service
- **Pro**: $85/month per service

Visit [render.com/pricing](https://render.com/pricing) for current rates.

## Troubleshooting

### Common Issues

#### 1. "pnpm: command not found" or "frozen-lockfile" errors
**Problem**: Render automatically uses pnpm commands instead of npm
**Solution**:
- Use Option A (Manual Service Creation) - this is now the recommended approach
- Ensure Build Command is set to: `npm ci` (no --only=production flag)
- Ensure Start Command is set to: `npm start`
- Set Node Version to: `20.16.0` in Advanced settings

#### 2. "Cannot find package 'express'" or module not found errors
**Problem**: Dependencies not properly installed during build
**Solution**:
- This usually happens when `--only=production` flag excludes required dependencies
- Use manual configuration (Option A) with `npm ci` (without --only=production)
- Ensure Node Version is set to `20.16.0`
- Check that package-lock.json exists in your repository

#### 3. "Missing script: build" error
**Problem**: Render expects a build script
**Solution**:
- Project now includes a dummy `build` script
- If still failing, use manual configuration (Option A)

#### 4. Cold starts on free plan
**Problem**: Service sleeps after 15 minutes
**Solution**:
- Upgrade to Starter plan ($7/month) for always-on service
- Use external ping services to keep warm
- Set up GitHub Actions ping workflow

#### 5. Deploy button doesn't work
**Problem**: Repository URL in deploy button is incorrect
**Solution**:
- Fork the repository to your GitHub account
- Use manual deployment (Option A)
- Update the deploy button URL to point to your fork

### Getting Help

If you're still experiencing issues:
1. Check Render's deploy logs for specific error messages
2. Verify all environment variables are set correctly
3. Test your app locally with `npm start`
4. Contact support with specific error details

## Support

- Render Documentation: [render.com/docs](https://render.com/docs)
- Render Community: [community.render.com](https://community.render.com)
- Support: [render.com/support](https://render.com/support)