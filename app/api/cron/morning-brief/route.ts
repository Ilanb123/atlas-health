import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMorningBrief } from '@/lib/agents/morning-brief-agent';
import { sendWhatsApp } from '@/lib/twilio-client';
import { logOutboundMessage } from '@/lib/whatsapp-conversation';

const DEEP_LINK = 'https://atlas-health-psi.vercel.app/today';

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = process.env.ATLAS_ALPHA_USER_ID;
  const whatsappTo = process.env.ATLAS_ALPHA_USER_WHATSAPP;
  if (!userId) return NextResponse.json({ error: 'Missing ATLAS_ALPHA_USER_ID' }, { status: 500 });
  if (!whatsappTo) return NextResponse.json({ error: 'Missing ATLAS_ALPHA_USER_WHATSAPP' }, { status: 500 });

  const supabase = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from('morning_briefs')
    .select('id, sent_at')
    .eq('user_id', userId)
    .eq('brief_date', today)
    .maybeSingle();

  if (existing?.sent_at) {
    return NextResponse.json({ success: true, skipped: true, reason: 'already sent today', brief_id: existing.id });
  }

  console.log('[morning-brief] generating for user', userId, 'date', today);
  const { brief, toolsCalled, latencyMs, tokensUsed } = await generateMorningBrief(userId);
  console.log('[morning-brief] generated in', latencyMs, 'ms, tools:', toolsCalled.join(','), 'tokens:', tokensUsed.total);

  const whatsappText = brief.whatsapp_text.replace('{DEEP_LINK}', DEEP_LINK);

  const { data: row, error: insertError } = await supabase
    .from('morning_briefs')
    .upsert(
      {
        user_id: userId,
        brief_date: today,
        whatsapp_text: whatsappText,
        full_brief: brief,
        tools_called: toolsCalled,
        latency_ms: latencyMs,
        tokens_used: tokensUsed,
      },
      { onConflict: 'user_id,brief_date' },
    )
    .select('id')
    .single();

  if (insertError || !row) {
    return NextResponse.json({ error: insertError?.message ?? 'insert failed' }, { status: 500 });
  }

  try {
    console.log('[morning-brief] sending WhatsApp to whatsapp:', whatsappTo);
    const { sid, status } = await sendWhatsApp(`whatsapp:${whatsappTo}`, whatsappText);
    console.log('[morning-brief] WhatsApp sent, sid:', sid, 'status:', status);

    await supabase
      .from('morning_briefs')
      .update({ sent_at: new Date().toISOString(), whatsapp_sid: sid })
      .eq('id', row.id);

    await logOutboundMessage({
      user_id: userId,
      from_number: process.env.TWILIO_WHATSAPP_NUMBER!,
      to_number: `whatsapp:${whatsappTo}`,
      body: whatsappText,
      twilio_sid: sid,
      agent_name: 'morning-brief',
      tools_called: toolsCalled,
      tokens_used: tokensUsed.total,
      latency_ms: latencyMs,
    }).catch(e => console.error('[morning-brief] logOutboundMessage failed:', e));

    return NextResponse.json({ success: true, brief_id: row.id, whatsapp_sid: sid, whatsapp_status: status });
  } catch (err) {
    const twilioError = err instanceof Error ? err.message : String(err);
    console.error('[morning-brief] Twilio send failed:', twilioError);
    return NextResponse.json({ success: false, brief_id: row.id, twilio_error: twilioError }, { status: 500 });
  }
}
