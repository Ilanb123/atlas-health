import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard — Atlas Health' };

function minsToHm(mins: number | null | undefined) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function recoveryColor(score: number | null | undefined) {
  if (score == null) return '#888';
  if (score >= 67) return '#22c55e';
  if (score >= 34) return '#f59e0b';
  return '#ef4444';
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;

  if (!userId) {
    return (
      <main style={styles.page}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={styles.logo}>Atlas Health</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Connect your WHOOP to view your dashboard.
          </p>
          <a href="/api/whoop/authorize" style={styles.primaryBtn}>
            Connect WHOOP
          </a>
        </div>
      </main>
    );
  }

  const [userRes, sleepRes, recoveryRes, workoutRes] = await Promise.all([
    supabase.from('users').select('email').eq('id', userId).single(),
    supabase
      .from('sleep')
      .select('sleep_performance_pct, time_in_bed_minutes, rem_minutes, deep_minutes, efficiency_pct')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('recovery')
      .select('recovery_score, hrv_ms, rhr_bpm, spo2_pct')
      .eq('user_id', userId)
      .order('recovery_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('workouts')
      .select('strain, avg_hr, max_hr, calories, duration_minutes')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const email = userRes.data?.email;
  const sleep = sleepRes.data;
  const recovery = recoveryRes.data;
  const workout = workoutRes.data;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>Atlas Health</span>
        {email && (
          <span style={{ color: '#888', fontSize: '0.85rem' }}>{email}</span>
        )}
        <a href="/" style={{ color: '#aaa', fontSize: '0.85rem', textDecoration: 'none', marginLeft: 'auto' }}>
          ← Home
        </a>
      </header>

      <div style={styles.grid}>
        <Card title="Recovery">
          {recovery ? (
            <>
              <BigStat
                value={recovery.recovery_score != null ? String(Math.round(recovery.recovery_score)) : '—'}
                unit="/ 100"
                color={recoveryColor(recovery.recovery_score)}
              />
              <Stat label="HRV" value={recovery.hrv_ms != null ? `${Math.round(recovery.hrv_ms)} ms` : '—'} />
              <Stat label="Resting HR" value={recovery.rhr_bpm != null ? `${recovery.rhr_bpm} bpm` : '—'} />
              <Stat label="SpO₂" value={recovery.spo2_pct != null ? `${Number(recovery.spo2_pct).toFixed(1)}%` : '—'} />
            </>
          ) : (
            <Syncing />
          )}
        </Card>

        <Card title="Last Night's Sleep">
          {sleep ? (
            <>
              <BigStat
                value={sleep.sleep_performance_pct != null ? String(Math.round(Number(sleep.sleep_performance_pct))) : '—'}
                unit="%"
                color="#6366f1"
              />
              <Stat label="Time in Bed" value={minsToHm(sleep.time_in_bed_minutes)} />
              <Stat label="REM" value={minsToHm(sleep.rem_minutes)} />
              <Stat label="Deep (SWS)" value={minsToHm(sleep.deep_minutes)} />
              <Stat label="Efficiency" value={sleep.efficiency_pct != null ? `${Number(sleep.efficiency_pct).toFixed(1)}%` : '—'} />
            </>
          ) : (
            <Syncing />
          )}
        </Card>

        <Card title="Latest Workout">
          {workout ? (
            <>
              <BigStat
                value={workout.strain != null ? Number(workout.strain).toFixed(1) : '—'}
                unit="strain"
                color="#f97316"
              />
              <Stat label="Duration" value={minsToHm(workout.duration_minutes)} />
              <Stat label="Avg HR" value={workout.avg_hr != null ? `${workout.avg_hr} bpm` : '—'} />
              <Stat label="Max HR" value={workout.max_hr != null ? `${workout.max_hr} bpm` : '—'} />
              <Stat label="Calories" value={workout.calories != null ? `${workout.calories} kcal` : '—'} />
            </>
          ) : (
            <Syncing />
          )}
        </Card>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      {children}
    </div>
  );
}

function BigStat({ value, unit, color }: { value: string; unit: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
      <span style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, color }}>{value}</span>
      <span style={{ color: '#888', fontSize: '1rem' }}>{unit}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.stat}>
      <span style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{value}</span>
    </div>
  );
}

function Syncing() {
  return (
    <p style={{ color: '#aaa', fontSize: '0.9rem', fontStyle: 'italic' }}>
      Syncing… refresh in a moment
    </p>
  );
}

const styles = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
    background: '#f5f5f4',
    padding: '32px 24px 64px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '860px',
    margin: '0 auto 32px',
  } as React.CSSProperties,
  logo: {
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0d0d0d',
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    maxWidth: '860px',
    margin: '0 auto',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: '#999',
    marginBottom: '16px',
  } as React.CSSProperties,
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderTop: '1px solid #f0f0f0',
  } as React.CSSProperties,
  primaryBtn: {
    display: 'inline-block',
    background: '#111',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
  } as React.CSSProperties,
};
