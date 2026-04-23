'use client';

import { useState, useRef, useCallback } from 'react';

interface Biomarker {
  standardized_name: string;
  value: number;
  unit: string;
  reference_range_low: number | null;
  reference_range_high: number | null;
  reference_range_label: 'normal' | 'high' | 'low' | 'borderline' | 'unknown';
  test_date: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

interface UploadResult {
  count: number;
  biomarkers: Biomarker[];
  errors: string[];
  lab_source: string;
  test_date: string;
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  normal:     { bg: '#f0fdf4', text: '#15803d', label: 'Normal' },
  high:       { bg: '#fef2f2', text: '#991b1b', label: 'High' },
  low:        { bg: '#eff6ff', text: '#1d4ed8', label: 'Low' },
  borderline: { bg: '#fffbeb', text: '#92400e', label: 'Borderline' },
  unknown:    { bg: '#f9fafb', text: '#6b7280', label: '—' },
};

function groupByCategory(biomarkers: Biomarker[]): Record<string, Biomarker[]> {
  const order = ['lipids', 'thyroid', 'hormones', 'metabolic', 'inflammation', 'nutrients', 'cbc', 'other'];
  const groups: Record<string, Biomarker[]> = {};
  for (const b of biomarkers) {
    const cat = b.category ?? 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(b);
  }
  return Object.fromEntries(
    order.filter(k => groups[k]).map(k => [k, groups[k]])
  );
}

export default function LabsPage() {
  const [state, setState] = useState<UploadState>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setState('error');
      setStatusMsg('Only PDF files are accepted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState('error');
      setStatusMsg('File exceeds the 10 MB size limit.');
      return;
    }

    setState('uploading');
    setStatusMsg('Uploading and extracting biomarkers…');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/labs/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setState('error');
        setStatusMsg(data.error ?? 'Upload failed');
        return;
      }

      setResult(data);
      setState('done');
      setStatusMsg(`Extracted ${data.count} biomarkers from ${data.lab_source}`);
    } catch {
      setState('error');
      setStatusMsg('Network error — please try again.');
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const groups = result ? groupByCategory(result.biomarkers) : {};

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <a href="/dashboard" style={{ textDecoration: 'none' }}>
          <span style={styles.logo}>Atlas Health</span>
        </a>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>Lab Results</span>
        <a href="/dashboard" style={{ color: '#aaa', fontSize: '0.85rem', textDecoration: 'none', marginLeft: 'auto' }}>
          ← Dashboard
        </a>
      </header>

      <div style={styles.container}>
        <h1 style={styles.heading}>Upload Lab Results</h1>
        <p style={styles.subheading}>
          Upload a PDF from Quest, LabCorp, Function Health, or any standard lab. Claude will extract every biomarker automatically.
        </p>

        {/* Dropzone */}
        {state !== 'done' && (
          <div
            style={{
              ...styles.dropzone,
              ...(dragOver ? styles.dropzoneActive : {}),
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {state === 'idle' && (
              <>
                <div style={styles.dropIcon}>📄</div>
                <p style={styles.dropTitle}>Drop your lab PDF here</p>
                <p style={styles.dropSub}>or click to browse · PDF only · max 10 MB</p>
              </>
            )}
            {state === 'uploading' && (
              <>
                <div style={styles.spinner} />
                <p style={{ color: '#555', fontSize: '0.95rem', marginTop: '12px' }}>{statusMsg}</p>
              </>
            )}
            {state === 'error' && (
              <>
                <div style={{ fontSize: '2rem' }}>⚠️</div>
                <p style={{ color: '#dc2626', fontSize: '0.95rem', marginTop: '8px' }}>{statusMsg}</p>
                <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '4px' }}>Click to try again</p>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {state === 'done' && result && (
          <div style={styles.resultsWrap}>
            {/* Summary */}
            <div style={styles.summaryBar}>
              <div>
                <span style={styles.summaryCount}>{result.count}</span>
                <span style={{ color: '#666', fontSize: '0.9rem' }}> biomarkers extracted</span>
              </div>
              <div style={{ color: '#999', fontSize: '0.85rem' }}>
                {result.lab_source} · {result.test_date}
              </div>
            </div>

            {/* Errors / warnings */}
            {result.errors.length > 0 && (
              <div style={styles.warningBox}>
                <p style={{ fontWeight: 600, marginBottom: '6px', color: '#92400e', fontSize: '0.85rem' }}>
                  Extraction notes
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: '0.82rem', color: '#78350f' }}>· {e}</p>
                ))}
              </div>
            )}

            {/* Biomarker table grouped by category */}
            {Object.entries(groups).map(([cat, markers]) => (
              <div key={cat} style={styles.categoryBlock}>
                <div style={styles.categoryHeader}>{CATEGORY_LABELS[cat] ?? cat}</div>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Name', 'Value', 'Unit', 'Reference Range', 'Status', 'Date'].map(col => (
                          <th key={col} style={styles.th}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {markers.map((b, i) => {
                        const status = STATUS_STYLES[b.reference_range_label] ?? STATUS_STYLES.unknown;
                        const refRange = b.reference_range_low != null && b.reference_range_high != null
                          ? `${b.reference_range_low} – ${b.reference_range_high}`
                          : '—';
                        return (
                          <tr key={i} style={i % 2 === 0 ? {} : styles.rowAlt}>
                            <td style={styles.td}>
                              {b.standardized_name}
                              {b.confidence === 'low' && (
                                <span style={styles.lowConfidence} title="Low extraction confidence — verify manually">⚠</span>
                              )}
                            </td>
                            <td style={{ ...styles.td, fontWeight: 600 }}>{b.value}</td>
                            <td style={{ ...styles.td, color: '#888' }}>{b.unit}</td>
                            <td style={{ ...styles.td, color: '#888' }}>{refRange}</td>
                            <td style={styles.td}>
                              <span style={{ ...styles.statusBadge, background: status.bg, color: status.text }}>
                                {status.label}
                              </span>
                            </td>
                            <td style={{ ...styles.td, color: '#aaa', fontSize: '0.8rem' }}>{b.test_date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Actions */}
            <div style={styles.actionRow}>
              <button
                style={styles.secondaryBtn}
                onClick={() => { setState('idle'); setResult(null); setStatusMsg(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              >
                Upload another
              </button>
              <a href="/labs/history" style={styles.primaryBtn}>View all labs →</a>
            </div>
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
    maxWidth: '860px',
    margin: '0 auto 40px',
  },
  logo: {
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#0d0d0d',
  },
  container: {
    maxWidth: '860px',
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
  dropzone: {
    background: '#fff',
    border: '2px dashed #e5e5e5',
    borderRadius: '16px',
    padding: '64px 32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '220px',
  },
  dropzoneActive: {
    borderColor: '#111',
    background: '#fafafa',
  },
  dropIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  dropTitle: {
    fontWeight: 600,
    fontSize: '1.05rem',
    color: '#111',
    marginBottom: '6px',
  },
  dropSub: {
    color: '#aaa',
    fontSize: '0.85rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #f0f0f0',
    borderTopColor: '#111',
    animation: 'spin 0.8s linear infinite',
  },
  resultsWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  summaryBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    borderRadius: '12px',
    padding: '16px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  summaryCount: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0d0d0d',
    letterSpacing: '-0.02em',
  },
  warningBox: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '14px 18px',
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
  lowConfidence: {
    marginLeft: '6px',
    fontSize: '0.75rem',
    color: '#f59e0b',
    cursor: 'help',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    paddingTop: '4px',
  },
  secondaryBtn: {
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    padding: '11px 22px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#444',
    cursor: 'pointer',
    fontFamily: 'inherit',
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
