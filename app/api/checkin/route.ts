import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_DIGESTION = ['bad', 'neutral', 'good'] as const;
const VALID_SYMPTOMS = ['Headache', 'Fatigue', 'Anxious', 'Brain fog', 'Poor sleep', 'Low libido', 'Nausea', 'Joint pain', 'Other'];

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function isInt1to10(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 10;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;
  if (!userId) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const date = request.nextUrl.searchParams.get('date') ?? today();

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    console.error(`[checkin] GET error user=${userId} date=${date}:`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log(`[checkin] GET user=${userId} date=${date} found=${data != null}`);
  return Response.json({ checkin: data ?? null });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;
  if (!userId) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const errors: string[] = [];
  const row: Record<string, unknown> = {
    user_id: userId,
    date: typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : today(),
  };

  for (const field of ['energy_1to10', 'mood_1to10', 'stress_1to10', 'cognitive_clarity_1to10'] as const) {
    if (body[field] !== undefined) {
      if (!isInt1to10(body[field])) {
        errors.push(`${field} must be an integer between 1 and 10`);
      } else {
        row[field] = body[field];
      }
    }
  }

  if (body.digestion !== undefined) {
    if (!VALID_DIGESTION.includes(body.digestion as typeof VALID_DIGESTION[number])) {
      errors.push(`digestion must be one of: ${VALID_DIGESTION.join(', ')}`);
    } else {
      row.digestion = body.digestion;
    }
  }

  if (body.symptoms !== undefined) {
    if (!Array.isArray(body.symptoms) || body.symptoms.some(s => typeof s !== 'string')) {
      errors.push('symptoms must be an array of strings');
    } else {
      row.symptoms = (body.symptoms as string[]).filter(s => VALID_SYMPTOMS.includes(s));
    }
  }

  if (body.notable_events !== undefined) {
    if (typeof body.notable_events !== 'string') {
      errors.push('notable_events must be a string');
    } else if (body.notable_events.length > 500) {
      errors.push('notable_events must be under 500 characters');
    } else {
      row.notable_events = body.notable_events;
    }
  }

  if (errors.length) return Response.json({ error: errors.join('; ') }, { status: 400 });

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(row, { onConflict: 'user_id,date' })
    .select('*')
    .single();

  if (error) {
    console.error(`[checkin] POST upsert error user=${userId}:`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const { count } = await supabase
    .from('daily_checkins')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log(`[checkin] user=${userId} date=${row.date}`);

  return Response.json({ success: true, checkin: data, total_checkins: count ?? 1 });
}
