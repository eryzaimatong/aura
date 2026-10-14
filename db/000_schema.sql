-- ============================================================
-- AURA — database schema (PostgreSQL / Supabase)
-- Privacy rule enforced here: no selfie is ever stored.
-- Scans persist derived numbers only.
--
-- RESET FIRST if a previous run failed partway:
--   drop schema public cascade;
--   create schema public;
--   grant usage on schema public to postgres, anon, authenticated, service_role;
--   grant all on all tables in schema public to postgres, anon, authenticated, service_role;
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;   -- pgvector, for CLIP + Style Print

-- ---------- enums ----------
create type age_bracket   as enum ('under_13','13_17','18_24','25_34','35_44','45_plus');
create type face_shape    as enum ('heart','oblong','oval','round','square');
create type color_season  as enum (
  'true_spring','light_spring','bright_spring',
  'true_summer','light_summer','soft_summer',
  'true_autumn','soft_autumn','deep_autumn',
  'true_winter','bright_winter','deep_winter');
create type undertone     as enum ('cool','warm','neutral');
create type body_shape    as enum ('pear','apple','hourglass','rectangle','inverted_triangle');
create type item_category as enum ('top','bottom','dress','outerwear','shoes','bag','accessory');
create type occasion      as enum ('casual','class','work','date','formal','travel');
create type goal_state    as enum ('later','next','now','done','dropped');
create type plan_tier     as enum ('free','premium');
create type correction_target as enum ('season','face_shape','undertone','all');

-- ============================================================
-- 1. IDENTITY
-- ============================================================
create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text not null,
  age_bracket     age_bracket not null,          -- bracket only, never a birth date
  guardian_ok     boolean not null default false,-- required when 13_17
  region          text    not null default 'PH',
  units           text    not null default 'cm',
  plan            plan_tier not null default 'free',
  plan_renews_at  timestamptz,
  share_analytics boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint minors_need_guardian
    check (age_bracket <> '13_17' or guardian_ok = true),
  constraint no_under_13
    check (age_bracket <> 'under_13')
);

-- every consent event is an append-only record (DPA audit trail)
create table consents (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,       -- 'face_scan' | 'analytics' | 'marketing'
  granted     boolean not null,
  policy_ver  text not null,
  created_at  timestamptz not null default now()
);
create index on consents (user_id, kind, created_at desc);

-- ============================================================
-- 2. THE MIRROR — analysis
-- ============================================================
create table scans (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references profiles(id) on delete cascade,
  -- derived numbers only. NO image column, by design.
  landmark_ratios  jsonb not null,     -- {"len_width":1.42,"jaw_forehead":0.88,...}
  lab_skin         real[3],            -- CIELAB sampled from cheeks
  lab_hair         real[3],
  lab_eye          real[3],
  monk_band        smallint check (monk_band between 1 and 10),
  lighting_score   real,               -- 0-1, drives the low-light warning
  model_version    text not null,
  device_hint      text,               -- 'browser' | 'ios' | 'android'
  created_at       timestamptz not null default now()
);
create index on scans (user_id, created_at desc);

create table aura_cards (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references profiles(id) on delete cascade,
  scan_id         uuid references scans(id) on delete set null,
  face_shape      face_shape  not null,
  shape_conf      real        not null check (shape_conf between 0 and 1),
  season          color_season,
  season_conf     real        check (season_conf between 0 and 1),
  skin_undertone  undertone,
  palette         jsonb       not null default '[]',  -- ["#A8BBD6", ...]
  source          text        not null default 'model', -- 'model' | 'quiz' | 'user_corrected'
  is_current      boolean     not null default true,
  created_at      timestamptz not null default now()
);
create unique index one_current_card
  on aura_cards (user_id) where is_current;

-- the correction loop: trust repair + free training labels
create table card_corrections (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  card_id        uuid not null references aura_cards(id) on delete cascade,
  scan_id        uuid references scans(id) on delete set null,
  target         correction_target not null,
  predicted      text not null,
  corrected_to   text,                -- null when the user said "not sure"
  model_version  text not null,
  usable_label   boolean not null default true,
  created_at     timestamptz not null default now()
);
create index on card_corrections (target, created_at desc);

-- fallback quiz when lighting kills the colour read
create table undertone_quiz (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  answers     jsonb not null,            -- {"veins":"blue","metal":"silver","sun":"burn"}
  result      undertone not null,
  created_at  timestamptz not null default now()
);

create table measurements (
  user_id     uuid primary key references profiles(id) on delete cascade,
  shoulders_cm real, bust_cm real, waist_cm real, hips_cm real, height_cm real,
  shape       body_shape,
  updated_at  timestamptz not null default now()
);

-- Style Print: the learned taste vector
create table style_prints (
  user_id      uuid primary key references profiles(id) on delete cascade,
  vector       vector(64) not null,
  axes         jsonb not null,   -- {"soft_structured":0.72,"quiet_bold":0.81,...}
  label        text,             -- "Soft Minimalist"
  confidence   real not null default 0 check (confidence between 0 and 1),
  quiz_answers jsonb,
  n_signals    integer not null default 0,
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- 3. THE CLOSET
-- ============================================================
create table closet_items (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references profiles(id) on delete cascade,
  name           text not null,
  category       item_category not null,
  subcategory    text,
  image_path     text not null,          -- Supabase Storage key, cut-out WebP
  dominant_colors jsonb not null default '[]',   -- [{"hex":"#EFE3D2","pct":0.62}]
  lab_primary    real[3],
  in_palette     boolean,                -- recomputed when the card changes
  embedding      vector(512),            -- CLIP, for outfit + shop matching
  auto_tagged    boolean not null default true,
  seasonality    text,                   -- 'warm' | 'cool' | 'all'
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on closet_items (user_id) where not archived;
create index on closet_items (user_id, category);
create index closet_embedding_idx on closet_items
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- 4. LOOKBOOK + WEAR LOG
-- ============================================================
create table outfits (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  occasion    occasion,
  weather_ctx jsonb,          -- {"temp_c":33,"rain_pct":80,"feels_c":38}
  reason      text,           -- the "why this works" line shown in the UI
  generator_v text not null,  -- which algorithm produced it (A/B arm)
  saved       boolean not null default false,
  created_at  timestamptz not null default now()
);
create table outfit_items (
  outfit_id uuid references outfits(id) on delete cascade,
  item_id   uuid references closet_items(id) on delete cascade,
  slot      item_category not null,
  primary key (outfit_id, item_id)
);

create table wear_log (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  item_id    uuid references closet_items(id) on delete cascade,
  outfit_id  uuid references outfits(id) on delete set null,
  worn_on    date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, item_id, worn_on)   -- one wear per item per day
);
create index on wear_log (user_id, worn_on desc);

create table trips (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  place      text not null,
  starts_on  date not null,
  ends_on    date not null,
  occasions  occasion[] not null default '{}',
  forecast   jsonb,
  item_ids   uuid[] not null default '{}',
  gaps       jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table goals (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  detail     text,
  state      goal_state not null default 'later',
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. THE SHELF — catalogue + recommendations
-- ============================================================
create table products (                 -- shared catalogue, not per user
  id           uuid primary key default uuid_generate_v4(),
  merchant     text not null,
  external_id  text not null,
  title        text not null,
  category     item_category not null,
  price_cents  integer,
  currency     char(3) not null default 'PHP',
  image_url    text,
  affiliate_url text,
  dominant_colors jsonb default '[]',
  embedding    vector(512),
  active       boolean not null default true,
  fetched_at   timestamptz not null default now(),
  unique (merchant, external_id)
);

create table recommendations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,            -- 'makeup' | 'hair' | 'colors' | 'product'
  product_id  uuid references products(id) on delete cascade,
  payload     jsonb,                    -- for non-product advice
  reason      text not null,            -- never show a pick without one
  fit_score   real not null,            -- ranking is fit-only; payout never enters
  gap_filled  text,
  algo_v      text not null,
  created_at  timestamptz not null default now()
);
create table rec_feedback (
  rec_id     uuid references recommendations(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  verdict    text not null,             -- 'saved' | 'dismissed' | 'clicked' | 'bought'
  created_at timestamptz not null default now(),
  primary key (rec_id, verdict)
);

-- ============================================================
-- 6. ANALYTICS, EXPERIMENTS, MODEL HEALTH
-- ============================================================
create table events (
  id         bigserial primary key,
  user_id    uuid references profiles(id) on delete set null,
  name       text not null,             -- 'scan_started','item_added','outfit_worn'
  props      jsonb not null default '{}',
  session_id uuid,
  created_at timestamptz not null default now()
);
create index on events (name, created_at desc);
create index on events (user_id, created_at desc);

create table experiments (
  key        text primary key,          -- 'outfit_gen_v2'
  hypothesis text not null,
  arms       text[] not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  winner     text
);
create table experiment_assignments (
  experiment_key text references experiments(key) on delete cascade,
  user_id        uuid references profiles(id) on delete cascade,
  arm            text not null,         -- hashed on user_id, sticky
  assigned_at    timestamptz not null default now(),
  primary key (experiment_key, user_id)
);

-- per-release model metrics, including fairness by skin tone
create table model_metrics (
  id            uuid primary key default uuid_generate_v4(),
  model_name    text not null,          -- 'face_shape'
  version       text not null,
  split         text not null,          -- 'holdout' | 'production'
  monk_band     smallint,               -- null = overall, else 1-10
  n             integer not null,
  accuracy      real,
  macro_f1      real,
  mean_conf     real,
  measured_at   timestamptz not null default now()
);
create index on model_metrics (model_name, version, measured_at desc);

-- ============================================================
-- 7. DELETION + EXPORT (right to erasure, DPA 2012)
-- ============================================================
create table data_requests (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  kind        text not null,            -- 'export' | 'delete_scans' | 'delete_closet' | 'delete_all'
  status      text not null default 'pending',
  file_path   text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ============================================================
-- 8. ROW LEVEL SECURITY — deny by default, owner-only access
-- ============================================================

-- profiles keys on id, not user_id, so it is handled separately
alter table profiles enable row level security;
create policy owner_all on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- everything else keys on user_id
do $$
declare t text;
begin
  foreach t in array array[
    'consents','scans','aura_cards','card_corrections','undertone_quiz',
    'measurements','style_prints','closet_items','outfits','wear_log','trips',
    'goals','recommendations','rec_feedback','data_requests','experiment_assignments'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$
      create policy owner_all on %I
      for all using (user_id = auth.uid()) with check (user_id = auth.uid())
    $p$, t);
  end loop;
end $$;

-- outfit_items inherits access through its parent outfit
alter table outfit_items enable row level security;
create policy owner_via_outfit on outfit_items for all
  using (exists (select 1 from outfits o where o.id = outfit_id and o.user_id = auth.uid()));

-- catalogue is public to read, service role writes
alter table products enable row level security;
create policy read_products on products for select using (active);

-- ============================================================
-- 9. HOUSEKEEPING
-- ============================================================
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

create trigger t_profiles  before update on profiles      for each row execute function touch_updated_at();
create trigger t_items     before update on closet_items  for each row execute function touch_updated_at();
create trigger t_measure   before update on measurements  for each row execute function touch_updated_at();
create trigger t_style     before update on style_prints  for each row execute function touch_updated_at();

-- wear counts, used by the Closet and Diary screens
create view item_wear_stats as
select i.id as item_id, i.user_id, i.name, i.category,
       count(w.id)        as wear_count,
       max(w.worn_on)     as last_worn,
       i.created_at
from closet_items i
left join wear_log w on w.item_id = i.id
where not i.archived
group by i.id;

-- closet utilisation for the Diary
create view closet_utilisation as
select user_id,
       count(*)                                          as items,
       count(*) filter (where wear_count > 0)            as worn_items,
       count(*) filter (where wear_count = 1)            as worn_once,
       round(100.0 * count(*) filter (where wear_count > 0) / nullif(count(*),0), 1) as pct_used
from item_wear_stats group by user_id;