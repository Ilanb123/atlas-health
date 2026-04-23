import 'server-only';
import { createClient } from '@supabase/supabase-js';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function normalizePhone(phone: string): string {
  return phone.replace(/^whatsapp:/, '');
}

export async function lookupUserByWhatsAppNumber(phoneNumber: string): Promise<string | null> {
  const normalized = normalizePhone(phoneNumber);
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('whatsapp_number', normalized)
    .maybeSingle();
  return data?.id ?? null;
}

export async function loadConversationHistory(userId: string, limit = 10): Promise<ConversationMessage[]> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('direction, body')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  // reverse to get chronological order, then map direction to role
  return data.reverse().map(row => ({
    role: row.direction === 'inbound' ? 'user' : 'assistant',
    content: row.body,
  }));
}

export async function logInboundMessage(params: {
  user_id: string;
  from_number: string;
  to_number: string;
  body: string;
  twilio_sid: string;
}): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase.from('whatsapp_messages').insert({
    user_id: params.user_id,
    direction: 'inbound',
    from_number: params.from_number,
    to_number: params.to_number,
    body: params.body,
    twilio_sid: params.twilio_sid,
  });
}

export async function logOutboundMessage(params: {
  user_id: string;
  from_number: string;
  to_number: string;
  body: string;
  twilio_sid: string | null;
  agent_name: string;
  tools_called: string[];
  tokens_used: number;
  latency_ms: number;
  intent_classified?: string;
  router_confidence?: number;
}): Promise<void> {
  const supabase = supabaseAdmin();
  await supabase.from('whatsapp_messages').insert({
    user_id: params.user_id,
    direction: 'outbound',
    from_number: params.from_number,
    to_number: params.to_number,
    body: params.body,
    twilio_sid: params.twilio_sid,
    agent_name: params.agent_name,
    tools_called: params.tools_called,
    tokens_used: params.tokens_used,
    latency_ms: params.latency_ms,
    intent_classified: params.intent_classified,
    router_confidence: params.router_confidence,
  });
}
