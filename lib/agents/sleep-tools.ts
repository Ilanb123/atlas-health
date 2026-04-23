import 'server-only';
import { supabase } from '../supabase';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export const SLEEP_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_latest_sleep',
    description: 'Fetch the most recent sleep record for the user, including sleep performance, time in bed, REM, deep sleep, efficiency, and respiratory rate.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_sleep_history',
    description: 'Fetch recent sleep records for trend analysis. Returns up to N nights of data sorted newest first.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of recent sleep records to retrieve (1-30)',
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_sleep_baseline',
    description: 'Calculate the user\'s 30-day average sleep metrics as a personal baseline for comparison.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'compare_to_baseline',
    description: 'Compare the most recent sleep night against the user\'s 30-day baseline and return percentage deviations for each metric.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'detect_sleep_pattern',
    description: 'Analyze the last N nights to detect patterns such as consistent REM deficit, trending efficiency, or deep sleep variability.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of recent nights to analyze (7-30)',
        },
        metric: {
          type: 'string',
          description: 'Which metric to analyze for patterns',
          enum: ['sleep_performance_pct', 'rem_minutes', 'deep_minutes', 'efficiency_pct', 'time_in_bed_minutes'],
        },
      },
      required: ['days', 'metric'],
    },
  },
  {
    name: 'get_recent_checkins',
    description: "Fetch the user's recent daily subjective check-ins (energy, mood, stress, cognitive clarity, digestion, symptoms, notable events). Use this to understand how the user is feeling and to correlate subjective state with biometric data.",
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of recent days to retrieve (1-30)',
        },
      },
      required: ['days'],
    },
  },
  {
    name: 'get_recent_hrv_recovery',
    description: 'Fetch recent HRV and recovery scores to correlate with sleep quality. Returns recovery data with HRV, RHR, and SpO2.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Number of recent recovery records to retrieve (1-30)',
        },
      },
      required: ['days'],
    },
  },
];

type ToolInput = Record<string, unknown>;

export async function executeTool(userId: string, toolName: string, input: ToolInput): Promise<string> {
  switch (toolName) {
    case 'get_latest_sleep': {
      const { data, error } = await supabase
        .from('sleep')
        .select('start_time, sleep_performance_pct, time_in_bed_minutes, rem_minutes, deep_minutes, efficiency_pct, respiratory_rate')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return `Error fetching sleep data: ${error.message}`;
      if (!data) return 'No sleep data found for this user yet.';

      return JSON.stringify({
        date: new Date(data.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        sleep_performance_pct: data.sleep_performance_pct,
        time_in_bed_minutes: data.time_in_bed_minutes,
        rem_minutes: data.rem_minutes,
        deep_minutes: data.deep_minutes,
        efficiency_pct: data.efficiency_pct,
        respiratory_rate: data.respiratory_rate,
      });
    }

    case 'get_sleep_history': {
      const days = Math.min(Math.max(Number(input.days) || 7, 1), 30);
      const { data, error } = await supabase
        .from('sleep')
        .select('start_time, sleep_performance_pct, time_in_bed_minutes, rem_minutes, deep_minutes, efficiency_pct')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(days);

      if (error) return `Error fetching sleep history: ${error.message}`;
      if (!data || data.length === 0) return 'No sleep history found.';

      return JSON.stringify(data.map(d => ({
        date: new Date(d.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        performance: d.sleep_performance_pct,
        time_in_bed_minutes: d.time_in_bed_minutes,
        rem_minutes: d.rem_minutes,
        deep_minutes: d.deep_minutes,
        efficiency_pct: d.efficiency_pct,
      })));
    }

    case 'get_sleep_baseline': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('sleep')
        .select('sleep_performance_pct, time_in_bed_minutes, rem_minutes, deep_minutes, efficiency_pct')
        .eq('user_id', userId)
        .gte('start_time', thirtyDaysAgo);

      if (error) return `Error computing baseline: ${error.message}`;
      if (!data || data.length < 3) return 'Not enough sleep data to compute a baseline (need at least 3 nights).';

      const avg = (arr: (number | null)[]): number => {
        const valid = arr.filter((v): v is number => v != null);
        return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
      };

      return JSON.stringify({
        based_on_nights: data.length,
        avg_sleep_performance_pct: avg(data.map(d => d.sleep_performance_pct ? Number(d.sleep_performance_pct) : null)),
        avg_time_in_bed_minutes: avg(data.map(d => d.time_in_bed_minutes)),
        avg_rem_minutes: avg(data.map(d => d.rem_minutes)),
        avg_deep_minutes: avg(data.map(d => d.deep_minutes)),
        avg_efficiency_pct: avg(data.map(d => d.efficiency_pct ? Number(d.efficiency_pct) : null)),
      });
    }

    case 'compare_to_baseline': {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [latestRes, historyRes] = await Promise.all([
        supabase
          .from('sleep')
          .select('start_time, sleep_performance_pct, time_in_bed_minutes, rem_minutes, deep_minutes, efficiency_pct')
          .eq('user_id', userId)
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('sleep')
          .select('sleep_performance_pct, time_in_bed_minutes, rem_minutes, deep_minutes, efficiency_pct')
          .eq('user_id', userId)
          .gte('start_time', thirtyDaysAgo),
      ]);

      if (latestRes.error || historyRes.error) return 'Error fetching data for comparison.';
      if (!latestRes.data) return 'No recent sleep data found.';
      if (!historyRes.data || historyRes.data.length < 3) return 'Not enough history for baseline comparison.';

      const avg = (arr: (number | null)[]): number => {
        const valid = arr.filter((v): v is number => v != null);
        return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
      };
      const pctDiff = (current: number | null, base: number): string => {
        if (current == null || base === 0) return 'N/A';
        return `${((current - base) / base * 100).toFixed(1)}%`;
      };

      const latest = latestRes.data;
      const history = historyRes.data;
      const baseline = {
        sleep_performance_pct: avg(history.map(d => d.sleep_performance_pct ? Number(d.sleep_performance_pct) : null)),
        time_in_bed_minutes: avg(history.map(d => d.time_in_bed_minutes)),
        rem_minutes: avg(history.map(d => d.rem_minutes)),
        deep_minutes: avg(history.map(d => d.deep_minutes)),
        efficiency_pct: avg(history.map(d => d.efficiency_pct ? Number(d.efficiency_pct) : null)),
      };

      return JSON.stringify({
        night: new Date(latest.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        comparisons: {
          sleep_performance: {
            last_night: latest.sleep_performance_pct,
            baseline: Math.round(baseline.sleep_performance_pct),
            vs_baseline: pctDiff(latest.sleep_performance_pct ? Number(latest.sleep_performance_pct) : null, baseline.sleep_performance_pct),
          },
          time_in_bed_minutes: {
            last_night: latest.time_in_bed_minutes,
            baseline: Math.round(baseline.time_in_bed_minutes),
            vs_baseline: pctDiff(latest.time_in_bed_minutes, baseline.time_in_bed_minutes),
          },
          rem_minutes: {
            last_night: latest.rem_minutes,
            baseline: Math.round(baseline.rem_minutes),
            vs_baseline: pctDiff(latest.rem_minutes, baseline.rem_minutes),
          },
          deep_minutes: {
            last_night: latest.deep_minutes,
            baseline: Math.round(baseline.deep_minutes),
            vs_baseline: pctDiff(latest.deep_minutes, baseline.deep_minutes),
          },
          efficiency: {
            last_night: latest.efficiency_pct,
            baseline: Math.round(baseline.efficiency_pct),
            vs_baseline: pctDiff(latest.efficiency_pct ? Number(latest.efficiency_pct) : null, baseline.efficiency_pct),
          },
        },
      });
    }

    case 'detect_sleep_pattern': {
      const days = Math.min(Math.max(Number(input.days) || 14, 7), 30);
      const metric = String(input.metric || 'sleep_performance_pct');
      const validMetrics = ['sleep_performance_pct', 'rem_minutes', 'deep_minutes', 'efficiency_pct', 'time_in_bed_minutes'];
      if (!validMetrics.includes(metric)) return `Invalid metric. Choose from: ${validMetrics.join(', ')}`;

      const { data, error } = await supabase
        .from('sleep')
        .select('start_time, sleep_performance_pct, rem_minutes, deep_minutes, efficiency_pct, time_in_bed_minutes')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .limit(days);

      if (error) return `Error fetching data: ${error.message}`;
      if (!data || data.length < 5) return 'Not enough data points for pattern detection.';

      type MetricKey = 'sleep_performance_pct' | 'rem_minutes' | 'deep_minutes' | 'efficiency_pct' | 'time_in_bed_minutes';
      const values = data
        .map(d => ({
          date: new Date(d.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: d[metric as MetricKey] as number | null,
        }))
        .filter(d => d.value != null);

      const nums = values.map(v => Number(v.value));
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const stdDev = Math.sqrt(nums.map(n => Math.pow(n - mean, 2)).reduce((a, b) => a + b, 0) / nums.length);
      const trend = nums[0] > nums[nums.length - 1] ? 'improving' : 'declining';
      const recentAvg = nums.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

      return JSON.stringify({
        metric,
        days_analyzed: values.length,
        mean: Math.round(mean),
        std_dev: Math.round(stdDev),
        trend_direction: trend,
        recent_3_night_avg: Math.round(recentAvg),
        vs_period_mean_pct: `${((recentAvg - mean) / mean * 100).toFixed(1)}%`,
        data_points: values,
      });
    }

    case 'get_recent_checkins': {
      const days = Math.min(Math.max(Number(input.days) || 7, 1), 30);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date, energy_1to10, mood_1to10, stress_1to10, cognitive_clarity_1to10, digestion, symptoms, notable_events')
        .eq('user_id', userId)
        .gte('date', since)
        .order('date', { ascending: false });

      if (error) return `Error fetching check-ins: ${error.message}`;
      if (!data || data.length === 0) return 'No daily check-ins found for this period.';
      return JSON.stringify(data);
    }

    case 'get_recent_hrv_recovery': {
      const days = Math.min(Math.max(Number(input.days) || 7, 1), 30);
      const { data, error } = await supabase
        .from('recovery')
        .select('recovery_date, recovery_score, hrv_ms, rhr_bpm, spo2_pct')
        .eq('user_id', userId)
        .order('recovery_date', { ascending: false })
        .limit(days);

      if (error) return `Error fetching recovery data: ${error.message}`;
      if (!data || data.length === 0) return 'No recovery data found.';

      return JSON.stringify(data.map(d => ({
        date: d.recovery_date,
        recovery_score: d.recovery_score,
        hrv_ms: d.hrv_ms,
        rhr_bpm: d.rhr_bpm,
        spo2_pct: d.spo2_pct,
      })));
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
