import type { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_WHOOP_REDIRECT_URI!,
    scope: 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline',
    state,
  });

  const headers = new Headers({
    Location: `https://api.prod.whoop.com/oauth/oauth2/auth?${params}`,
    'Set-Cookie': `whoop_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
  });

  return new Response(null, { status: 302, headers });
}
