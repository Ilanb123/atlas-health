import type { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  const state = crypto.randomUUID();

  const clientId = process.env.WHOOP_CLIENT_ID;
  const redirectUri = process.env.WHOOP_REDIRECT_URI;

  console.log('[whoop/authorize] client_id:', clientId);
  console.log('[whoop/authorize] redirect_uri:', redirectUri);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId!,
    redirect_uri: redirectUri!,
    scope: 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline',
    state,
  });

  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?${params}`;
  console.log('[whoop/authorize] redirecting to:', authUrl);

  const headers = new Headers({
    Location: authUrl,
    'Set-Cookie': `whoop_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  });

  return new Response(null, { status: 302, headers });
}
