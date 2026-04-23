import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;

  const result: Record<string, unknown> = {
    userId,
    supabaseUrl: process.env.SUPABASE_URL ? 'set' : 'MISSING',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
  };

  if (!userId) {
    return Response.json({ ...result, error: 'no atlas_user_id cookie' });
  }

  const [userRes, sleepRes, recoveryRes, workoutRes] = await Promise.all([
    supabase.from('users').select('email').eq('id', userId).single(),
    supabase.from('sleep')
      .select('sleep_performance_pct, time_in_bed_minutes, rem_minutes')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('recovery')
      .select('recovery_score, hrv_ms, rhr_bpm')
      .eq('user_id', userId)
      .order('recovery_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('workouts')
      .select('strain, avg_hr, max_hr')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return Response.json({
    ...result,
    user: userRes.data,
    userError: userRes.error,
    sleep: sleepRes.data,
    sleepError: sleepRes.error,
    recovery: recoveryRes.data,
    recoveryError: recoveryRes.error,
    workout: workoutRes.data,
    workoutError: workoutRes.error,
  });
}
