import 'server-only';
import { supabase } from './supabase';

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

interface LogAgentInteractionParams {
  userId: string;
  agentType: string;
  userQuestion: string;
  toolsCalled: string[];
  responseReport: Record<string, unknown>;
  latencyMs: number;
  tokensUsed: TokenUsage;
}

interface LogRecommendationParams {
  userId: string;
  sourceAgent: string;
  recommendationText: string;
  dataSnapshot: Record<string, unknown>;
  dataSnapshotAt: string;
}

export async function logAgentInteraction(params: LogAgentInteractionParams): Promise<void> {
  const { error } = await supabase.from('agent_interactions').insert({
    user_id: params.userId,
    agent_type: params.agentType,
    user_question: params.userQuestion,
    tools_called: params.toolsCalled,
    response_report: params.responseReport,
    latency_ms: params.latencyMs,
    tokens_used: params.tokensUsed,
  });
  if (error) throw new Error(`agent_interactions insert: ${error.message}`);
}

export async function logRecommendation(params: LogRecommendationParams): Promise<void> {
  const { error } = await supabase.from('recommendations').insert({
    user_id: params.userId,
    source_agent: params.sourceAgent,
    recommendation_type: `${params.sourceAgent}_action`,
    recommendation_text: params.recommendationText,
    based_on_data_snapshot: params.dataSnapshot,
    data_snapshot_at: params.dataSnapshotAt,
  });
  if (error) throw new Error(`recommendations insert: ${error.message}`);
}
