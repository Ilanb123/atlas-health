-- Atlas Health: biomarkers table
-- Paste into Supabase SQL Editor and run

create table biomarkers (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        references users(id) on delete cascade not null,
  name                    text        not null,
  value                   numeric     not null,
  unit                    text        not null,
  reference_range_low     numeric,
  reference_range_high    numeric,
  reference_range_label   text,
  test_date               date        not null,
  lab_source              text,
  source_pdf_filename     text,
  category                text,
  raw_extraction          jsonb,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

alter table biomarkers disable row level security;

create trigger biomarkers_updated_at
  before update on biomarkers
  for each row execute function set_updated_at();

-- for dashboard queries sorted by date
create index biomarkers_user_date_idx on biomarkers (user_id, test_date desc);

-- for per-biomarker trend queries and upsert conflict target
create unique index biomarkers_user_name_date_idx on biomarkers (user_id, name, test_date);
