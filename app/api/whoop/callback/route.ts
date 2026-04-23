import { after } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { backfillWhoopData } from '@/lib/whoop-sync';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const storedState = request.cookies.get('whoop_state')?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response('Invalid OAuth state', { status: 400 });
  }

  // Exchange code for tokens
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

  // Fetch WHOOP user profile
  const profileRes = await fetch('https://api.prod.whoop.com/developer/v2/user/profile/basic', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!profileRes.ok) {
    return new Response('Failed to fetch WHOOP profile', { status: 502 });
  }

  const profile = await profileRes.json();

  // Upsert user
  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert(
      { email: profile.email, whoop_user_id: profile.user_id },
      { onConflict: 'email' }
    )
    .select('id')
    .single();

  if (userError || !user) {
    console.error('[callback] user upsert failed:', userError);
    return new Response('Failed to create user', { status: 500 });
  }

  // Upsert tokens
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
  const { error: tokenError } = await supabase
    .from('whoop_tokens')
    .upsert(
      { user_id: user.id, access_token, refresh_token, expires_at: expiresAt },
      { onConflict: 'user_id' }
    );

  if (tokenError) {
    console.error('[callback] token upsert failed:', tokenError);
    return new Response('Failed to store tokens', { status: 500 });
  }

  // Schedule backfill to run after the redirect response is sent.
  // after() is guaranteed to complete on Vercel; void pattern gets killed immediately.
  after(async () => {
    try {
      await backfillWhoopData(user.id);
    } catch (e) {
      console.error('[backfill]', e);
    }
  });

  const THIRTY_DAYS = 30 * 24 * 60 * 60;
  const SEC = 'HttpOnly; Secure; SameSite=Lax; Path=/';
  const CLEAR = `${SEC}; Max-Age=0`;

  const headers = new Headers({ Location: '/dashboard' });
  headers.append('Set-Cookie', `atlas_user_id=${user.id}; ${SEC}; Max-Age=${THIRTY_DAYS}`);
  // Clear old token cookies
  headers.append('Set-Cookie', `whoop_access_token=; ${CLEAR}`);
  headers.append('Set-Cookie', `whoop_refresh_token=; ${CLEAR}`);
  headers.append('Set-Cookie', `whoop_expires_at=; ${CLEAR}`);
  headers.append('Set-Cookie', `whoop_state=; ${CLEAR}`);

  return new Response(null, { status: 302, headers });
}
