import 'server-only';
import { supabase } from './supabase';

export async function getValidAccessToken(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('whoop_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) throw new Error(`No WHOOP token found for user ${userId}`);

  const expiresAt = new Date(data.expires_at).getTime();

  if (expiresAt > Date.now() + 60_000) {
    return data.access_token;
  }

  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: data.refresh_token,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error(`WHOOP token refresh failed: ${await res.text()}`);

  const { access_token, refresh_token, expires_in } = await res.json();
  const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  await supabase
    .from('whoop_tokens')
    .update({ access_token, refresh_token, expires_at: newExpiresAt })
    .eq('user_id', userId);

  return access_token;
}
