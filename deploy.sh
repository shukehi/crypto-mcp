#!/bin/bash

echo "🚀 Deploying MCP Server to Fly.io"

# Check if app exists
if ! flyctl status >/dev/null 2>&1; then
  echo "📝 Creating new Fly.io app..."
  flyctl launch --name crypto-mcp-server --region iad --yes
else
  echo "✅ App already exists"
fi

# Set secrets (if using Supabase for OAuth version)
echo "🔐 Setting environment variables..."
# Uncomment and set these if using OAuth version:
# flyctl secrets set \
#   SUPABASE_URL="https://your-project.supabase.co" \
#   SUPABASE_ANON_KEY="your-anon-key"

# Deploy
echo "🚢 Deploying application..."
flyctl deploy --ha=false

# Show status
echo "✨ Deployment complete!"
flyctl status
flyctl info

echo "🌐 Your MCP server is available at:"
flyctl info | grep "Hostname"

echo ""
echo "📝 OAuth Discovery URL (if using OAuth version):"
echo "https://$(flyctl info -j | jq -r .Hostname)/.well-known/oauth-authorization-server"