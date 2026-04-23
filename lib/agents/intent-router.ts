import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import type { ConversationMessage } from '../whatsapp-conversation';

const MODEL = 'claude-haiku-4-5-20251001';

export type Intent = 'nutrition' | 'workout' | 'sleep_recovery' | 'coach';

export interface IntentResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
  latency_ms: number;
  tokens_used: number;
}

const CLASSIFY_TOOL: Anthropic.Tool = {
  name: 'classify_intent',
  description: 'Classify the intent of the user message into one of the defined categories.',
  input_schema: {
    type: 'object' as const,
    properties: {
      intent: {
        type: 'string',
        enum: ['nutrition', 'workout', 'sleep_recovery', 'coach'],
        description: 'The primary intent category.',
      },
      confidence: {
        type: 'number',
        description: 'Confidence score from 0.0 to 1.0.',
      },
      reasoning: {
        type: 'string',
        description: 'One sentence explaining the classification.',
      },
    },
    required: ['intent', 'confidence', 'reasoning'],
  },
};

const SYSTEM_PROMPT = `You classify WhatsApp messages to a health coaching assistant into one of four intents.

Categories:
- "nutrition" — food, meals, fasting, hydration, macros, calories, alcohol (as nutrition), supplements, eating timing
- "workout" — training decisions, strain, exercise choices, gym, today's workout, fitness load
- "sleep_recovery" — sleep quality, HRV, naps, stress recovery, fatigue, resting heart rate
- "coach" — ambiguous, multi-domain, general check-ins ("how am I doing?", "what should I focus on?"), or anything that doesn't clearly fit one domain

Use recent conversation context to resolve follow-ups. "What about dinner?" after a nutrition discussion → nutrition. "Should I push through?" after a workout question → workout.

Assign high confidence (0.8+) only when the intent is unambiguous. Use 0.5–0.7 for plausible but mixed signals. Return "coach" when genuinely unclear.`;

export async function classifyIntent(
  message: string,
  recentHistory: ConversationMessage[],
): Promise<IntentResult> {
  const startMs = Date.now();

  const contextLines = recentHistory
    .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');

  const userContent = contextLines
    ? `Recent conversation:\n${contextLines}\n\nNew message: ${message}`
    : `Message: ${message}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: 'tool', name: 'classify_intent' },
      messages: [{ role: 'user', content: userContent }],
    });

    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return { intent: 'coach', confidence: 0, reasoning: 'no_tool_call', latency_ms: Date.now() - startMs, tokens_used: response.usage.input_tokens + response.usage.output_tokens };
    }

    const input = toolBlock.input as { intent: Intent; confidence: number; reasoning: string };
    return {
      intent: input.intent,
      confidence: input.confidence,
      reasoning: input.reasoning,
      latency_ms: Date.now() - startMs,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    };
  } catch (err) {
    console.error('[intent-router] error:', err instanceof Error ? err.message : String(err));
    return { intent: 'coach', confidence: 0, reasoning: 'router_error', latency_ms: Date.now() - startMs, tokens_used: 0 };
  }
}
