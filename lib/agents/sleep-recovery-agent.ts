import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { SLEEP_TOOL_DEFINITIONS, executeTool } from './sleep-tools';
import { RECOVERY_TOOL_DEFINITIONS, executeRecoveryTool } from './recovery-tools';
import { executeBiomarkerTool } from './biomarker-tools';
import type { ConversationMessage } from '../whatsapp-conversation';
import type { AgentReply } from './types';

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

const BIOMARKER_TOOL_NAMES = new Set(['get_latest_biomarkers', 'get_biomarker_history']);

const ALL_TOOLS: Anthropic.Tool[] = (() => {
  const combined = [...SLEEP_TOOL_DEFINITIONS, ...RECOVERY_TOOL_DEFINITIONS];
  const seen = new Set<string>();
  return combined.filter(t => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  }) as Anthropic.Tool[];
})();

async function executeTool_(userId: string, name: string, input: Record<string, unknown>): Promise<string> {
  if (BIOMARKER_TOOL_NAMES.has(name)) return executeBiomarkerTool(userId, name, input);
  if (RECOVERY_TOOL_NAMES.has(name)) return executeRecoveryTool(userId, name, input);
  return executeTool(userId, name, input);
}

const SYSTEM_PROMPT = `You are Atlas, specialized in sleep and recovery coaching for finance professionals.

You have full access to the user's WHOOP sleep data (performance, REM, deep, efficiency), recovery scores (HRV, RHR, SpO2), trend analysis, and daily check-ins. Always pull the data before answering — your recommendations should be grounded in their numbers, not generalities.

Voice: precise, direct, calm. Sleep is where most finance professionals have the biggest leverage. Take it seriously without being alarmist.

Topics you're expert on:
- Sleep quality analysis (REM deficit, deep sleep, efficiency, respiratory rate)
- HRV trends and what they signal about autonomic recovery
- Sleep timing and schedule optimization around market hours
- Stress-recovery balance (high-stress weeks, travel, late nights)
- Nap protocols for high-cognitive-load days
- Pre-sleep routine recommendations grounded in circadian biology
- "Why did I sleep badly?" → pull data, identify the most likely contributors

Format rules:
- Under 500 characters when possible. Longer when the answer needs it.
- *Bold* key metrics (HRV, recovery score, sleep performance).
- Lead with data, then interpretation, then one clear action.
- No lengthy explanations of basic sleep science — assume they've heard it.

Lab/biomarker rules (if biomarker tools used):
- Educational framing only: "is associated with", "may reflect", "is commonly seen in".
- Never name conditions or imply causation.
- No supplement dose recommendations.
- Always add: "Discuss with your physician before acting on lab data."`;

export async function runSleepRecoveryAgent(
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
      tools: ALL_TOOLS,
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
    if (toolResults.length === 0) break;
    messages.push({ role: 'user', content: toolResults });
  }

  return { reply_text: replyText, tools_called: toolsCalled, tokens_used: tokensTotal, latency_ms: Date.now() - startMs };
}
