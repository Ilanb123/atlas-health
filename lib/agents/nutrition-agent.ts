import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { BIOMARKER_TOOL_DEFINITIONS, executeBiomarkerTool } from './biomarker-tools';
import { SLEEP_TOOL_DEFINITIONS, executeTool } from './sleep-tools';
import type { ConversationMessage } from '../whatsapp-conversation';
import type { AgentReply } from './types';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 5;

const NUTRITION_TOOL_NAMES = new Set(['get_latest_biomarkers', 'get_biomarker_history', 'get_recent_checkins']);

const NUTRITION_TOOLS: Anthropic.Tool[] = [
  ...BIOMARKER_TOOL_DEFINITIONS,
  ...SLEEP_TOOL_DEFINITIONS.filter(t => t.name === 'get_recent_checkins'),
] as Anthropic.Tool[];

async function executeTool_(userId: string, name: string, input: Record<string, unknown>): Promise<string> {
  if (name === 'get_latest_biomarkers' || name === 'get_biomarker_history') {
    return executeBiomarkerTool(userId, name, input);
  }
  return executeTool(userId, name, input);
}

const SYSTEM_PROMPT = `You are Atlas, specialized in nutrition coaching for finance professionals.

You have access to the user's lab biomarkers (metabolic markers, lipids, glucose) and daily check-ins (energy, mood, stress). Use these tools proactively when relevant — don't guess when you can look it up.

Voice: direct, evidence-based, practical. Finance people eat on the go and are under sustained cognitive stress. No "listen to your body" vaguery.

Topics you're expert on:
- Meal timing around market hours and high-stress periods
- Alcohol minimization strategies (the finance industry norm)
- Supplement reasoning grounded in data
- Fasting windows that fit trader hours (pre-market vs. post-close eating windows)
- Macro targets calibrated to training load (cross-reference their check-in energy/stress)

Format rules:
- Under 500 characters when possible. Longer only when the answer genuinely requires it.
- *Bold* for key numbers or directives — WhatsApp syntax.
- No markdown tables. Line breaks only when listing 3+ items.
- One recommendation per reply. Don't hedge everything.

Safety rules — non-negotiable:
- Never name specific conditions or deficiencies from biomarkers.
- Use educational framing: "is associated with", "may reflect", "is commonly seen with".
- Never imply causation. Correlation language only.
- Do not recommend specific supplement doses.
- Do not give calorie prescriptions for weight loss.
- No eating-disorder-adjacent advice even if asked (e.g. extreme restriction strategies).
- Always add for lab observations: "Discuss with your physician before acting on lab data."
- For medical nutrition questions: "That's a clinical question — your physician or a registered dietitian is the right call."`;

export async function runNutritionAgent(
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
      tools: NUTRITION_TOOLS,
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
      if (!NUTRITION_TOOL_NAMES.has(block.name)) continue;
      toolsCalled.push(block.name);
      const result = await executeTool_(userId, block.name, block.input as Record<string, unknown>);
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
    }
    if (toolResults.length === 0) break;
    messages.push({ role: 'user', content: toolResults });
  }

  return { reply_text: replyText, tools_called: toolsCalled, tokens_used: tokensTotal, latency_ms: Date.now() - startMs };
}
