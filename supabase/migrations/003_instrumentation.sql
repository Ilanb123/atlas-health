-- Atlas Health: instrumentation tables
-- Paste into Supabase SQL Editor and run

-- 1. agent_interactions: full log of every agent call
create table agent_interactions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references users(id) on delete cascade not null,
  timestamp     timestamptz default now() not null,
  agent_type    text        not null,
  user_question text        not null,
  tools_called  jsonb       not null default '[]',
  response_report jsonb,
  latency_ms    integer,
  tokens_used   jsonb,
  created_at    timestamptz default now()
);
alter table agent_interactions disable row level security;
create index agent_interactions_user_idx on agent_interactions (user_id, timestamp desc);

-- 2. recommendations: one row per action card surfaced to user
create table recommendations (
  id                        uuid        primary key default gen_random_uuid(),
  user_id                   uuid        references users(id) on delete cascade not null,
  timestamp                 timestamptz default now() not null,
  source_agent              text        not null,
  recommendation_type       text        not null,
  recommendation_text       text        not null,
  based_on_data_snapshot    jsonb,
  data_snapshot_at          timestamptz,
  user_response             text,
  user_response_at          timestamptz,
  created_at                timestamptz default now()
);
alter table recommendations disable row level security;
create index recommendations_user_idx on recommendations (user_id, timestamp desc);

-- 3. interventions: supplements, behaviors, protocols the user is trying
create table interventions (
  id                              uuid  primary key default gen_random_uuid(),
  user_id                         uuid  references users(id) on delete cascade not null,
  category                        text  not null,
  name                            text  not null,
  standardized_name               text,
  dose_structured                 jsonb,
  start_date                      date  not null,
  end_date                        date,
  attributed_to_recommendation_id uuid  references recommendations(id),
  notes                           text,
  created_at                      timestamptz default now(),
  updated_at                      timestamptz default now()
);
alter table interventions disable row level security;
create trigger interventions_updated_at
  before update on interventions
  for each row execute function set_updated_at();
create index interventions_user_idx on interventions (user_id, start_date desc);

-- 4. daily_checkins: subjective daily self-report
create table daily_checkins (
  id                      uuid     primary key default gen_random_uuid(),
  user_id                 uuid     references users(id) on delete cascade not null,
  date                    date     not null,
  energy_1to10            smallint check (energy_1to10 between 1 and 10),
  mood_1to10              smallint check (mood_1to10 between 1 and 10),
  stress_1to10            smallint check (stress_1to10 between 1 and 10),
  cognitive_clarity_1to10 smallint check (cognitive_clarity_1to10 between 1 and 10),
  digestion               text,
  symptoms                text[],
  notable_events          text,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  unique (user_id, date)
);
alter table daily_checkins disable row level security;
create trigger daily_checkins_updated_at
  before update on daily_checkins
  for each row execute function set_updated_at();

-- 5. outcome_snapshots: periodic pre-computed rolling averages
create table outcome_snapshots (
  id                   uuid  primary key default gen_random_uuid(),
  user_id              uuid  references users(id) on delete cascade not null,
  snapshot_date        date  not null,
  metrics              jsonb not null default '{}',
  active_interventions jsonb not null default '[]',
  created_at           timestamptz default now(),
  unique (user_id, snapshot_date)
);
alter table outcome_snapshots disable row level security;
create index outcome_snapshots_user_idx on outcome_snapshots (user_id, snapshot_date desc);
