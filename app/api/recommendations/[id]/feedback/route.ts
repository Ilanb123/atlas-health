import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_RESPONSES = ['helpful', 'not_helpful', 'will_try', 'not_relevant'] as const;
type FeedbackResponse = typeof VALID_RESPONSES[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;
  if (!userId) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json({ error: 'Invalid recommendation id' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const response = body.response as string;
  if (!VALID_RESPONSES.includes(response as FeedbackResponse)) {
    return Response.json(
      { error: `response must be one of: ${VALID_RESPONSES.join(', ')}` },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('recommendations')
    .update({ user_response: response, user_response_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('[feedback] update error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log(`[feedback] user=${userId} rec=${id} response=${response}`);
  return Response.json({ success: true });
}
