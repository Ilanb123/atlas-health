import 'server-only';
import { after } from 'next/server';
import { runCoachAgent } from '@/lib/agents/coach-agent';
import { sendWhatsApp } from '@/lib/twilio-client';
import {
  lookupUserByWhatsAppNumber,
  loadConversationHistory,
  logInboundMessage,
  logOutboundMessage,
} from '@/lib/whatsapp-conversation';

const TWIML_OK = '<Response></Response>';

export async function POST(request: Request) {
  // Parse Twilio's form-encoded payload before touching after()
  const formData = await request.formData();
  const from = formData.get('From') as string;
  const to = formData.get('To') as string;
  const body = formData.get('Body') as string;
  const messageSid = formData.get('MessageSid') as string;

  // Respond to Twilio immediately — must be fast
  after(async () => {
    try {
      const userId = await lookupUserByWhatsAppNumber(from);

      if (!userId) {
        await sendWhatsApp(from, "You're not registered yet. Reach out to Ilan.");
        console.log('[whatsapp/inbound] unknown number:', from);
        return;
      }

      await logInboundMessage({ user_id: userId, from_number: from, to_number: to, body, twilio_sid: messageSid });

      const history = await loadConversationHistory(userId, 10);
      const { reply_text, tools_called, tokens_used, latency_ms } = await runCoachAgent(body, history, userId);

      console.log('[whatsapp/inbound] coach replied in', latency_ms, 'ms, tools:', tools_called.join(','), 'tokens:', tokens_used);

      const { sid } = await sendWhatsApp(from, reply_text);

      await logOutboundMessage({
        user_id: userId,
        from_number: to,
        to_number: from,
        body: reply_text,
        twilio_sid: sid,
        agent_name: 'coach',
        tools_called,
        tokens_used,
        latency_ms,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[whatsapp/inbound] error:', msg);
      try {
        await sendWhatsApp(from, 'Sorry, I hit an error. Try again in a moment.');
      } catch {
        console.error('[whatsapp/inbound] failed to send error fallback');
      }
    }
  });

  return new Response(TWIML_OK, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
