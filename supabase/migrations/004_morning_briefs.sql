-- Atlas Health: morning_briefs table
-- Paste into Supabase SQL Editor and run

create table morning_briefs (
  id            uuid                     primary key default gen_random_uuid(),
  user_id       uuid                     not null references users(id),
  brief_date    date                     not null,
  whatsapp_text text                     not null,
  full_brief    jsonb                    not null,
  tools_called  jsonb,
  latency_ms    integer,
  tokens_used   jsonb,
  sent_at       timestamp with time zone,
  whatsapp_sid  text,
  read_at       timestamp with time zone,
  created_at    timestamp with time zone default now(),
  unique(user_id, brief_date)
);

create index idx_morning_briefs_user_date on morning_briefs(user_id, brief_date desc);
