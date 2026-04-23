'use client';

import { useState, useRef } from 'react';

const STARTER_QUESTIONS = [
  'How was my sleep last night?',
  'Am I getting enough REM sleep?',
  'How does my HRV today affect my focus for the trading day?',
  'What patterns do you see in my sleep over the last 2 weeks?',
];

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setToolsUsed([]);

    try {
      const res = await fetch('/api/ask/sleep', {
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

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/dashboard" style={{ textDecoration: 'none' }}>
          <span style={styles.logo}>Atlas Health</span>
        </a>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>Sleep Coach</span>
        <a href="/dashboard" style={{ color: '#aaa', fontSize: '0.85rem', textDecoration: 'none', marginLeft: 'auto' }}>
          ← Dashboard
        </a>
      </header>

      <div style={styles.container}>
        <h1 style={styles.heading}>Ask your sleep coach</h1>
        <p style={styles.subheading}>
          Powered by your real WHOOP data. Ask anything about your sleep, recovery, or performance.
        </p>

        {!response && !loading && (
          <div style={styles.starters}>
            {STARTER_QUESTIONS.map(q => (
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
            placeholder="Ask about your sleep, HRV, recovery…"
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
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {response && (
          <div style={styles.responseBox}>
            {paragraphs.map((para, i) => (
              <p key={i} style={styles.para}>{para}</p>
            ))}

            {toolsUsed.length > 0 && (
              <div style={styles.toolsFooter}>
                <span style={{ color: '#bbb' }}>Data sources used: </span>
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
  heading: {
    fontSize: '1.75rem',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: '#0d0d0d',
    marginBottom: '8px',
  },
  subheading: {
    color: '#666',
    fontSize: '0.95rem',
    marginBottom: '32px',
    lineHeight: 1.5,
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
    transition: 'border-color 0.15s',
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
    animation: 'pulse 1.2s infinite',
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
