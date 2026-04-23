import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { SLEEP_TOOL_DEFINITIONS, executeTool } from './sleep-tools';
import { RECOVERY_TOOL_DEFINITIONS, executeRecoveryTool } from './recovery-tools';
import { executeBiomarkerTool } from './biomarker-tools';
import type { ConversationMessage } from '../whatsapp-conversation';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 6;

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

const ALL_TOOL_DEFINITIONS = (() => {
  const combined = [...SLEEP_TOOL_DEFINITIONS, ...RECOVERY_TOOL_DEFINITIONS];
  const seen = new Set<string>();
  return combined.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });
})();

async function executeTool_(userId: string, name: string, input: Record<string, unknown>): Promise<string> {
  if (BIOMARKER_TOOL_NAMES.has(name)) return executeBiomarkerTool(userId, name, input);
  if (RECOVERY_TOOL_NAMES.has(name)) return executeRecoveryTool(userId, name, input);
  return executeTool(userId, name, input);
}

const SYSTEM_PROMPT = `You are Atlas, a health coach for finance professionals. The user is replying to their morning brief or continuing a coaching conversation via WhatsApp.

You have full access to their WHOOP data (sleep, recovery, workouts), lab results, and daily check-ins. Use the tools proactively to pull relevant data before answering — don't guess when you can look it up.

Voice: direct, warm, precise. Like a trusted coach texting back. No fluff. No filler. Get to the point.

Format rules:
- Keep responses under 500 characters when possible. Longer only when genuinely needed.
- No markdown tables. No bullet lists (use line breaks if you need to enumerate).
- *Bold* (single asterisks) is fine for emphasis — that's WhatsApp syntax.
- One clear answer or recommendation per reply. Don't dump everything you know.

Lab/biomarker rules (if you use get_latest_biomarkers or get_biomarker_history):
- Use hedged educational language: "is associated with", "may reflect", "is commonly seen in" — not "indicates", "means", "causes".
- Never name specific conditions or deficiencies.
- Never imply causation. Correlation language only.
- Do not recommend specific supplements or doses.
- Always add: "These are educational observations — discuss with your physician before acting on lab data."

When the question is vague (e.g. "how am I doing?"), pull today's recovery and sleep data and give a concise state-of-play.`;

export interface CoachResponse {
  reply_text: string;
  tools_called: string[];
  tokens_used: number;
  latency_ms: number;
}

export async function runCoachAgent(
  message: string,
  conversationHistory: ConversationMessage[],
  userId: string,
): Promise<CoachResponse> {
  const startMs = Date.now();
  let tokensTotal = 0;
  const toolsCalled: string[] = [];

  const tools = ALL_TOOL_DEFINITIONS as Anthropic.Tool[];

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  let replyText = "I'm having trouble pulling your data right now. Try again in a moment.";

  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    tokensTotal += response.usage.input_tokens + response.usage.output_tokens;

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      if (textBlock && textBlock.type === 'text') replyText = textBlock.text;
      break;
    }

    if (response.stop_reason !== 'tool_use') break;

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      toolsCalled.push(block.name);
      const result = await executeTool_(userId, block.name, block.input as Record<string, unknown>);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    reply_text: replyText,
    tools_called: toolsCalled,
    tokens_used: tokensTotal,
    latency_ms: Date.now() - startMs,
  };
}
