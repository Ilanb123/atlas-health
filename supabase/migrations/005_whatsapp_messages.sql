-- Atlas Health: WhatsApp conversation support
-- Paste into Supabase SQL Editor and run

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  direction   TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT        NOT NULL,
  to_number   TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  twilio_sid  TEXT,
  agent_name  TEXT,
  tools_called TEXT[],
  tokens_used INT,
  latency_ms  INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_created
  ON whatsapp_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_created
  ON whatsapp_messages(from_number, created_at DESC);
