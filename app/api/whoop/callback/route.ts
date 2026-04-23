import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get('whoop_state')?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response('Invalid OAuth state', { status: 400 });
  }

  const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
      redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new Response(`Token exchange failed: ${text}`, { status: 502 });
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json();
  const expires_at = Date.now() + expires_in * 1000;
  const base = 'HttpOnly; Secure; SameSite=Lax; Path=/';

  const headers = new Headers({ Location: '/dashboard' });
  headers.append('Set-Cookie', `whoop_access_token=${access_token}; ${base}; Max-Age=${expires_in}`);
  headers.append('Set-Cookie', `whoop_refresh_token=${refresh_token}; ${base}`);
  headers.append('Set-Cookie', `whoop_expires_at=${expires_at}; ${base}`);
  headers.append('Set-Cookie', `whoop_state=; ${base}; Max-Age=0`);

  return new Response(null, { status: 302, headers });
}
