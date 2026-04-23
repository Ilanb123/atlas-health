'use client';

import { useState } from 'react';

function WhoopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
    </svg>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubmitted(true);
  }

  return (
    <main
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9f9f8',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-block',
            background: '#111',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: '4px',
            marginBottom: '24px',
          }}
        >
          Alpha
        </div>

        <h1
          style={{
            fontSize: '2.75rem',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#0d0d0d',
            margin: '0 0 16px',
            lineHeight: 1.1,
          }}
        >
          Atlas Health
        </h1>

        <p
          style={{
            fontSize: '1.1rem',
            color: '#555',
            lineHeight: 1.6,
            margin: '0 0 40px',
          }}
        >
          Your AI health agent — built for the demands of finance.
          <br />
          Sleep, recovery, and performance, simplified.
        </p>

        <a
          href="/api/whoop/authorize"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#000',
            color: '#fff',
            padding: '13px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.95rem',
            textDecoration: 'none',
            marginBottom: '32px',
          }}
        >
          <WhoopIcon />
          Connect WHOOP
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e5e5' }} />
          <span style={{ color: '#bbb', fontSize: '0.8rem' }}>or join the waitlist</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e5e5' }} />
        </div>

        {submitted ? (
          <div
            style={{
              background: '#edfaf3',
              border: '1px solid #a3e4c1',
              borderRadius: '10px',
              padding: '20px 24px',
              color: '#1a6640',
              fontWeight: 500,
            }}
          >
            You&rsquo;re on the list. We&rsquo;ll be in touch soon.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '12px 16px',
                fontSize: '1rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                outline: 'none',
                background: '#fff',
                color: '#111',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Get early access
            </button>
          </form>
        )}

        <p style={{ marginTop: '32px', fontSize: '0.8rem', color: '#aaa' }}>
          Connects with WHOOP, Oura, and Apple Health &nbsp;&middot;&nbsp;{' '}
          <a href="/privacy" style={{ color: '#aaa', textDecoration: 'underline' }}>
            Privacy Policy
          </a>
        </p>
      </div>
    </main>
  );
}
