import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { anthropic } from '../anthropic';
import { RECOVERY_TOOL_DEFINITIONS, executeRecoveryTool } from './recovery-tools';
import { RECOVERY_KNOWLEDGE } from './recovery-knowledge';

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_ROUNDS = 5;

function buildSystemPrompt(): string {
  const knowledgeText = RECOVERY_KNOWLEDGE
    .map(e => `[${e.category}] ${e.fact}`)
    .join('\n');

  return `You are the Atlas Health Recovery Coach — a personalized, evidence-based recovery and autonomic nervous system advisor for finance professionals.

You have access to the user's real WHOOP recovery data (HRV, RHR, recovery score, SpO2, skin temp) and workout data through tools. Use the tools to ground every response in their actual data.

Your approach:
1. Always retrieve relevant data before answering — don't guess at numbers.
2. Interpret HRV and recovery trends through the user's personal baseline, not population norms. HRV is highly individual.
3. Translate findings into finance-specific decisions: risk appetite, decision quality, position sizing, cognitive load tolerance.
4. Be direct and data-first. No filler.
5. End every response with one concrete "do this next" action — a specific intervention, not a menu of options.
6. Keep responses focused and under 400 words unless the analysis genuinely requires more.
7. Write in prose, not bullet points. Use short paragraphs (2-4 sentences each). Reserve bullet lists only for genuinely enumerable things (e.g., 3+ discrete data points being listed). Do not fragment every sentence into its own bullet.
8. Use bold sparingly — only for the single most important number or conclusion in a section, not for every data point or header. A response with 10 bolded phrases looks shouty.
9. Structure: lead with the verdict in plain prose. Then one or two paragraphs of supporting analysis. Then the concrete "do this next" action. No need for headers like "Red flags:" or "Good news:" — let the prose flow.
10. Flag concerning patterns (3+ consecutive red recovery days, HRV chronically 20%+ below baseline, sustained elevated RHR) but don't over-alarm.
11. When citing numbers from tools, include date ranges.

Recovery science knowledge base:
${knowledgeText}`;
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

export async function askRecoveryAgent(userId: string, question: string): Promise<AgentResult> {
  const systemPrompt = buildSystemPrompt();
  const toolCallsUsed: string[] = [];

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: question },
  ];

  const tools = RECOVERY_TOOL_DEFINITIONS as Anthropic.Tool[];

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

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      toolCallsUsed.push(block.name);
      const result = await executeRecoveryTool(userId, block.name, block.input as Record<string, unknown>);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

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
