'use client';

import { useState, useRef } from 'react';

type Coach = 'sleep' | 'recovery';

interface KeyMetric { label: string; value: string; note?: string }
interface ReportSection { heading: string; body: string }
interface AgentReport {
  verdict: string;
  verdict_tone: 'green' | 'yellow' | 'red';
  key_metrics: KeyMetric[];
  sections: ReportSection[];
  action: string;
}

const COACHES: { id: Coach; label: string; description: string }[] = [
  { id: 'sleep', label: 'Sleep Coach', description: 'Sleep stages, REM, deep sleep, efficiency' },
  { id: 'recovery', label: 'Recovery Coach', description: 'HRV, autonomic balance, overtraining, readiness' },
];

const STARTER_QUESTIONS: Record<Coach, string[]> = {
  sleep: [
    'How was my sleep last night?',
    'Am I getting enough REM sleep?',
    'How does my HRV today affect my focus for the trading day?',
    'What patterns do you see in my sleep over the last 2 weeks?',
  ],
  recovery: [
    'Is my HRV trending up or down?',
    'How recovered am I today?',
    'Am I overtraining?',
    'Should I push hard or pull back today?',
  ],
};

const TOOL_LABELS: Record<string, string> = {
  get_recent_checkins:              'Daily check-ins',
  get_latest_sleep:                 "Last night's sleep",
  get_sleep_history:                'Sleep history',
  get_sleep_baseline:               'Sleep baseline',
  compare_to_baseline:              'Baseline comparison',
  detect_sleep_pattern:             'Sleep patterns',
  get_recent_hrv_recovery:          'HRV & recovery',
  get_latest_recovery:              "Today's recovery",
  get_recovery_history:             'Recovery history',
  get_recovery_baseline:            'Recovery baseline',
  compare_recovery_to_baseline:     'Recovery comparison',
  detect_recovery_trend:            'Recovery trend',
  correlate_recovery_with_workouts: 'Recovery + workout correlation',
  get_latest_biomarkers:            'Latest lab biomarkers',
  get_biomarker_history:            'Biomarker history',
};

const TONE_STYLES: Record<'green' | 'yellow' | 'red', { bg: string; text: string; border: string; dot: string }> = {
  green:  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  yellow: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
  red:    { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
};

export default function AskPage() {
  const [coach, setCoach] = useState<Coach>('sleep');
  const [question, setQuestion] = useState('');
  const [report, setReport] = useState<AgentReport | null>(null);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function switchCoach(next: Coach) {
    if (next === coach) return;
    setCoach(next);
    setReport(null);
    setToolsUsed([]);
    setError(null);
    setQuestion('');
  }

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setToolsUsed([]);

    try {
      const res = await fetch(`/api/ask/${coach}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();
      console.log('[ask] raw API response:', JSON.stringify(data, null, 2));
      console.log('[ask] data.report:', data.report);
      console.log('[ask] data.response:', (data as Record<string, unknown>).response);

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setReport(data.report);
      setToolsUsed(data.tool_calls_used ?? []);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(question);
    }
  }

  function useStarter(q: string) {
    setQuestion(q);
    textareaRef.current?.focus();
    submit(q);
  }

  const activeCoach = COACHES.find(c => c.id === coach)!;
  const tone = report ? TONE_STYLES[report.verdict_tone] : null;

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
        {/* Coach selector */}
        <div style={styles.tabRow}>
          {COACHES.map(c => (
            <button
              key={c.id}
              onClick={() => switchCoach(c.id)}
              style={{ ...styles.tab, ...(coach === c.id ? styles.tabActive : styles.tabInactive) }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p style={styles.subheading}>{activeCoach.description}</p>

        {!report && !loading && (
          <div style={styles.starters}>
            {STARTER_QUESTIONS[coach].map(q => (
              <button key={q} style={styles.starterBtn} onClick={() => useStarter(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        <div style={styles.inputRow}>
          <textarea
            ref={textareaRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={coach === 'sleep' ? 'Ask about your sleep, stages, efficiency…' : 'Ask about your HRV, recovery, readiness…'}
            rows={3}
            style={styles.textarea}
            disabled={loading}
          />
          <button
            onClick={() => submit(question)}
            disabled={loading || !question.trim()}
            style={{
              ...styles.sendBtn,
              opacity: loading || !question.trim() ? 0.5 : 1,
              cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '…' : '→'}
          </button>
        </div>

        {loading && (
          <div style={styles.loadingBox}>
            <span style={styles.loadingDot} />
            <span style={{ color: '#888', fontSize: '0.9rem' }}>Analyzing your data…</span>
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}

        {report && tone && (
          <div style={styles.reportBox}>
            {/* Verdict */}
            <div style={{ ...styles.verdictBanner, background: tone.bg, border: `1px solid ${tone.border}` }}>
              <span style={{ ...styles.verdictDot, background: tone.dot }} />
              <p style={{ ...styles.verdictText, color: tone.text }}>{report.verdict}</p>
            </div>

            {/* Key metrics grid */}
            {report.key_metrics.length > 0 && (
              <div style={styles.metricsGrid}>
                {report.key_metrics.map((m, i) => (
                  <div key={i} style={styles.metricCard}>
                    <div style={styles.metricLabel}>{m.label}</div>
                    <div style={styles.metricValue}>{m.value}</div>
                    {m.note && <div style={styles.metricNote}>{m.note}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Analysis sections */}
            {report.sections.map((s, i) => (
              <div key={i} style={styles.section}>
                <h3 style={styles.sectionHeading}>{s.heading}</h3>
                <p style={styles.sectionBody}>{s.body}</p>
              </div>
            ))}

            {/* Action card */}
            <div style={styles.actionCard}>
              <div style={styles.actionLabel}>Do this next</div>
              <p style={styles.actionText}>{report.action}</p>
            </div>

            {/* Tools footer */}
            {toolsUsed.length > 0 && (
              <div style={styles.toolsFooter}>
                <span style={{ color: '#bbb' }}>Data sources: </span>
                {[...new Set(toolsUsed)].map((t, i) => (
                  <span key={i} style={styles.toolTag}>{TOOL_LABELS[t] ?? t.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}

            <button
              style={styles.askAgainBtn}
              onClick={() => {
                setReport(null);
                setToolsUsed([]);
                setQuestion('');
                setTimeout(() => textareaRef.current?.focus(), 0);
              }}
            >
              Ask another question
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
    background: '#f5f5f4',
    padding: '32px 24px 64px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '680px',
    margin: '0 auto 40px',
  },
  logo: {
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0d0d0d',
  },
  container: {
    maxWidth: '680px',
    margin: '0 auto',
  },
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  tab: {
    padding: '9px 20px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  tabActive:   { background: '#111', color: '#fff' },
  tabInactive: { background: '#fff', color: '#666', border: '1px solid #e5e5e5' },
  subheading: {
    color: '#888',
    fontSize: '0.88rem',
    marginBottom: '24px',
  },
  starters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '24px',
  },
  starterBtn: {
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    color: '#444',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    marginBottom: '16px',
  },
  textarea: {
    flex: 1,
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e5e5e5',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    background: '#fff',
    lineHeight: 1.5,
    color: '#0d0d0d',
  },
  sendBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: '#111',
    color: '#fff',
    border: 'none',
    fontSize: '1.3rem',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 0',
  },
  loadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#6366f1',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '16px',
    color: '#dc2626',
    fontSize: '0.9rem',
  },
  reportBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  verdictBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    borderRadius: '12px',
    padding: '16px 20px',
  },
  verdictDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '5px',
  },
  verdictText: {
    margin: 0,
    fontWeight: 700,
    fontSize: '1.05rem',
    lineHeight: 1.4,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
    gap: '10px',
  },
  metricCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  metricLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#999',
    marginBottom: '6px',
  },
  metricValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0d0d0d',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    marginBottom: '4px',
  },
  metricNote: {
    fontSize: '0.75rem',
    color: '#888',
    marginTop: '4px',
  },
  section: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  sectionHeading: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    color: '#999',
    margin: '0 0 10px',
  },
  sectionBody: {
    fontSize: '0.96rem',
    lineHeight: 1.7,
    color: '#1a1a1a',
    margin: 0,
  },
  actionCard: {
    background: '#0d0d0d',
    borderRadius: '12px',
    padding: '20px 24px',
  },
  actionLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: '#888',
    marginBottom: '8px',
  },
  actionText: {
    fontSize: '0.97rem',
    lineHeight: 1.6,
    color: '#fff',
    margin: 0,
    fontWeight: 500,
  },
  toolsFooter: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
    fontSize: '0.75rem',
    paddingTop: '4px',
  },
  toolTag: {
    background: '#ebebeb',
    borderRadius: '4px',
    padding: '2px 8px',
    color: '#888',
    fontSize: '0.72rem',
  },
  askAgainBtn: {
    background: 'transparent',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '0.85rem',
    color: '#555',
    cursor: 'pointer',
    fontFamily: 'inherit',
    alignSelf: 'flex-start',
  },
};
