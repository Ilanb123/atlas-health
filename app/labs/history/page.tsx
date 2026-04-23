import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Lab History — Atlas Health' };

const CATEGORY_LABELS: Record<string, string> = {
  lipids: 'Lipids',
  thyroid: 'Thyroid',
  hormones: 'Hormones',
  metabolic: 'Metabolic Panel',
  inflammation: 'Inflammation',
  nutrients: 'Nutrients & Vitamins',
  cbc: 'Complete Blood Count',
  other: 'Other',
};

const CATEGORY_ORDER = ['lipids', 'thyroid', 'hormones', 'metabolic', 'inflammation', 'nutrients', 'cbc', 'other'];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  normal:     { bg: '#f0fdf4', text: '#15803d', label: 'Normal' },
  high:       { bg: '#fef2f2', text: '#991b1b', label: 'High' },
  low:        { bg: '#eff6ff', text: '#1d4ed8', label: 'Low' },
  borderline: { bg: '#fffbeb', text: '#92400e', label: 'Borderline' },
  unknown:    { bg: '#f9fafb', text: '#6b7280', label: '—' },
};

interface BiomarkerRow {
  id: string;
  name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  reference_range_label: string;
  test_date: string;
  category: string;
  lab_source: string | null;
}

export default async function LabHistoryPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('atlas_user_id')?.value;
  if (!userId) redirect('/');

  const { data: rows, error } = await supabase
    .from('biomarkers')
    .select('id, name, value, unit, reference_range_low, reference_range_high, reference_range_label, test_date, category, lab_source')
    .eq('user_id', userId)
    .order('test_date', { ascending: false })
    .order('name', { ascending: true });

  if (error || !rows) {
    return (
      <main style={styles.page}>
        <p style={{ color: '#888' }}>Could not load lab history.</p>
      </main>
    );
  }

  // Group by name, collecting all dates for trend display
  const byName = new Map<string, BiomarkerRow[]>();
  for (const row of rows) {
    const existing = byName.get(row.name) ?? [];
    existing.push(row);
    byName.set(row.name, existing);
  }

  // Group names by category
  const byCategory: Record<string, string[]> = {};
  for (const [name, entries] of byName.entries()) {
    const cat = entries[0].category ?? 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    if (!byCategory[cat].includes(name)) byCategory[cat].push(name);
  }

  const hasData = rows.length > 0;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/dashboard" style={{ textDecoration: 'none' }}>
          <span style={styles.logo}>Atlas Health</span>
        </a>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>Lab History</span>
        <a href="/labs" style={{ color: '#aaa', fontSize: '0.85rem', textDecoration: 'none', marginLeft: 'auto' }}>
          ↑ Upload new
        </a>
      </header>

      <div style={styles.container}>
        <h1 style={styles.heading}>Lab History</h1>

        {!hasData ? (
          <div style={styles.emptyState}>
            <p style={{ color: '#888', marginBottom: '16px' }}>No lab results uploaded yet.</p>
            <a href="/labs" style={styles.primaryBtn}>Upload your first lab PDF →</a>
          </div>
        ) : (
          <div style={styles.tableArea}>
            {CATEGORY_ORDER.filter(cat => byCategory[cat]).map(cat => (
              <div key={cat} style={styles.categoryBlock}>
                <div style={styles.categoryHeader}>{CATEGORY_LABELS[cat] ?? cat}</div>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Biomarker', 'Latest', 'Unit', 'Range', 'Status', 'Previous', 'Change', 'Date'].map(col => (
                          <th key={col} style={styles.th}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {byCategory[cat].map((name, i) => {
                        const entries = byName.get(name)!; // newest first
                        const latest = entries[0];
                        const prev = entries[1] ?? null;
                        const delta = prev != null
                          ? Number(latest.value) - Number(prev.value)
                          : null;
                        const deltaStr = delta != null
                          ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`
                          : '—';
                        const deltaColor = delta == null ? '#aaa' : delta > 0 ? '#ef4444' : '#22c55e';
                        const status = STATUS_STYLES[latest.reference_range_label] ?? STATUS_STYLES.unknown;
                        const refRange = latest.reference_range_low != null && latest.reference_range_high != null
                          ? `${latest.reference_range_low}–${latest.reference_range_high}`
                          : '—';

                        return (
                          <tr key={name} style={i % 2 === 0 ? {} : styles.rowAlt}>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{name}</td>
                            <td style={styles.td}>{latest.value}</td>
                            <td style={{ ...styles.td, color: '#888' }}>{latest.unit}</td>
                            <td style={{ ...styles.td, color: '#aaa', fontSize: '0.8rem' }}>{refRange}</td>
                            <td style={styles.td}>
                              <span style={{ ...styles.statusBadge, background: status.bg, color: status.text }}>
                                {status.label}
                              </span>
                            </td>
                            <td style={{ ...styles.td, color: '#aaa' }}>
                              {prev != null ? prev.value : '—'}
                            </td>
                            <td style={{ ...styles.td, fontWeight: 600, color: deltaColor }}>
                              {deltaStr}
                            </td>
                            <td style={{ ...styles.td, color: '#aaa', fontSize: '0.8rem' }}>
                              {latest.test_date}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
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
    padding: '32px 24px 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '980px',
    margin: '0 auto 40px',
  },
  logo: {
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0d0d0d',
  },
  container: {
    maxWidth: '980px',
    margin: '0 auto',
  },
  heading: {
    fontSize: '1.75rem',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: '#0d0d0d',
    marginBottom: '28px',
  },
  emptyState: {
    background: '#fff',
    borderRadius: '16px',
    padding: '48px 32px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  tableArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  categoryBlock: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  categoryHeader: {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#999',
    padding: '12px 16px 10px',
    borderBottom: '1px solid #f5f5f4',
    background: '#fafafa',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left',
    padding: '10px 16px',
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#aaa',
    borderBottom: '1px solid #f0f0f0',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '11px 16px',
    color: '#1a1a1a',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f9f9f9',
  },
  rowAlt: {
    background: '#fafafa',
  },
  statusBadge: {
    display: 'inline-block',
    borderRadius: '6px',
    padding: '2px 10px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  primaryBtn: {
    display: 'inline-block',
    background: '#111',
    color: '#fff',
    padding: '11px 22px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
};
