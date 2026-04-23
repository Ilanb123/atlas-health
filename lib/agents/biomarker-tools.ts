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

export const BIOMARKER_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_latest_biomarkers',
    description:
      "Fetch the most recent lab value for each biomarker in the user's history. " +
      'Optionally filter by category or return only abnormal results. ' +
      'Use to understand the user\'s overall lab picture or spot concerning values.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional: filter to a single category.',
          enum: ['lipids', 'thyroid', 'hormones', 'metabolic', 'inflammation', 'nutrients', 'cbc', 'other'],
        },
        abnormal_only: {
          type: 'string',
          description: 'Pass "true" to return only High/Low/Unknown results. Default: "false".',
          enum: ['true', 'false'],
        },
      },
      required: [],
    },
  },
  {
    name: 'get_biomarker_history',
    description:
      'Fetch all historical values for a single named biomarker, sorted oldest-to-newest. ' +
      'Use to answer trend questions like "has my cholesterol been rising?" or "is my ferritin improving?"',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Standardized biomarker name exactly as stored, e.g. "LDL Cholesterol", "Ferritin", "TSH".',
        },
        months: {
          type: 'number',
          description: 'Lookback window in months (default 12, max 36).',
        },
      },
      required: ['name'],
    },
  },
];

type ToolInput = Record<string, unknown>;

function computeStatus(
  value: number,
  low: number | null,
  high: number | null,
  label: string | null,
): string {
  // Prefer the stored label if available and not unknown
  if (label && label !== 'unknown') {
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  if (low != null && value < low) return 'Low';
  if (high != null && value > high) return 'High';
  if (low != null || high != null) return 'Normal';
  return 'Unknown';
}

export async function executeBiomarkerTool(
  userId: string,
  toolName: string,
  input: ToolInput,
): Promise<string> {
  switch (toolName) {
    case 'get_latest_biomarkers': {
      let query = supabase
        .from('biomarkers')
        .select(
          'name, value, unit, reference_range_low, reference_range_high, reference_range_label, test_date, lab_source, category',
        )
        .eq('user_id', userId)
        .order('name', { ascending: true })
        .order('test_date', { ascending: false });

      if (input.category && typeof input.category === 'string') {
        query = query.eq('category', input.category);
      }

      const { data, error } = await query;
      if (error) return `Error fetching biomarkers: ${error.message}`;
      if (!data || data.length === 0) return 'No lab biomarkers found for this user.';

      // Dedupe: keep only the most recent row per biomarker name
      const seen = new Set<string>();
      const latest = data.filter(row => {
        if (seen.has(row.name)) return false;
        seen.add(row.name);
        return true;
      });

      const abnormalOnly = input.abnormal_only === 'true';
      const results = latest
        .map(row => {
          const val = Number(row.value);
          const status = computeStatus(
            val,
            row.reference_range_low != null ? Number(row.reference_range_low) : null,
            row.reference_range_high != null ? Number(row.reference_range_high) : null,
            row.reference_range_label,
          );
          return {
            name: row.name,
            value: val,
            unit: row.unit,
            reference_range:
              row.reference_range_low != null && row.reference_range_high != null
                ? `${row.reference_range_low}–${row.reference_range_high}`
                : null,
            status,
            test_date: row.test_date,
            lab_source: row.lab_source,
            category: row.category,
          };
        })
        .filter(r => !abnormalOnly || r.status === 'High' || r.status === 'Low' || r.status === 'Unknown');

      if (results.length === 0) {
        return abnormalOnly
          ? 'No abnormal biomarkers found — all values within reference range.'
          : 'No biomarkers found for the specified filter.';
      }

      return JSON.stringify(results);
    }

    case 'get_biomarker_history': {
      const name = String(input.name ?? '').trim();
      if (!name) return 'name parameter is required.';

      const months = Math.min(Math.max(Number(input.months) || 12, 1), 36);
      const since = new Date(
        Date.now() - months * 30.44 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split('T')[0];

      const { data, error } = await supabase
        .from('biomarkers')
        .select(
          'name, value, unit, reference_range_low, reference_range_high, reference_range_label, test_date, lab_source',
        )
        .eq('user_id', userId)
        .ilike('name', name)
        .gte('test_date', since)
        .order('test_date', { ascending: true });

      if (error) return `Error fetching biomarker history: ${error.message}`;
      if (!data || data.length === 0) {
        return `No history found for "${name}" in the last ${months} months.`;
      }

      return JSON.stringify(
        data.map(row => {
          const val = Number(row.value);
          return {
            test_date: row.test_date,
            value: val,
            unit: row.unit,
            status: computeStatus(
              val,
              row.reference_range_low != null ? Number(row.reference_range_low) : null,
              row.reference_range_high != null ? Number(row.reference_range_high) : null,
              row.reference_range_label,
            ),
            lab_source: row.lab_source,
          };
        }),
      );
    }

    default:
      return `Unknown biomarker tool: ${toolName}`;
  }
}
