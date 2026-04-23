-- Atlas Health: intent classification columns on whatsapp_messages
-- Paste into Supabase SQL Editor and run

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS intent_classified TEXT;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS router_confidence NUMERIC(3,2);
