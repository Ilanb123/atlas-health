import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { RECOVERY_TOOL_DEFINITIONS, executeRecoveryTool } from './recovery-tools';
import { SLEEP_TOOL_DEFINITIONS, executeTool } from './sleep-tools';
import type { ConversationMessage } from '../whatsapp-conversation';
import type { AgentReply } from './types';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 5;

// Note: no dedicated workout tools exist in the codebase. Using recovery tools
// (correlate_recovery_with_workouts queries the workouts table) plus sleep and
// check-ins to inform training decisions.
const WORKOUT_TOOL_NAMES = new Set([
  'get_latest_recovery',
  'get_recovery_history',
  'get_recovery_baseline',
  'correlate_recovery_with_workouts',
  'get_latest_sleep',
  'get_sleep_history',
  'get_recent_checkins',
]);

const RECOVERY_NAMES = new Set([
  'get_latest_recovery',
  'get_recovery_history',
  'get_recovery_baseline',
  'correlate_recovery_with_workouts',
]);

const WORKOUT_TOOLS: Anthropic.Tool[] = [
  ...RECOVERY_TOOL_DEFINITIONS.filter(t => WORKOUT_TOOL_NAMES.has(t.name)),
  ...SLEEP_TOOL_DEFINITIONS.filter(t => WORKOUT_TOOL_NAMES.has(t.name)),
].reduce<Anthropic.Tool[]>((acc, t) => {
  if (!acc.find(a => a.name === t.name)) acc.push(t as Anthropic.Tool);
  return acc;
}, []);

async function executeTool_(userId: string, name: string, input: Record<string, unknown>): Promise<string> {
  if (RECOVERY_NAMES.has(name)) return executeRecoveryTool(userId, name, input);
  return executeTool(userId, name, input);
}

const SYSTEM_PROMPT = `You are Atlas, specialized in training and workout coaching for finance professionals.

You have access to the user's WHOOP recovery scores, HRV, sleep data, workout strain history, and daily check-ins. Always pull the data before making training recommendations — the answer lives in their numbers.

Voice: direct, data-driven, confident. No motivation-poster language. If their recovery is 38%, say so and say what that means for today's session.

Topics you're expert on:
- "Should I train today?" → check recovery score + HRV + sleep; give a clear yes/modify/no
- "How hard should I go?" → recommend strain target based on recovery zone
- "Is this overtraining?" → use correlate_recovery_with_workouts and trend data
- Workout timing around market hours and stress (cortisol + recovery interaction)
- Deload decisions based on consecutive red days
- Return-to-training after illness or high-stress periods

Strain guidance (WHOOP scale 0-21):
- Recovery green (67-100): full session, strain 14-18 appropriate
- Recovery yellow (34-66): moderate session, strain 10-14
- Recovery red (0-33): active recovery only, strain <8

Format rules:
- Under 500 characters when possible.
- *Bold* recovery score and strain targets for clarity.
- Lead with the data point, then the recommendation.
- One clear recommendation per reply.

Safety rules:
- No injury diagnosis or treatment advice.
- Do not make specific claims about exercise physiology beyond well-established consensus.
- For pain or injury questions: "That's a clinical question — see a physio or sports medicine doctor."`;

export async function runWorkoutAgent(
  message: string,
  conversationHistory: ConversationMessage[],
  userId: string,
): Promise<AgentReply> {
  const startMs = Date.now();
  let tokensTotal = 0;
  const toolsCalled: string[] = [];

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
      tools: WORKOUT_TOOLS,
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
      if (!WORKOUT_TOOL_NAMES.has(block.name)) continue;
      toolsCalled.push(block.name);
      const result = await executeTool_(userId, block.name, block.input as Record<string, unknown>);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }
    if (toolResults.length === 0) break;
    messages.push({ role: 'user', content: toolResults });
  }

  return { reply_text: replyText, tools_called: toolsCalled, tokens_used: tokensTotal, latency_ms: Date.now() - startMs };
}
