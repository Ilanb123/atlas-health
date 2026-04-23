import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { SLEEP_TOOL_DEFINITIONS, executeTool } from './sleep-tools';
import { SLEEP_KNOWLEDGE } from './sleep-knowledge';
import { logAgentInteraction, logRecommendation, type TokenUsage } from '../instrumentation';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 5;

export interface KeyMetric {
  label: string;
  value: string;
  note?: string;
}

export interface ReportSection {
  heading: string;
  body: string;
}

export interface AgentReport {
  verdict: string;
  verdict_tone: 'green' | 'yellow' | 'red';
  key_metrics: KeyMetric[];
  sections: ReportSection[];
  action: string;
  educational_disclaimer?: string;
}

export interface AgentResult {
  report: AgentReport;
  tool_calls_used: string[];
}

interface CoreResult {
  result: AgentResult;
  tokensUsed: TokenUsage;
}

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'Deliver your final structured report to the user. You MUST call this tool to submit your answer — never output plain text as your final response.',
  input_schema: {
    type: 'object' as const,
    properties: {
      verdict: {
        type: 'string',
        description: 'One sentence summarizing the key finding or assessment.',
      },
      verdict_tone: {
        type: 'string',
        enum: ['green', 'yellow', 'red'],
        description: 'green = good/above baseline, red = poor/concerning, yellow = mixed or within normal range.',
      },
      key_metrics: {
        type: 'array',
        description: '3-6 of the most important data points from the retrieved data, formatted as display cards.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Short metric name, e.g. "Sleep Performance"' },
            value: { type: 'string', description: 'The value with unit, e.g. "82%" or "1h 24m"' },
            note: { type: 'string', description: 'Optional context, e.g. "↑ 8% vs baseline" or "below 85% threshold"' },
          },
          required: ['label', 'value'],
        },
      },
      sections: {
        type: 'array',
        description: '1-3 analysis sections in prose. Each has a short heading and 2-4 sentences of body text. No bullet points.',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            body: { type: 'string', description: 'Prose only. 2-4 sentences. No bullet points or markdown within this field.' },
          },
          required: ['heading', 'body'],
        },
      },
      action: {
        type: 'string',
        description: 'One specific, concrete intervention the user should take tonight or tomorrow morning. Not a list — one thing.',
      },
    },
    required: ['verdict', 'verdict_tone', 'key_metrics', 'sections', 'action'],
  },
};

function buildSystemPrompt(): string {
  const knowledgeText = SLEEP_KNOWLEDGE
    .map(e => `[${e.category}] ${e.fact}`)
    .join('\n');

  return `You are the Atlas Health Sleep Coach — a personalized, evidence-based sleep advisor for finance professionals.

You have access to the user's real WHOOP biometric data through tools. Always retrieve actual data before answering.

Your approach:
1. Call data tools first — never guess at numbers. You also have access to the user's daily subjective check-ins via get_recent_checkins (energy, mood, stress, cognitive clarity, digestion, symptoms, notable events). This is critical context — biometric data alone misses the user's lived experience. Always check recent subjective data when answering questions about how they feel, why they feel a certain way, or what might be driving a pattern. When subjective state contradicts biometric state (e.g. high recovery score but reports low energy), explicitly acknowledge this and probe likely causes from notable_events or symptoms.
2. Compare against the user's personal baseline, not population norms.
3. Translate findings into finance-specific decisions: cognitive readiness, decision quality, when to protect focus time.
4. Be direct and data-first.
5. When you have gathered sufficient data, call submit_report to deliver your structured answer. You MUST call submit_report — never output plain text as your final response.
6. In section bodies, write in prose (2-4 sentences). No bullet points within section bodies.
7. verdict_tone: green if results are good or above baseline, red if poor or significantly below, yellow if mixed or within normal range.
8. key_metrics: include 3-6 of the most significant numbers from the data, with notes showing direction vs baseline where relevant.

Sleep science knowledge base:
${knowledgeText}

You also have access to lab biomarkers via get_latest_biomarkers and get_biomarker_history. Use them to provide educational context when a biomarker is relevant to the biometric trend being asked about — for example, ferritin levels are commonly discussed in the context of fatigue and sleep quality; Vitamin D is commonly discussed in the context of sleep architecture; hsCRP is associated with systemic inflammation patterns. Do not force labs into every answer. When you do reference labs, follow these rules:
- Use hedged, educational language: prefer "is associated with", "is commonly seen in", "may reflect" over "indicates", "means", "suggests".
- Never name specific conditions or deficiencies (not "B12 deficiency", "insulin resistance", "viral reactivation"). Describe patterns instead ("values in this range are often discussed in the context of ...").
- Never imply causation between a biomarker and a symptom the user reports. Use correlation language ("this pattern often appears alongside", not "this causes").
- Never use phrases like "classic finding", "textbook presentation", or "points to" — these read as diagnostic.
- Do not recommend specific supplements, doses, or protocols in response to lab values. General lifestyle direction (sleep hygiene, training load management, stress reduction) is fine.
- Always recommend discussing specific biomarker findings with their physician before making any interventions.

When citing numbers, always include the date or time period.`;
}

const FALLBACK_REPORT: AgentReport = {
  verdict: 'Could not complete analysis — please try again.',
  verdict_tone: 'yellow',
  key_metrics: [],
  sections: [{ heading: 'Status', body: 'The analysis did not complete successfully. This may be a temporary issue.' }],
  action: 'Try asking again in a moment.',
};

async function runSleepAgentCore(userId: string, question: string): Promise<CoreResult> {
  const systemPrompt = buildSystemPrompt();
  const toolCallsUsed: string[] = [];
  let tokensInput = 0;
  let tokensOutput = 0;

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: question },
  ];

  const tools: Anthropic.Tool[] = [
    ...(SLEEP_TOOL_DEFINITIONS as Anthropic.Tool[]),
    SUBMIT_REPORT_TOOL,
  ];

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    tokensInput += response.usage.input_tokens;
    tokensOutput += response.usage.output_tokens;

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'submit_report') {
        return {
          result: { report: block.input as AgentReport, tool_calls_used: toolCallsUsed },
          tokensUsed: { input: tokensInput, output: tokensOutput, total: tokensInput + tokensOutput },
        };
      }
    }

    if (response.stop_reason === 'end_turn' || response.stop_reason !== 'tool_use') {
      break;
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      toolCallsUsed.push(block.name);
      const result = await executeTool(userId, block.name, block.input as Record<string, unknown>);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Max rounds hit without submit_report — nudge for one final call
  const nudge = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    tool_choice: { type: 'any' },
    messages: [
      ...messages,
      { role: 'user', content: 'You have gathered enough data. Call submit_report now with your findings.' },
    ],
  });

  tokensInput += nudge.usage.input_tokens;
  tokensOutput += nudge.usage.output_tokens;

  for (const block of nudge.content) {
    if (block.type === 'tool_use' && block.name === 'submit_report') {
      return {
        result: { report: block.input as AgentReport, tool_calls_used: toolCallsUsed },
        tokensUsed: { input: tokensInput, output: tokensOutput, total: tokensInput + tokensOutput },
      };
    }
  }

  return {
    result: { report: FALLBACK_REPORT, tool_calls_used: toolCallsUsed },
    tokensUsed: { input: tokensInput, output: tokensOutput, total: tokensInput + tokensOutput },
  };
}

export async function askSleepAgent(userId: string, question: string): Promise<AgentResult> {
  const startMs = Date.now();
  const snapshotAt = new Date().toISOString();

  const { result, tokensUsed } = await runSleepAgentCore(userId, question);
  const latencyMs = Date.now() - startMs;

  const labToolsUsed = result.tool_calls_used.some(
    t => t === 'get_latest_biomarkers' || t === 'get_biomarker_history',
  );
  if (labToolsUsed) {
    result.report.educational_disclaimer =
      'This analysis is educational and pattern-based. It is not medical advice, not a diagnosis, and not a substitute for your physician. Discuss specific findings and any intended interventions with a qualified medical professional.';
  }

  logAgentInteraction({
    userId,
    agentType: 'sleep',
    userQuestion: question,
    toolsCalled: result.tool_calls_used,
    responseReport: result.report as unknown as Record<string, unknown>,
    latencyMs,
    tokensUsed,
  }).catch(e => console.error('[instrumentation] agent_interaction:', e));

  logRecommendation({
    userId,
    sourceAgent: 'sleep',
    recommendationText: result.report.action,
    dataSnapshot: result.report as unknown as Record<string, unknown>,
    dataSnapshotAt: snapshotAt,
  }).catch(e => console.error('[instrumentation] recommendation:', e));

  return result;
}
