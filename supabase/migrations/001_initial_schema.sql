-- Atlas Health: initial schema
-- Paste into Supabase SQL Editor and run

create extension if not exists pgcrypto;

-- auto-update updated_at on every row update
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- users
create table users (
  id            uuid        primary key default gen_random_uuid(),
  email         text        unique not null,
  whoop_user_id bigint      unique,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table users disable row level security;
create trigger users_updated_at
  before update on users
  for each row execute function set_updated_at();

-- whoop_tokens
create table whoop_tokens (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references users(id) on delete cascade unique,
  access_token  text        not null,
  refresh_token text        not null,
  expires_at    timestamptz not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table whoop_tokens disable row level security;
create trigger whoop_tokens_updated_at
  before update on whoop_tokens
  for each row execute function set_updated_at();

-- sleep
create table sleep (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        references users(id) on delete cascade,
  whoop_id              text        unique not null,
  start_time            timestamptz not null,
  end_time              timestamptz not null,
  duration_minutes      int,
  time_in_bed_minutes   int,
  rem_minutes           int,
  deep_minutes          int,
  light_minutes         int,
  awake_minutes         int,
  efficiency_pct        numeric,
  sleep_performance_pct numeric,
  respiratory_rate      numeric,
  raw_payload           jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
alter table sleep disable row level security;
create index sleep_user_start_idx on sleep (user_id, start_time desc);
create trigger sleep_updated_at
  before update on sleep
  for each row execute function set_updated_at();

-- recovery
create table recovery (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        references users(id) on delete cascade,
  whoop_id          text        unique not null,
  cycle_id          text,
  recovery_date     date        not null,
  recovery_score    int,
  hrv_ms            numeric,
  rhr_bpm           int,
  spo2_pct          numeric,
  skin_temp_celsius numeric,
  raw_payload       jsonb,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter table recovery disable row level security;
create index recovery_user_date_idx on recovery (user_id, recovery_date desc);
create trigger recovery_updated_at
  before update on recovery
  for each row execute function set_updated_at();

-- workouts
create table workouts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references users(id) on delete cascade,
  whoop_id         text        unique not null,
  sport_id         int,
  sport_name       text,
  start_time       timestamptz not null,
  end_time         timestamptz,
  duration_minutes int,
  strain           numeric,
  avg_hr           int,
  max_hr           int,
  calories         int,
  distance_meters  numeric,
  raw_payload      jsonb,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table workouts disable row level security;
create index workouts_user_start_idx on workouts (user_id, start_time desc);
create trigger workouts_updated_at
  before update on workouts
  for each row execute function set_updated_at();

-- cycles
create table cycles (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references users(id) on delete cascade,
  whoop_id    text        unique not null,
  start_time  timestamptz not null,
  end_time    timestamptz,
  day_strain  numeric,
  avg_hr      int,
  max_hr      int,
  kilojoules  numeric,
  raw_payload jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table cycles disable row level security;
create index cycles_user_start_idx on cycles (user_id, start_time desc);
create trigger cycles_updated_at
  before update on cycles
  for each row execute function set_updated_at();
