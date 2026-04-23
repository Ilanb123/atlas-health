import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { askSleepAgent } from '@/lib/agents/sleep-agent';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;

  if (!userId) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let question: string;
  try {
    const body = await request.json();
    question = typeof body.question === 'string' ? body.question.trim() : '';
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!question) {
    return Response.json({ error: 'Question is required' }, { status: 400 });
  }

  if (question.length > 1000) {
    return Response.json({ error: 'Question too long (max 1000 characters)' }, { status: 400 });
  }

  try {
    const result = await askSleepAgent(userId, question);
    return Response.json(result);
  } catch (e) {
    console.error('[sleep-agent] error:', e);
    return Response.json({ error: 'Agent error — please try again' }, { status: 500 });
  }
}
