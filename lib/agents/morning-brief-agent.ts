import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { SLEEP_TOOL_DEFINITIONS, executeTool } from './sleep-tools';
import { RECOVERY_TOOL_DEFINITIONS, executeRecoveryTool } from './recovery-tools';
import { executeBiomarkerTool } from './biomarker-tools';
import type { MorningBrief } from './types';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 8;

const RECOVERY_TOOL_NAMES = new Set([
  'get_latest_recovery',
  'get_recovery_history',
  'get_recovery_baseline',
  'compare_recovery_to_baseline',
  'detect_recovery_trend',
  'correlate_recovery_with_workouts',
]);

const BIOMARKER_TOOL_NAMES = new Set([
  'get_latest_biomarkers',
  'get_biomarker_history',
]);

// Combine all tools, deduplicating by name (both arrays already include biomarker + checkins tools)
const ALL_TOOL_DEFINITIONS = (() => {
  const combined = [...SLEEP_TOOL_DEFINITIONS, ...RECOVERY_TOOL_DEFINITIONS];
  const seen = new Set<string>();
  return combined.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
})();

async function executeOrchestratorTool(
  userId: string,
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  if (BIOMARKER_TOOL_NAMES.has(name)) return executeBiomarkerTool(userId, name, input);
  if (RECOVERY_TOOL_NAMES.has(name)) return executeRecoveryTool(userId, name, input);
  return executeTool(userId, name, input);
}

const SUBMIT_BRIEF_TOOL: Anthropic.Tool = {
  name: 'submit_morning_brief',
  description:
    'Submit the completed morning brief. Call this once you have gathered sufficient data from all relevant sources.',
  input_schema: {
    type: 'object' as const,
    properties: {
      whatsapp_text: {
        type: 'string',
        description:
          'The WhatsApp message body. Strictly under 450 characters. Prose only — no bullet points, no markdown. Must end with: "Full brief → {DEEP_LINK}"',
      },
      headline: {
        type: 'string',
        description: 'One sentence summarising the overall state today.',
      },
      verdict_tone: {
        type: 'string',
        enum: ['green', 'yellow', 'red'],
        description:
          'green = strong recovery/sleep, ready to push. red = depleted, protect resources. yellow = mixed or moderate.',
      },
      state_summary: {
        type: 'string',
        description: 'Two to three sentences synthesising recovery, sleep, and check-in data.',
      },
      priority_focus: {
        type: 'string',
        description: 'The single most important thing to pay attention to today.',
      },
      data_signals: {
        type: 'array',
        description: '3 to 6 key data points.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'string' },
            note:  { type: 'string', description: 'Optional directional context.' },
          },
          required: ['label', 'value'],
        },
      },
      action_today: {
        type: 'string',
        description: 'One concrete, specific action for today.',
      },
      watch_for: {
        type: 'string',
        description: 'One thing that may matter tomorrow, given today\'s patterns.',
      },
      data_sources: {
        type: 'array',
        items: { type: 'string' },
        description: 'Names of the tools called to build this brief.',
      },
      educational_disclaimer: {
        type: 'string',
        description: 'Include only if biomarker tools were used. Standard lab disclaimer.',
      },
    },
    required: [
      'whatsapp_text',
      'headline',
      'verdict_tone',
      'state_summary',
      'priority_focus',
      'data_signals',
      'action_today',
      'watch_for',
      'data_sources',
    ],
  },
};

const SYSTEM_PROMPT = `You are Atlas, a health coach for finance professionals. You generate a morning brief delivered via WhatsApp at 6:30am.

Voice: warm, direct, precise — like a trusted coach texting at 6am. Not clinical. Not robotic.

Process:
1. Pull data from sleep, recovery, labs, and daily check-ins using the available tools.
2. Synthesise across all domains into ONE coherent story — not four separate reports.
3. Identify the single thing that matters most today.
4. Give one concrete action.

whatsapp_text rules (strictly enforced):
- Under 450 characters. Count carefully before submitting.
- Lead with state: e.g. "Recovery 82% (green), HRV +11% vs baseline"
- One observation and one directive — that is all.
- No lists. No bullet points. No markdown. Prose only.
- Final line must be exactly: "Full brief → {DEEP_LINK}"

Lab/biomarker rules (if you use get_latest_biomarkers or get_biomarker_history):
- Use hedged educational language: "is associated with", "is commonly seen in", "may reflect" — not "indicates", "means", "causes".
- Never name specific conditions or deficiencies.
- Never imply causation. Use correlation language only.
- Do not recommend specific supplements or doses.
- Set educational_disclaimer in the output.

When you have gathered enough data, call submit_morning_brief. You MUST call this tool — never output plain text as your final response.`;

export interface OrchestratorResult {
  brief: MorningBrief;
  toolsCalled: string[];
  latencyMs: number;
  tokensUsed: { input: number; output: number; total: number };
}

export async function generateMorningBrief(userId: string): Promise<OrchestratorResult> {
  const startMs = Date.now();
  let tokensInput = 0;
  let tokensOutput = 0;
  const toolsCalled: string[] = [];

  const tools: Anthropic.Tool[] = [
    ...(ALL_TOOL_DEFINITIONS as Anthropic.Tool[]),
    SUBMIT_BRIEF_TOOL,
  ];

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content:
        'Generate my morning brief. Pull data from sleep, recovery, recent check-ins, and any relevant labs. Synthesise into a single brief.',
    },
  ];

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    tokensInput += response.usage.input_tokens;
    tokensOutput += response.usage.output_tokens;

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'submit_morning_brief') {
        return {
          brief: block.input as MorningBrief,
          toolsCalled,
          latencyMs: Date.now() - startMs,
          tokensUsed: { input: tokensInput, output: tokensOutput, total: tokensInput + tokensOutput },
        };
      }
    }

    if (response.stop_reason === 'end_turn' || response.stop_reason !== 'tool_use') break;

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      toolsCalled.push(block.name);
      const result = await executeOrchestratorTool(userId, block.name, block.input as Record<string, unknown>);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  // Nudge
  const nudge = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools,
    tool_choice: { type: 'any' },
    messages: [
      ...messages,
      { role: 'user', content: 'You have enough data. Call submit_morning_brief now.' },
    ],
  });

  tokensInput += nudge.usage.input_tokens;
  tokensOutput += nudge.usage.output_tokens;

  for (const block of nudge.content) {
    if (block.type === 'tool_use' && block.name === 'submit_morning_brief') {
      return {
        brief: block.input as MorningBrief,
        toolsCalled,
        latencyMs: Date.now() - startMs,
        tokensUsed: { input: tokensInput, output: tokensOutput, total: tokensInput + tokensOutput },
      };
    }
  }

  throw new Error('Morning brief agent failed to call submit_morning_brief after nudge');
}
