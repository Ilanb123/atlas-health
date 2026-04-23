import { after } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: "Today's Brief — Atlas Health" };

interface KeyMetric { label: string; value: string; note?: string; }
interface MorningBrief {
  whatsapp_text: string;
  headline: string;
  verdict_tone: 'green' | 'yellow' | 'red';
  state_summary: string;
  priority_focus: string;
  data_signals: KeyMetric[];
  action_today: string;
  watch_for: string;
  data_sources: string[];
  educational_disclaimer?: string;
}
interface BriefRow {
  id: string;
  brief_date: string;
  whatsapp_text: string;
  full_brief: MorningBrief;
  latency_ms: number | null;
  tokens_used: { input: number; output: number; total: number } | null;
  sent_at: string | null;
  read_at: string | null;
}

const TONE_CONFIG = {
  green:  { label: 'Strong',    bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a', text: '#15803d' },
  yellow: { label: 'Moderate',  bg: '#fffbeb', border: '#fde68a', dot: '#d97706', text: '#92400e' },
  red:    { label: 'Low',       bg: '#fef2f2', border: '#fecaca', dot: '#dc2626', text: '#991b1b' },
};

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export default async function TodayPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;

  if (!userId) {
    return (
      <main style={styles.page}>
        <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
          <h1 style={styles.logo}>Atlas Health</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>Connect your WHOOP to view your brief.</p>
          <a href="/api/whoop/authorize" style={styles.primaryBtn}>Connect WHOOP</a>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const supabase = supabaseAdmin();

  const { data: row } = await supabase
    .from('morning_briefs')
    .select('id, brief_date, whatsapp_text, full_brief, latency_ms, tokens_used, sent_at, read_at')
    .eq('user_id', userId)
    .eq('brief_date', today)
    .maybeSingle() as { data: BriefRow | null };

  if (row && !row.read_at) {
    after(async () => {
      await supabase
        .from('morning_briefs')
        .update({ read_at: new Date().toISOString() })
        .eq('id', row.id);
    });
  }

  if (!row) {
    return (
      <main style={styles.page}>
        <header style={styles.header}>
          <a href="/dashboard" style={styles.backLink}>← Dashboard</a>
          <span style={styles.logo}>Atlas Health</span>
        </header>
        <div style={{ maxWidth: '620px', margin: '0 auto', textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🌙</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0d0d0d', marginBottom: '8px' }}>
            No brief yet today
          </h2>
          <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Your morning brief arrives via WhatsApp at 6:30 AM. Come back then.
          </p>
          <a href="/dashboard" style={{ ...styles.primaryBtn, display: 'inline-block', marginTop: '32px' }}>
            Back to Dashboard
          </a>
        </div>
      </main>
    );
  }

  const brief = row.full_brief;
  const tone = TONE_CONFIG[brief.verdict_tone] ?? TONE_CONFIG.yellow;
  const sentTime = row.sent_at
    ? new Date(row.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/dashboard" style={styles.backLink}>← Dashboard</a>
        <span style={styles.logo}>Atlas Health</span>
        <span style={{ color: '#aaa', fontSize: '0.8rem', marginLeft: 'auto' }}>
          {new Date(row.brief_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {sentTime && ` · sent ${sentTime}`}
        </span>
      </header>

      <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Verdict banner */}
        <div style={{ ...styles.card, background: tone.bg, border: `1px solid ${tone.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tone.dot, flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: tone.text }}>
              Readiness — {tone.label}
            </span>
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0d0d0d', lineHeight: 1.45, margin: 0 }}>
            {brief.headline}
          </p>
        </div>

        {/* State summary */}
        <div style={styles.card}>
          <SectionLabel>Overview</SectionLabel>
          <p style={styles.bodyText}>{brief.state_summary}</p>
        </div>

        {/* Data signals */}
        <div style={styles.card}>
          <SectionLabel>Key Signals</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {brief.data_signals.map((sig, i) => (
              <div key={i} style={{ ...styles.signalRow, borderTop: i === 0 ? 'none' : '1px solid #f0f0f0' }}>
                <span style={styles.signalLabel}>{sig.label}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={styles.signalValue}>{sig.value}</span>
                  {sig.note && <div style={styles.signalNote}>{sig.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority + action */}
        <div style={styles.card}>
          <SectionLabel>Priority Focus</SectionLabel>
          <p style={{ ...styles.bodyText, fontWeight: 600 }}>{brief.priority_focus}</p>
          <div style={{ height: '1px', background: '#f0f0f0', margin: '14px 0' }} />
          <SectionLabel>Action Today</SectionLabel>
          <p style={styles.bodyText}>{brief.action_today}</p>
        </div>

        {/* Watch for */}
        <div style={styles.card}>
          <SectionLabel>Watch For Tomorrow</SectionLabel>
          <p style={styles.bodyText}>{brief.watch_for}</p>
        </div>

        {/* Educational disclaimer */}
        {brief.educational_disclaimer && (
          <p style={{ color: '#aaa', fontSize: '0.75rem', fontStyle: 'italic', lineHeight: 1.5, margin: '0 4px' }}>
            {brief.educational_disclaimer}
          </p>
        )}

        {/* Footer meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px' }}>
          <span style={styles.footerMeta}>
            {brief.data_sources.length} data sources · {row.tokens_used?.total?.toLocaleString() ?? '—'} tokens
          </span>
          {row.latency_ms && (
            <span style={styles.footerMeta}>{(row.latency_ms / 1000).toFixed(1)}s generation time</span>
          )}
        </div>

      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: '#bbb',
      marginBottom: '8px',
    }}>
      {children}
    </div>
  );
}

const styles = {
  page: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: '100vh',
    background: '#f5f5f4',
    padding: '32px 24px 80px',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '620px',
    margin: '0 auto 28px',
  } as React.CSSProperties,
  logo: {
    fontSize: '1.05rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0d0d0d',
  } as React.CSSProperties,
  backLink: {
    color: '#aaa',
    fontSize: '0.85rem',
    textDecoration: 'none',
  } as React.CSSProperties,
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px 22px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #ebebeb',
  } as React.CSSProperties,
  bodyText: {
    color: '#1a1a1a',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    margin: 0,
  } as React.CSSProperties,
  signalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '10px 0',
  } as React.CSSProperties,
  signalLabel: {
    color: '#888',
    fontSize: '0.82rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    paddingTop: '2px',
  },
  signalValue: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#0d0d0d',
  } as React.CSSProperties,
  signalNote: {
    color: '#aaa',
    fontSize: '0.75rem',
    marginTop: '2px',
  } as React.CSSProperties,
  primaryBtn: {
    background: '#111',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
  } as React.CSSProperties,
  footerMeta: {
    color: '#ccc',
    fontSize: '0.75rem',
  } as React.CSSProperties,
};
