import 'server-only';
import { supabase } from './supabase';
import { getValidAccessToken } from './whoop-auth';

const WHOOP = 'https://api.prod.whoop.com/developer/v2';

async function fetchAllPages(path: string, token: string, start: string, end: string): Promise<unknown[]> {
  const records: unknown[] = [];
  let nextToken: string | null = null;

  do {
    const url = new URL(`${WHOOP}${path}`);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('limit', '25');
    if (nextToken) url.searchParams.set('nextToken', nextToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[sync] ${path} fetch failed: ${res.status} ${await res.text()}`);
      break;
    }

    const data = await res.json();
    records.push(...(data.records ?? []));
    nextToken = data.next_token ?? null;
  } while (nextToken);

  return records;
}

export async function backfillWhoopData(userId: string): Promise<void> {
  const token = await getValidAccessToken(userId);
  const end = new Date().toISOString();
  const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Sleep
  try {
    const records = await fetchAllPages('/activity/sleep', token, start, end);
    const rows = records.map((r: any) => ({
      user_id: userId,
      whoop_id: String(r.id),
      start_time: r.start,
      end_time: r.end,
      duration_minutes: r.end
        ? Math.round((new Date(r.end).getTime() - new Date(r.start).getTime()) / 60_000)
        : null,
      time_in_bed_minutes: r.score?.stage_summary?.total_in_bed_time_milli != null
        ? Math.round(r.score.stage_summary.total_in_bed_time_milli / 60_000) : null,
      rem_minutes: r.score?.stage_summary?.total_rem_sleep_time_milli != null
        ? Math.round(r.score.stage_summary.total_rem_sleep_time_milli / 60_000) : null,
      deep_minutes: r.score?.stage_summary?.total_slow_wave_sleep_time_milli != null
        ? Math.round(r.score.stage_summary.total_slow_wave_sleep_time_milli / 60_000) : null,
      light_minutes: r.score?.stage_summary?.total_light_sleep_time_milli != null
        ? Math.round(r.score.stage_summary.total_light_sleep_time_milli / 60_000) : null,
      awake_minutes: r.score?.stage_summary?.total_awake_time_milli != null
        ? Math.round(r.score.stage_summary.total_awake_time_milli / 60_000) : null,
      efficiency_pct: r.score?.sleep_efficiency_percentage ?? null,
      sleep_performance_pct: r.score?.sleep_performance_percentage ?? null,
      respiratory_rate: r.score?.respiratory_rate ?? null,
      raw_payload: r,
    }));
    if (rows.length > 0) {
      await supabase.from('sleep').upsert(rows, { onConflict: 'whoop_id' });
    }
    console.log(`[sync] sleep: pulled ${records.length} records, upserted ${rows.length}`);
  } catch (e) {
    console.error('[sync] sleep error:', e);
  }

  // Recovery
  try {
    const records = await fetchAllPages('/recovery', token, start, end);
    const rows = records.map((r: any) => ({
      user_id: userId,
      whoop_id: String(r.cycle_id),
      cycle_id: r.cycle_id != null ? String(r.cycle_id) : null,
      recovery_date: r.created_at ? r.created_at.split('T')[0] : null,
      recovery_score: r.score?.recovery_score != null ? Math.round(r.score.recovery_score) : null,
      hrv_ms: r.score?.hrv_rmssd_milli ?? null,
      rhr_bpm: r.score?.resting_heart_rate != null ? Math.round(r.score.resting_heart_rate) : null,
      spo2_pct: r.score?.spo2_percentage ?? null,
      skin_temp_celsius: r.score?.skin_temp_celsius ?? null,
      raw_payload: r,
    }));
    if (rows.length > 0) {
      await supabase.from('recovery').upsert(rows, { onConflict: 'whoop_id' });
    }
    console.log(`[sync] recovery: pulled ${records.length} records, upserted ${rows.length}`);
  } catch (e) {
    console.error('[sync] recovery error:', e);
  }

  // Workouts
  try {
    const records = await fetchAllPages('/activity/workout', token, start, end);
    const rows = records.map((r: any) => ({
      user_id: userId,
      whoop_id: String(r.id),
      sport_id: r.sport_id ?? null,
      sport_name: null,
      start_time: r.start,
      end_time: r.end ?? null,
      duration_minutes: r.end
        ? Math.round((new Date(r.end).getTime() - new Date(r.start).getTime()) / 60_000)
        : null,
      strain: r.score?.strain ?? null,
      avg_hr: r.score?.average_heart_rate != null ? Math.round(r.score.average_heart_rate) : null,
      max_hr: r.score?.max_heart_rate != null ? Math.round(r.score.max_heart_rate) : null,
      calories: r.score?.kilojoule != null ? Math.round(r.score.kilojoule * 0.239) : null,
      distance_meters: r.score?.distance_meter ?? null,
      raw_payload: r,
    }));
    if (rows.length > 0) {
      await supabase.from('workouts').upsert(rows, { onConflict: 'whoop_id' });
    }
    console.log(`[sync] workouts: pulled ${records.length} records, upserted ${rows.length}`);
  } catch (e) {
    console.error('[sync] workouts error:', e);
  }

  // Cycles
  try {
    const records = await fetchAllPages('/cycle', token, start, end);
    const rows = records.map((r: any) => ({
      user_id: userId,
      whoop_id: String(r.id),
      start_time: r.start,
      end_time: r.end ?? null,
      day_strain: r.score?.strain ?? null,
      avg_hr: r.score?.average_heart_rate != null ? Math.round(r.score.average_heart_rate) : null,
      max_hr: r.score?.max_heart_rate != null ? Math.round(r.score.max_heart_rate) : null,
      kilojoules: r.score?.kilojoule ?? null,
      raw_payload: r,
    }));
    if (rows.length > 0) {
      await supabase.from('cycles').upsert(rows, { onConflict: 'whoop_id' });
    }
    console.log(`[sync] cycles: pulled ${records.length} records, upserted ${rows.length}`);
  } catch (e) {
    console.error('[sync] cycles error:', e);
  }
}
