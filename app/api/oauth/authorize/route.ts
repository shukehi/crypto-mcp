import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('client_id');
  const redirectUri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  const scope = url.searchParams.get('scope');

  // Validate required parameters
  if (!clientId || !redirectUri || !state) {
    return new Response(JSON.stringify({
      error: 'invalid_request',
      error_description: 'Missing required parameters'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // For ChatGPT MCP, we can auto-approve since this is a public service
  // In a real implementation, you'd show an authorization page
  const authCode = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Store the auth code temporarily (in a real app, use a database)
  const authData = {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope || 'read',
    timestamp: Date.now()
  };

  // In production, store this securely
  global.authCodes = global.authCodes || new Map();
  global.authCodes.set(authCode, authData);

  // Redirect back to ChatGPT with the authorization code
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', authCode);
  redirectUrl.searchParams.set('state', state);

  return Response.redirect(redirectUrl.toString(), 302);
}