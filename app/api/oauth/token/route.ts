import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const grantType = formData.get('grant_type');
    const code = formData.get('code');
    const clientId = formData.get('client_id');
    const redirectUri = formData.get('redirect_uri');

    if (grantType !== 'authorization_code') {
      return new Response(JSON.stringify({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!code || !clientId) {
      return new Response(JSON.stringify({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the authorization code
    global.authCodes = global.authCodes || new Map();
    const authData = global.authCodes.get(code);

    if (!authData || authData.client_id !== clientId) {
      return new Response(JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if code is expired (5 minutes)
    if (Date.now() - authData.timestamp > 5 * 60 * 1000) {
      global.authCodes.delete(code);
      return new Response(JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate access token
    const accessToken = `mcp_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Store the access token
    global.accessTokens = global.accessTokens || new Map();
    global.accessTokens.set(accessToken, {
      client_id: clientId,
      scope: authData.scope,
      timestamp: Date.now()
    });

    // Clean up the authorization code
    global.authCodes.delete(code);

    return new Response(JSON.stringify({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      scope: authData.scope
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'server_error',
      error_description: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}