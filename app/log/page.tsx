'use client';

import { useState, useEffect, useCallback } from 'react';

type Digestion = 'bad' | 'neutral' | 'good';

const SYMPTOMS_LIST = [
  'Headache', 'Fatigue', 'Anxious', 'Brain fog',
  'Poor sleep', 'Low libido', 'Nausea', 'Joint pain', 'Other',
];

interface CheckinRow {
  energy_1to10: number | null;
  mood_1to10: number | null;
  stress_1to10: number | null;
  cognitive_clarity_1to10: number | null;
  digestion: Digestion | null;
  symptoms: string[] | null;
  notable_events: string | null;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function todayDisplay(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

export default function LogPage() {
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [clarity, setClarity] = useState<number | null>(null);
  const [digestion, setDigestion] = useState<Digestion | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notable, setNotable] = useState('');
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [totalCheckins, setTotalCheckins] = useState<number | null>(null);

  const prefill = useCallback((row: CheckinRow) => {
    if (row.energy_1to10 != null) setEnergy(row.energy_1to10);
    if (row.mood_1to10 != null) setMood(row.mood_1to10);
    if (row.stress_1to10 != null) setStress(row.stress_1to10);
    if (row.cognitive_clarity_1to10 != null) setClarity(row.cognitive_clarity_1to10);
    if (row.digestion) setDigestion(row.digestion as Digestion);
    if (row.symptoms?.length) setSymptoms(row.symptoms);
    if (row.notable_events) setNotable(row.notable_events);
  }, []);

  useEffect(() => {
    fetch(`/api/checkin?date=${todayISO()}`)
      .then(r => r.json())
      .then(({ checkin }) => {
        if (checkin) {
          setAlreadyLogged(true);
          prefill(checkin as CheckinRow);
        }
      })
      .catch(() => {});
  }, [prefill]);

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSubmit() {
    setSubmitState('saving');
    setErrorMsg('');

    const body: Record<string, unknown> = { date: todayISO() };
    if (energy != null) body.energy_1to10 = energy;
    if (mood != null) body.mood_1to10 = mood;
    if (stress != null) body.stress_1to10 = stress;
    if (clarity != null) body.cognitive_clarity_1to10 = clarity;
    if (digestion) body.digestion = digestion;
    if (symptoms.length) body.symptoms = symptoms;
    if (notable.trim()) body.notable_events = notable.trim();

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitState('error');
        setErrorMsg(data.error ?? 'Save failed');
        return;
      }
      setTotalCheckins(data.total_checkins ?? null);
      setSubmitState('done');
    } catch {
      setSubmitState('error');
      setErrorMsg('Network error — please try again.');
    }
  }

  if (submitState === 'done') {
    return (
      <main style={styles.page}>
        <div style={styles.successWrap}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.successTitle}>Logged.</h1>
          <p style={styles.successSub}>See you tomorrow.</p>
          {totalCheckins != null && (
            <p style={styles.successCount}>
              Atlas now has {totalCheckins} data point{totalCheckins !== 1 ? 's' : ''} on you.
            </p>
          )}
          <a href="/dashboard" style={styles.primaryBtn}>Back to dashboard</a>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/dashboard" style={{ textDecoration: 'none' }}>
          <span style={styles.logo}>Atlas Health</span>
        </a>
        <a href="/dashboard" style={{ color: '#aaa', fontSize: '0.85rem', textDecoration: 'none', marginLeft: 'auto' }}>
          ← Dashboard
        </a>
      </header>

      <div style={styles.container}>
        <h1 style={styles.heading}>Daily Check-In</h1>
        <p style={styles.subheading}>20 seconds. One data point. Compounds forever.</p>
        <p style={styles.dateLabel}>{todayDisplay()}</p>

        {alreadyLogged && (
          <div style={styles.alreadyBadge}>Already logged today — updating your entry.</div>
        )}

        {/* Section 1: 1-10 scales */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>How are you feeling?</h2>
          <div style={styles.scaleRows}>
            {([
              ['Energy', energy, setEnergy],
              ['Mood', mood, setMood],
              ['Stress', stress, setStress, '10 = most stressed'],
              ['Cognitive clarity', clarity, setClarity],
            ] as [string, number | null, (v: number) => void, string?][]).map(([label, val, setter, note]) => (
              <div key={label} style={styles.scaleRow}>
                <div style={styles.scaleLabel}>
                  <span>{label}</span>
                  {note && <span style={styles.scaleNote}>{note}</span>}
                </div>
                <div style={styles.pillRow}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      style={{ ...styles.pill, ...(val === n ? styles.pillActive : {}) }}
                      onClick={() => setter(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Body signals */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Body signals</h2>

          <div style={styles.fieldGroup}>
            <span style={styles.fieldLabel}>Digestion</span>
            <div style={styles.chipRow}>
              {(['bad', 'neutral', 'good'] as Digestion[]).map(d => (
                <button
                  key={d}
                  style={{ ...styles.chip, ...(digestion === d ? styles.chipActive : {}) }}
                  onClick={() => setDigestion(digestion === d ? null : d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <span style={styles.fieldLabel}>Symptoms</span>
            <div style={styles.chipRow}>
              {SYMPTOMS_LIST.map(s => (
                <button
                  key={s}
                  style={{ ...styles.chip, ...(symptoms.includes(s) ? styles.chipActive : {}) }}
                  onClick={() => toggleSymptom(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Notable events */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Notable events <span style={styles.optional}>(optional)</span></h2>
          <input
            style={styles.textInput}
            type="text"
            placeholder="3 drinks last night, late meeting, red-eye to SFO"
            value={notable}
            maxLength={500}
            onChange={e => setNotable(e.target.value)}
          />
          <div style={styles.charCount}>{notable.length}/500</div>
        </div>

        {submitState === 'error' && (
          <div style={styles.errorBox}>{errorMsg}</div>
        )}

        <button
          style={{
            ...styles.submitBtn,
            ...(submitState === 'saving' ? styles.submitBtnDisabled : {}),
          }}
          disabled={submitState === 'saving'}
          onClick={handleSubmit}
        >
          {submitState === 'saving' ? 'Saving…' : 'Save check-in'}
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
    background: '#f5f5f4',
    padding: '32px 24px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '640px',
    margin: '0 auto 40px',
  },
  logo: {
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0d0d0d',
  },
  container: {
    maxWidth: '640px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  heading: {
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    color: '#0d0d0d',
    marginBottom: '4px',
  },
  subheading: {
    color: '#666',
    fontSize: '1rem',
    margin: '0 0 4px',
  },
  dateLabel: {
    color: '#aaa',
    fontSize: '0.82rem',
    marginBottom: '8px',
  },
  alreadyBadge: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '0.85rem',
    color: '#92400e',
    fontWeight: 500,
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  },
  cardTitle: {
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: '#999',
    marginBottom: '20px',
  },
  optional: {
    fontWeight: 400,
    textTransform: 'none' as const,
    letterSpacing: 0,
    fontSize: '0.78rem',
    color: '#bbb',
  },
  scaleRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  scaleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  scaleLabel: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
  scaleNote: {
    fontSize: '0.75rem',
    color: '#aaa',
    fontWeight: 400,
  },
  pillRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  pill: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    border: '1.5px solid #e5e5e5',
    background: '#fff',
    color: '#444',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.1s',
  },
  pillActive: {
    background: '#111',
    color: '#fff',
    border: '1.5px solid #111',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '10px',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  chip: {
    padding: '7px 16px',
    borderRadius: '100px',
    border: '1.5px solid #e5e5e5',
    background: '#fff',
    color: '#444',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.1s',
  },
  chipActive: {
    background: '#111',
    color: '#fff',
    border: '1.5px solid #111',
  },
  textInput: {
    width: '100%',
    padding: '12px 14px',
    border: '1.5px solid #e5e5e5',
    borderRadius: '10px',
    fontSize: '0.9rem',
    color: '#1a1a1a',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
    background: '#fafafa',
  },
  charCount: {
    textAlign: 'right' as const,
    fontSize: '0.75rem',
    color: '#bbb',
    marginTop: '6px',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#991b1b',
    fontSize: '0.85rem',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: '4px',
  },
  submitBtnDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
  successWrap: {
    maxWidth: '480px',
    margin: '120px auto 0',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  successIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#111',
    color: '#fff',
    fontSize: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  successTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '-0.04em',
    color: '#0d0d0d',
    margin: 0,
  },
  successSub: {
    fontSize: '1.1rem',
    color: '#666',
    margin: 0,
  },
  successCount: {
    fontSize: '0.85rem',
    color: '#aaa',
    margin: '4px 0 12px',
  },
  primaryBtn: {
    display: 'inline-block',
    background: '#111',
    color: '#fff',
    padding: '13px 28px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    marginTop: '8px',
  },
};
