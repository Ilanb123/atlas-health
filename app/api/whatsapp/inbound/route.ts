import 'server-only';
import { after } from 'next/server';
import { classifyIntent } from '@/lib/agents/intent-router';
import { runCoachAgent } from '@/lib/agents/coach-agent';
import { runNutritionAgent } from '@/lib/agents/nutrition-agent';
import { runWorkoutAgent } from '@/lib/agents/workout-agent';
import { runSleepRecoveryAgent } from '@/lib/agents/sleep-recovery-agent';
import { sendWhatsApp } from '@/lib/twilio-client';
import {
  lookupUserByWhatsAppNumber,
  loadConversationHistory,
  logInboundMessage,
  logOutboundMessage,
} from '@/lib/whatsapp-conversation';
import type { AgentReply } from '@/lib/agents/types';

const CONFIDENCE_THRESHOLD = 0.7;
const TWIML_OK = '<Response></Response>';

export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get('From') as string;
  const to = formData.get('To') as string;
  const body = formData.get('Body') as string;
  const messageSid = formData.get('MessageSid') as string;

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
      const recentHistory = history.slice(-3);

      const routerResult = await classifyIntent(body, recentHistory);
      console.log('[whatsapp/inbound] intent:', routerResult.intent, 'confidence:', routerResult.confidence, 'reasoning:', routerResult.reasoning);

      let agentResult: AgentReply;
      let agentName: string;

      if (routerResult.confidence >= CONFIDENCE_THRESHOLD) {
        switch (routerResult.intent) {
          case 'nutrition':
            agentResult = await runNutritionAgent(body, history, userId);
            agentName = 'nutrition';
            break;
          case 'workout':
            agentResult = await runWorkoutAgent(body, history, userId);
            agentName = 'workout';
            break;
          case 'sleep_recovery':
            agentResult = await runSleepRecoveryAgent(body, history, userId);
            agentName = 'sleep_recovery';
            break;
          default:
            agentResult = await runCoachAgent(body, history, userId);
            agentName = 'coach';
        }
      } else {
        agentResult = await runCoachAgent(body, history, userId);
        agentName = 'coach';
      }

      console.log('[whatsapp/inbound] agent:', agentName, 'latency:', agentResult.latency_ms, 'ms, tools:', agentResult.tools_called.join(','), 'tokens:', agentResult.tokens_used);

      const { sid } = await sendWhatsApp(from, agentResult.reply_text);

      await logOutboundMessage({
        user_id: userId,
        from_number: to,
        to_number: from,
        body: agentResult.reply_text,
        twilio_sid: sid,
        agent_name: agentName,
        tools_called: agentResult.tools_called,
        tokens_used: agentResult.tokens_used + routerResult.tokens_used,
        latency_ms: agentResult.latency_ms + routerResult.latency_ms,
        intent_classified: routerResult.intent,
        router_confidence: routerResult.confidence,
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
