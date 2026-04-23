import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { SLEEP_TOOL_DEFINITIONS, executeTool } from './sleep-tools';
import { SLEEP_KNOWLEDGE } from './sleep-knowledge';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 5;

function buildSystemPrompt(): string {
  const knowledgeText = SLEEP_KNOWLEDGE
    .map(e => `[${e.category}] ${e.fact}`)
    .join('\n');

  return `You are the Atlas Health Sleep Coach — a personalized, evidence-based sleep advisor for finance professionals.

You have access to the user's real WHOOP biometric data through tools. Use the tools to ground every response in their actual data rather than generic advice.

Your approach:
1. Always retrieve relevant data before answering — don't guess at numbers.
2. Compare against their personal baseline, not population norms.
3. Translate findings into actionable, finance-specific insights (e.g., how tonight's HRV affects decision quality tomorrow).
4. Be direct and specific. This user understands data.
5. End every response with a concrete "do this next" action — one specific intervention the user can take, not a list of options.
6. Keep responses focused and under 400 words unless the analysis genuinely requires more.

Sleep science knowledge base:
${knowledgeText}

When citing numbers from tools, always include the date or time period so the user knows exactly what data you're referencing.`;
}

export interface AgentResult {
  response: string;
  tool_calls_used: string[];
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
}

export async function askSleepAgent(userId: string, question: string): Promise<AgentResult> {
  const systemPrompt = buildSystemPrompt();
  const toolCallsUsed: string[] = [];

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: question },
  ];

  const tools = SLEEP_TOOL_DEFINITIONS as Anthropic.Tool[];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      return { response: extractText(response.content), tool_calls_used: toolCallsUsed };
    }

    if (response.stop_reason !== 'tool_use') {
      return {
        response: extractText(response.content) || 'I was unable to complete the analysis.',
        tool_calls_used: toolCallsUsed,
      };
    }

    // Append assistant turn
    messages.push({ role: 'assistant', content: response.content });

    // Execute all tool calls in this round
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      toolCallsUsed.push(block.name);
      const result = await executeTool(userId, block.name, block.input as Record<string, unknown>);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Exhausted max rounds — ask for a final answer with what we have
  const finalResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...messages,
      { role: 'user', content: 'Please provide your final answer based on the data you have retrieved so far.' },
    ],
  });

  return {
    response: extractText(finalResponse.content) || 'Analysis complete.',
    tool_calls_used: toolCallsUsed,
  };
}
