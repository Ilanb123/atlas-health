// Run after 003_instrumentation.sql migration:
//   node scripts/verify-instrumentation.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ── 1. Fetch the most recent real row (if any) ────────────────────────────────
const { data: recent, error: fetchErr } = await supabase
  .from('agent_interactions')
  .select('id, timestamp, agent_type, user_question, tools_called, response_report, latency_ms, tokens_used')
  .order('timestamp', { ascending: false })
  .limit(1)
  .maybeSingle();

if (fetchErr) {
  console.error('Fetch failed:', fetchErr.message);
  process.exit(1);
}

if (recent) {
  console.log('\n── Most recent agent_interactions row ──');
  console.log('id          :', recent.id);
  console.log('timestamp   :', recent.timestamp);
  console.log('agent_type  :', recent.agent_type);
  console.log('question    :', recent.user_question?.slice(0, 80));
  console.log('tools_called:', JSON.stringify(recent.tools_called));
  console.log('latency_ms  :', recent.latency_ms);
  console.log('tokens_used :', JSON.stringify(recent.tokens_used));
  console.log('\nresponse_report keys:', Object.keys(recent.response_report ?? {}));
  const rr = recent.response_report ?? {};
  console.log('  verdict      :', rr.verdict);
  console.log('  verdict_tone :', rr.verdict_tone);
  console.log('  key_metrics  :', JSON.stringify(rr.key_metrics?.slice(0, 2)));
  console.log('  sections     :', rr.sections?.length, 'section(s)');
  console.log('  action       :', rr.action?.slice(0, 100));

  const keys = Object.keys(rr);
  const expected = ['verdict', 'verdict_tone', 'key_metrics', 'sections', 'action'];
  const missing = expected.filter(k => !keys.includes(k));
  if (missing.length) {
    console.error('\n✗ MISSING fields in response_report:', missing);
  } else {
    console.log('\n✓ response_report has all expected AgentReport fields');
  }
  process.exit(0);
}

// ── 2. No real rows yet — insert a synthetic test row then clean up ────────────
console.log('No rows found. Inserting synthetic test row...');

// Need a real user_id for the FK constraint
const { data: users } = await supabase.from('users').select('id').limit(1).maybeSingle();
if (!users) {
  console.log('No users in DB. Run the app and authenticate first, then re-run this script.');
  process.exit(0);
}

const testReport = {
  verdict: 'TEST: Sleep performance was strong at 87%.',
  verdict_tone: 'green',
  key_metrics: [
    { label: 'Sleep Performance', value: '87%', note: '↑ 5% vs baseline' },
    { label: 'REM', value: '1h 32m' },
  ],
  sections: [
    { heading: 'Overview', body: 'This is a synthetic test row inserted by verify-instrumentation.mjs.' },
  ],
  action: 'No action needed — this is a test row.',
};

const { data: inserted, error: insertErr } = await supabase
  .from('agent_interactions')
  .insert({
    user_id: users.id,
    agent_type: 'sleep',
    user_question: '__verify_script_test__',
    tools_called: ['get_latest_sleep', 'get_sleep_baseline'],
    response_report: testReport,
    latency_ms: 1234,
    tokens_used: { input: 500, output: 200, total: 700 },
  })
  .select('id, response_report')
  .single();

if (insertErr) {
  console.error('✗ Insert failed:', insertErr.message);
  process.exit(1);
}

const rr = inserted.response_report;
console.log('\nInserted row id:', inserted.id);
console.log('response_report type  :', typeof rr);
console.log('response_report keys  :', Object.keys(rr));
console.log('verdict               :', rr.verdict);
console.log('verdict_tone          :', rr.verdict_tone);
console.log('key_metrics[0]        :', JSON.stringify(rr.key_metrics?.[0]));
console.log('sections[0].heading   :', rr.sections?.[0]?.heading);
console.log('action                :', rr.action);

const expected = ['verdict', 'verdict_tone', 'key_metrics', 'sections', 'action'];
const missing = expected.filter(k => !(k in rr));
if (missing.length) {
  console.error('\n✗ response_report is missing fields:', missing);
  console.error('  Actual stored value:', JSON.stringify(rr));
} else {
  console.log('\n✓ response_report correctly stores structured AgentReport as JSONB');
}

// Clean up test row
await supabase.from('agent_interactions').delete().eq('id', inserted.id);
console.log('  (test row deleted)');
