import 'server-only';
import twilio from 'twilio';

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid) throw new Error('Missing env var: TWILIO_ACCOUNT_SID');
  if (!token) throw new Error('Missing env var: TWILIO_AUTH_TOKEN');
  return twilio(sid, token);
}

export async function sendWhatsApp(
  to: string,
  body: string,
): Promise<{ sid: string; status: string }> {
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) throw new Error('Missing env var: TWILIO_WHATSAPP_NUMBER');

  const client = getClient();
  const message = await client.messages.create({ from, to, body });
  return { sid: message.sid, status: message.status };
}
