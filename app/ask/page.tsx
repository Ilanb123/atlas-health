'use client';

import { useState, useRef } from 'react';

type Coach = 'sleep' | 'recovery';

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

export default function AskPage() {
  const [coach, setCoach] = useState<Coach>('sleep');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function switchCoach(next: Coach) {
    if (next === coach) return;
    setCoach(next);
    setResponse(null);
    setToolsUsed([]);
    setError(null);
    setQuestion('');
  }

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setToolsUsed([]);

    try {
      const res = await fetch(`/api/ask/${coach}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      setResponse(data.response);
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

  const paragraphs = response?.split('\n').filter(p => p.trim()) ?? [];
  const activeCoach = COACHES.find(c => c.id === coach)!;

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
              style={{
                ...styles.tab,
                ...(coach === c.id ? styles.tabActive : styles.tabInactive),
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p style={styles.subheading}>{activeCoach.description}</p>

        {!response && !loading && (
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

        {error && (
          <div style={styles.errorBox}>{error}</div>
        )}

        {response && (
          <div style={styles.responseBox}>
            {paragraphs.map((para, i) => (
              <p key={i} style={styles.para}>{para}</p>
            ))}

            {toolsUsed.length > 0 && (
              <div style={styles.toolsFooter}>
                <span style={{ color: '#bbb' }}>Data sources: </span>
                {toolsUsed.map((t, i) => (
                  <span key={i} style={styles.toolTag}>{t.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}

            <button
              style={styles.askAgainBtn}
              onClick={() => {
                setResponse(null);
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
    transition: 'background 0.15s, color 0.15s',
  },
  tabActive: {
    background: '#111',
    color: '#fff',
  },
  tabInactive: {
    background: '#fff',
    color: '#666',
    border: '1px solid #e5e5e5',
  },
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
  responseBox: {
    background: '#fff',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  },
  para: {
    color: '#1a1a1a',
    fontSize: '0.97rem',
    lineHeight: 1.7,
    marginBottom: '14px',
  },
  toolsFooter: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
    fontSize: '0.78rem',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    alignItems: 'center',
  },
  toolTag: {
    background: '#f5f5f4',
    borderRadius: '4px',
    padding: '2px 8px',
    color: '#888',
    fontSize: '0.75rem',
  },
  askAgainBtn: {
    marginTop: '20px',
    background: 'transparent',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '0.85rem',
    color: '#555',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
