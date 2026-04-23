import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard — Atlas Health' };

const WHOOP = 'https://api.prod.whoop.com/developer/v2';

async function whoopFetch(path: string, token: string) {
  const res = await fetch(`${WHOOP}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

function ms(millis: number) {
  const h = Math.floor(millis / 3_600_000);
  const m = Math.floor((millis % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function recoveryColor(score: number) {
  if (score >= 67) return '#22c55e';
  if (score >= 34) return '#f59e0b';
  return '#ef4444';
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('whoop_access_token')?.value;

  if (!token) {
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

  const [profile, sleepData, recoveryData, workoutData] = await Promise.all([
    whoopFetch('/user/profile/basic', token),
    whoopFetch('/activity/sleep?limit=1', token),
    whoopFetch('/recovery?limit=1', token),
    whoopFetch('/activity/workout?limit=1', token),
  ]);

  const sleep = sleepData?.records?.[0];
  const recovery = recoveryData?.records?.[0];
  const workout = workoutData?.records?.[0];

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <span style={styles.logo}>Atlas Health</span>
          {profile && (
            <span style={{ color: '#888', fontSize: '0.9rem', marginLeft: '12px' }}>
              {profile.first_name} {profile.last_name}
            </span>
          )}
        </div>
        <a href="/" style={{ color: '#aaa', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← Home
        </a>
      </header>

      <div style={styles.grid}>
        {/* Recovery */}
        <Card title="Recovery">
          {recovery?.score ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    color: recoveryColor(recovery.score.recovery_score),
                  }}
                >
                  {Math.round(recovery.score.recovery_score)}
                </span>
                <span style={{ color: '#888', fontSize: '1rem' }}>/ 100</span>
              </div>
              <Stat label="HRV" value={`${Math.round(recovery.score.hrv_rmssd_milli)} ms`} />
              <Stat label="Resting HR" value={`${Math.round(recovery.score.resting_heart_rate)} bpm`} />
              {recovery.score.spo2_percentage && (
                <Stat label="SpO₂" value={`${recovery.score.spo2_percentage.toFixed(1)}%`} />
              )}
            </>
          ) : (
            <Empty />
          )}
        </Card>

        {/* Sleep */}
        <Card title="Last Night's Sleep">
          {sleep?.score ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, color: '#6366f1' }}>
                  {Math.round(sleep.score.sleep_performance_percentage)}
                </span>
                <span style={{ color: '#888', fontSize: '1rem' }}>%</span>
              </div>
              <Stat
                label="Time in Bed"
                value={ms(sleep.score.stage_summary.total_in_bed_time_milli)}
              />
              <Stat
                label="REM"
                value={ms(sleep.score.stage_summary.total_rem_sleep_time_milli)}
              />
              <Stat
                label="Deep (SWS)"
                value={ms(sleep.score.stage_summary.total_slow_wave_sleep_time_milli)}
              />
              <Stat
                label="Efficiency"
                value={`${sleep.score.sleep_efficiency_percentage.toFixed(1)}%`}
              />
            </>
          ) : (
            <Empty />
          )}
        </Card>

        {/* Workout */}
        <Card title="Latest Workout">
          {workout?.score ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '16px' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, color: '#f97316' }}>
                  {workout.score.strain.toFixed(1)}
                </span>
                <span style={{ color: '#888', fontSize: '1rem' }}>strain</span>
              </div>
              <Stat label="Avg HR" value={`${Math.round(workout.score.average_heart_rate)} bpm`} />
              <Stat label="Max HR" value={`${Math.round(workout.score.max_heart_rate)} bpm`} />
              <Stat
                label="Calories"
                value={`${Math.round(workout.score.kilojoule * 0.239)} kcal`}
              />
              {workout.start && workout.end && (
                <Stat
                  label="Duration"
                  value={ms(new Date(workout.end).getTime() - new Date(workout.start).getTime())}
                />
              )}
            </>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      {profile?.email && (
        <p style={{ textAlign: 'center', color: '#bbb', fontSize: '0.8rem', marginTop: '40px' }}>
          {profile.email}
        </p>
      )}
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

function Empty() {
  return <p style={{ color: '#aaa', fontSize: '0.9rem' }}>No data available</p>;
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
    justifyContent: 'space-between',
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
