import 'server-only';
import { supabase } from '../supabase';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const RECOVERY_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_latest_recovery',
    description: 'Fetch the most recent recovery record for the user, including recovery score, HRV, resting heart rate, SpO2, and skin temperature.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_recovery_history',
    description: 'Fetch recent recovery records for trend analysis. Returns up to N days of data (max 90) sorted newest first.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of recent recovery records to retrieve (1-90)' },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_recovery_baseline',
    description: "Calculate the user's average recovery metrics over a given period, including standard deviations for HRV and RHR variability.",
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Lookback window in days (default 90)' },
      },
      required: [],
    },
  },
  {
    name: 'compare_recovery_to_baseline',
    description: 'Compare recent average recovery metrics against a longer baseline period, returning per-metric deltas and percentage changes.',
    input_schema: {
      type: 'object',
      properties: {
        recent_days: { type: 'number', description: 'Short recent window to compare (e.g. 7)' },
        baseline_days: { type: 'number', description: 'Longer baseline window to compare against (e.g. 30)' },
      },
      required: ['recent_days', 'baseline_days'],
    },
  },
  {
    name: 'detect_recovery_trend',
    description: 'Analyze HRV, RHR, and recovery score trends over N days using linear regression. Returns trend direction, slope per day, confidence, and counts of consecutive red/green days.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days to analyze (7-90)' },
      },
      required: ['days'],
    },
  },
  {
    name: 'correlate_recovery_with_workouts',
    description: 'For each recovery day, find the prior day workout strain and group average recovery by strain level. Reveals overtraining patterns and optimal training load for this user.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days to analyze (14-90)' },
      },
      required: ['days'],
    },
  },
];

type ToolInput = Record<string, unknown>;

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
}

function linearRegression(values: number[]): { slope: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, r2: 0 };

  // x = 0..n-1, y = values
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, y, x) => acc + x * y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssTot = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssRes = values.reduce((sum, y, x) => sum + Math.pow(y - (slope * x + intercept), 2), 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { slope, r2 };
}

function trendDirection(slope: number, threshold: number): 'up' | 'down' | 'flat' {
  if (slope > threshold) return 'up';
  if (slope < -threshold) return 'down';
  return 'flat';
}

function confidence(r2: number): 'high' | 'medium' | 'low' {
  if (r2 >= 0.5) return 'high';
  if (r2 >= 0.25) return 'medium';
  return 'low';
}

export async function executeRecoveryTool(userId: string, toolName: string, input: ToolInput): Promise<string> {
  switch (toolName) {
    case 'get_latest_recovery': {
      try {
        const { data, error } = await supabase
          .from('recovery')
          .select('recovery_date, recovery_score, hrv_ms, rhr_bpm, spo2_pct, skin_temp_celsius')
          .eq('user_id', userId)
          .order('recovery_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) return `Error: ${error.message}`;
        if (!data) return 'No recovery data found for this user yet.';

        return JSON.stringify({
          date: data.recovery_date,
          recovery_score: data.recovery_score,
          zone: data.recovery_score == null ? null : data.recovery_score >= 67 ? 'green' : data.recovery_score >= 34 ? 'yellow' : 'red',
          hrv_ms: data.hrv_ms != null ? Number(data.hrv_ms) : null,
          rhr_bpm: data.rhr_bpm,
          spo2_pct: data.spo2_pct != null ? Number(data.spo2_pct) : null,
          skin_temp_celsius: data.skin_temp_celsius != null ? Number(data.skin_temp_celsius) : null,
        });
      } catch (e) {
        return `Error: ${String(e)}`;
      }
    }

    case 'get_recovery_history': {
      try {
        const days = Math.min(Math.max(Number(input.days) || 14, 1), 90);
        const { data, error } = await supabase
          .from('recovery')
          .select('recovery_date, recovery_score, hrv_ms, rhr_bpm, spo2_pct, skin_temp_celsius')
          .eq('user_id', userId)
          .order('recovery_date', { ascending: false })
          .limit(days);

        if (error) return `Error: ${error.message}`;
        if (!data || data.length === 0) return 'No recovery history found.';

        return JSON.stringify(data.map(d => ({
          date: d.recovery_date,
          recovery_score: d.recovery_score,
          zone: d.recovery_score == null ? null : d.recovery_score >= 67 ? 'green' : d.recovery_score >= 34 ? 'yellow' : 'red',
          hrv_ms: d.hrv_ms != null ? Number(d.hrv_ms) : null,
          rhr_bpm: d.rhr_bpm,
          spo2_pct: d.spo2_pct != null ? Number(d.spo2_pct) : null,
          skin_temp_celsius: d.skin_temp_celsius != null ? Number(d.skin_temp_celsius) : null,
        })));
      } catch (e) {
        return `Error: ${String(e)}`;
      }
    }

    case 'get_recovery_baseline': {
      try {
        const days = Math.min(Math.max(Number(input.days) || 90, 7), 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('recovery')
          .select('recovery_score, hrv_ms, rhr_bpm')
          .eq('user_id', userId)
          .gte('recovery_date', since);

        if (error) return `Error: ${error.message}`;
        if (!data || data.length < 3) return 'Not enough recovery data to compute a baseline (need at least 3 days).';

        const scores = data.map(d => d.recovery_score).filter((v): v is number => v != null);
        const hrvs = data.map(d => d.hrv_ms != null ? Number(d.hrv_ms) : null).filter((v): v is number => v != null);
        const rhrs = data.map(d => d.rhr_bpm).filter((v): v is number => v != null);

        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

        return JSON.stringify({
          day_count: data.length,
          lookback_days: days,
          avg_recovery_score: scores.length ? Math.round(avg(scores)!) : null,
          avg_hrv_ms: hrvs.length ? Math.round(avg(hrvs)! * 10) / 10 : null,
          stdev_hrv_ms: hrvs.length > 1 ? Math.round(stdDev(hrvs) * 10) / 10 : null,
          avg_rhr_bpm: rhrs.length ? Math.round(avg(rhrs)!) : null,
          stdev_rhr_bpm: rhrs.length > 1 ? Math.round(stdDev(rhrs) * 10) / 10 : null,
        });
      } catch (e) {
        return `Error: ${String(e)}`;
      }
    }

    case 'compare_recovery_to_baseline': {
      try {
        const recentDays = Math.min(Math.max(Number(input.recent_days) || 7, 1), 30);
        const baselineDays = Math.min(Math.max(Number(input.baseline_days) || 30, 7), 90);

        const recentSince = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const baselineSince = new Date(Date.now() - baselineDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [recentRes, baselineRes] = await Promise.all([
          supabase
            .from('recovery')
            .select('recovery_score, hrv_ms, rhr_bpm')
            .eq('user_id', userId)
            .gte('recovery_date', recentSince),
          supabase
            .from('recovery')
            .select('recovery_score, hrv_ms, rhr_bpm')
            .eq('user_id', userId)
            .gte('recovery_date', baselineSince),
        ]);

        if (recentRes.error || baselineRes.error) return 'Error fetching data for comparison.';
        if (!recentRes.data?.length) return 'No recent recovery data found.';
        if (!baselineRes.data || baselineRes.data.length < 3) return 'Not enough baseline history for comparison.';

        const avg = (arr: (number | null)[]) => {
          const valid = arr.filter((v): v is number => v != null);
          return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
        };
        const delta = (recent: number | null, base: number | null) => {
          if (recent == null || base == null) return null;
          return { delta: Math.round((recent - base) * 10) / 10, delta_pct: `${((recent - base) / base * 100).toFixed(1)}%` };
        };

        const rScores = avg(recentRes.data.map(d => d.recovery_score));
        const rHrv = avg(recentRes.data.map(d => d.hrv_ms != null ? Number(d.hrv_ms) : null));
        const rRhr = avg(recentRes.data.map(d => d.rhr_bpm));
        const bScores = avg(baselineRes.data.map(d => d.recovery_score));
        const bHrv = avg(baselineRes.data.map(d => d.hrv_ms != null ? Number(d.hrv_ms) : null));
        const bRhr = avg(baselineRes.data.map(d => d.rhr_bpm));

        return JSON.stringify({
          comparison_window: `last ${recentDays} days vs last ${baselineDays} days`,
          recovery_score: { recent_avg: rScores != null ? Math.round(rScores) : null, baseline_avg: bScores != null ? Math.round(bScores) : null, ...delta(rScores, bScores) },
          hrv_ms: { recent_avg: rHrv != null ? Math.round(rHrv * 10) / 10 : null, baseline_avg: bHrv != null ? Math.round(bHrv * 10) / 10 : null, ...delta(rHrv, bHrv) },
          rhr_bpm: { recent_avg: rRhr != null ? Math.round(rRhr) : null, baseline_avg: bRhr != null ? Math.round(bRhr) : null, ...delta(rRhr, bRhr) },
        });
      } catch (e) {
        return `Error: ${String(e)}`;
      }
    }

    case 'detect_recovery_trend': {
      try {
        const days = Math.min(Math.max(Number(input.days) || 14, 7), 90);
        const { data, error } = await supabase
          .from('recovery')
          .select('recovery_date, recovery_score, hrv_ms, rhr_bpm')
          .eq('user_id', userId)
          .order('recovery_date', { ascending: true })
          .limit(days);

        if (error) return `Error: ${error.message}`;
        if (!data || data.length < 5) return 'Not enough data for trend detection (need at least 5 days).';

        const hrvValues = data.map(d => d.hrv_ms != null ? Number(d.hrv_ms) : null).filter((v): v is number => v != null);
        const rhrValues = data.map(d => d.rhr_bpm).filter((v): v is number => v != null);
        const scoreValues = data.map(d => d.recovery_score).filter((v): v is number => v != null);

        const hrvReg = linearRegression(hrvValues);
        const rhrReg = linearRegression(rhrValues);
        const scoreReg = linearRegression(scoreValues);

        // Count consecutive red/green from the most recent end (data is ascending, so last = most recent)
        const scoresDesc = [...data].reverse().map(d => d.recovery_score);
        let consecutiveRed = 0;
        let consecutiveGreen = 0;
        for (const s of scoresDesc) {
          if (s == null) break;
          if (s <= 33) { if (consecutiveGreen > 0) break; consecutiveRed++; }
          else if (s >= 67) { if (consecutiveRed > 0) break; consecutiveGreen++; }
          else break;
        }

        return JSON.stringify({
          days_analyzed: data.length,
          hrv_trend: {
            direction: trendDirection(hrvReg.slope, 0.3),
            slope_per_day: Math.round(hrvReg.slope * 100) / 100,
            confidence: confidence(hrvReg.r2),
          },
          rhr_trend: {
            direction: trendDirection(-rhrReg.slope, 0.05),
            slope_per_day: Math.round(rhrReg.slope * 100) / 100,
            confidence: confidence(rhrReg.r2),
          },
          recovery_score_trend: {
            direction: trendDirection(scoreReg.slope, 0.5),
            slope_per_day: Math.round(scoreReg.slope * 100) / 100,
            confidence: confidence(scoreReg.r2),
          },
          consecutive_red_days: consecutiveRed,
          consecutive_green_days: consecutiveGreen,
        });
      } catch (e) {
        return `Error: ${String(e)}`;
      }
    }

    case 'correlate_recovery_with_workouts': {
      try {
        const days = Math.min(Math.max(Number(input.days) || 30, 14), 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const workoutSince = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000).toISOString();

        const [recoveryRes, workoutRes] = await Promise.all([
          supabase
            .from('recovery')
            .select('recovery_date, recovery_score')
            .eq('user_id', userId)
            .gte('recovery_date', since)
            .order('recovery_date', { ascending: true }),
          supabase
            .from('workouts')
            .select('start_time, strain')
            .eq('user_id', userId)
            .gte('start_time', workoutSince),
        ]);

        if (recoveryRes.error || workoutRes.error) return 'Error fetching data.';
        if (!recoveryRes.data?.length) return 'No recovery data in this period.';

        // Build a map of date → max strain on that date
        const strainByDate = new Map<string, number>();
        for (const w of workoutRes.data ?? []) {
          if (w.strain == null) continue;
          const date = new Date(w.start_time).toISOString().split('T')[0];
          const existing = strainByDate.get(date) ?? 0;
          strainByDate.set(date, Math.max(existing, Number(w.strain)));
        }

        const groups: Record<string, number[]> = { rest: [], low: [], medium: [], high: [] };

        for (const r of recoveryRes.data) {
          if (r.recovery_score == null) continue;
          const prevDate = new Date(new Date(r.recovery_date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const strain = strainByDate.get(prevDate);
          if (strain == null) {
            groups.rest.push(r.recovery_score);
          } else if (strain < 10) {
            groups.low.push(r.recovery_score);
          } else if (strain <= 15) {
            groups.medium.push(r.recovery_score);
          } else {
            groups.high.push(r.recovery_score);
          }
        }

        const avgGroup = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

        return JSON.stringify({
          days_analyzed: recoveryRes.data.length,
          avg_recovery_after_rest_day: avgGroup(groups.rest),
          avg_recovery_after_low_strain_lt10: avgGroup(groups.low),
          avg_recovery_after_medium_strain_10_to_15: avgGroup(groups.medium),
          avg_recovery_after_high_strain_gt15: avgGroup(groups.high),
          sample_sizes: {
            rest: groups.rest.length,
            low: groups.low.length,
            medium: groups.medium.length,
            high: groups.high.length,
          },
        });
      } catch (e) {
        return `Error: ${String(e)}`;
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
