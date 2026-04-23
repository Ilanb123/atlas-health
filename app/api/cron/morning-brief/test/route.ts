import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMorningBrief } from '@/lib/agents/morning-brief-agent';
import { sendWhatsApp } from '@/lib/twilio-client';

const DEEP_LINK = 'https://atlas-health-psi.vercel.app/today';

function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST() {
  const userId = process.env.ATLAS_ALPHA_USER_ID;
  const whatsappTo = process.env.ATLAS_ALPHA_USER_WHATSAPP;
  if (!userId) return NextResponse.json({ error: 'Missing ATLAS_ALPHA_USER_ID' }, { status: 500 });
  if (!whatsappTo) return NextResponse.json({ error: 'Missing ATLAS_ALPHA_USER_WHATSAPP' }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);

  console.log('[morning-brief/test] generating for user', userId, 'date', today);
  const { brief, toolsCalled, latencyMs, tokensUsed } = await generateMorningBrief(userId);
  console.log('[morning-brief/test] generated in', latencyMs, 'ms, tools:', toolsCalled.join(','), 'tokens:', tokensUsed.total);

  const whatsappText = brief.whatsapp_text.replace('{DEEP_LINK}', DEEP_LINK);

  const supabase = supabaseAdmin();
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

  const { sid, status } = await sendWhatsApp(`whatsapp:${whatsappTo}`, whatsappText);

  await supabase
    .from('morning_briefs')
    .update({ sent_at: new Date().toISOString(), whatsapp_sid: sid })
    .eq('id', row.id);

  return NextResponse.json({
    success: true,
    brief_id: row.id,
    whatsapp_sid: sid,
    whatsapp_status: status,
    brief,
    toolsCalled,
    latencyMs,
    tokensUsed,
  });
}
