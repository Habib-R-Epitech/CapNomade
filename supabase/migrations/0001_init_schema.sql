-- =============================================================================
-- CapNomade — Initial schema
-- Extensions, enums, tables and indexes. RLS & triggers are in 0002 / 0003.
-- =============================================================================

set search_path = public;

-- --- Extensions --------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists postgis;

-- --- Enums -------------------------------------------------------------------
create type trip_status as enum ('draft','planning','booked','completed','archived');
create type trip_visibility as enum ('private','members','public');
create type trip_role as enum ('owner','editor','viewer');
create type invitation_status as enum ('pending','accepted','declined','expired','cancelled');
create type expense_type as enum ('accommodation','transport','activity','food','other');
create type expense_payment_status as enum ('paid','partial','unpaid');
create type expense_split_method as enum ('equal','custom','percentage','fixed_amount');
create type transport_mode as enum ('plane','car','train','bus','ferry','other');
create type accommodation_type as enum ('hotel','airbnb','hostel','camping','friends','other');
create type wish_status as enum ('idea','researching','almost_ready','planned');
create type wish_company_type as enum ('solo','couple','friends','family','any');
create type notification_type as enum ('invitation','trip_shared','trip_updated','review_reminder','generic');
create type map_import_format as enum ('kml','kmz','gpx','geojson','csv','xlsx');
create type carbon_method as enum ('travel_impact_model','distance_factor','fallback','manual');

-- --- Profiles ----------------------------------------------------------------
create table profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    citext not null unique,
  full_name                text,
  avatar_url               text,
  locale                   text not null default 'fr',
  timezone                 text not null default 'Europe/Paris',
  default_currency         char(3) not null default 'EUR',
  onboarding_completed_at  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- --- Trips -------------------------------------------------------------------
create table trips (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references profiles(id) on delete cascade,
  title               text not null,
  slug                text not null,
  description         text,
  status              trip_status not null default 'draft',
  visibility          trip_visibility not null default 'private',
  start_date          date,
  end_date            date,
  cover_image_url     text,
  primary_countries   text[] not null default '{}',
  base_currency       char(3) not null default 'EUR',
  total_budget_cents  bigint,
  bounding_box        geography(Polygon, 4326),
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  archived_at         timestamptz,
  unique (owner_id, slug),
  constraint trips_dates_valid check (start_date is null or end_date is null or start_date <= end_date)
);

create index trips_owner_idx on trips(owner_id);
create index trips_status_idx on trips(status);
create index trips_dates_idx on trips(start_date, end_date);

-- --- Trip members ------------------------------------------------------------
create table trip_members (
  trip_id    uuid not null references trips(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       trip_role not null,
  joined_at  timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index trip_members_user_idx on trip_members(user_id);

-- --- Trip invitations --------------------------------------------------------
create table trip_invitations (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references trips(id) on delete cascade,
  invited_email  citext not null,
  invited_by     uuid not null references profiles(id) on delete cascade,
  role           trip_role not null default 'viewer',
  status         invitation_status not null default 'pending',
  token          text not null unique,
  message        text,
  expires_at     timestamptz not null default (now() + interval '14 days'),
  responded_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index trip_invitations_trip_idx on trip_invitations(trip_id);
create index trip_invitations_email_idx on trip_invitations(invited_email);

-- --- Trip stops --------------------------------------------------------------
create table trip_stops (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references trips(id) on delete cascade,
  name             text not null,
  country_code     char(2),
  city             text,
  region           text,
  location         geography(Point, 4326),
  arrival_date     date,
  departure_date   date,
  notes            text,
  order_index      integer not null default 0,
  created_at       timestamptz not null default now()
);
create index trip_stops_trip_idx on trip_stops(trip_id);
create index trip_stops_location_idx on trip_stops using gist(location);

-- --- Trip days ---------------------------------------------------------------
create table trip_days (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips(id) on delete cascade,
  date         date not null,
  title        text,
  notes        text,
  order_index  integer not null default 0,
  unique (trip_id, date)
);
create index trip_days_trip_idx on trip_days(trip_id, date);

-- --- Activities --------------------------------------------------------------
create table activities (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references trips(id) on delete cascade,
  day_id              uuid references trip_days(id) on delete set null,
  stop_id             uuid references trip_stops(id) on delete set null,
  title               text not null,
  description         text,
  category            text,
  starts_at           timestamptz,
  ends_at             timestamptz,
  duration_minutes    integer,
  location            geography(Point, 4326),
  address             text,
  url                 text,
  cost_cents          bigint,
  cost_currency       char(3),
  is_booked           boolean not null default false,
  booking_reference   text,
  order_index         integer not null default 0,
  created_at          timestamptz not null default now()
);
create index activities_trip_idx on activities(trip_id);
create index activities_day_idx on activities(day_id);

-- --- Accommodations ----------------------------------------------------------
create table accommodations (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references trips(id) on delete cascade,
  stop_id               uuid references trip_stops(id) on delete set null,
  name                  text not null,
  kind                  accommodation_type not null default 'hotel',
  check_in_date         date,
  check_out_date        date,
  address               text,
  location              geography(Point, 4326),
  booking_url           text,
  confirmation_number   text,
  cost_cents            bigint,
  cost_currency         char(3),
  notes                 text,
  created_at            timestamptz not null default now()
);
create index accommodations_trip_idx on accommodations(trip_id);

-- --- Transport segments ------------------------------------------------------
create table transport_segments (
  id                        uuid primary key default gen_random_uuid(),
  trip_id                   uuid not null references trips(id) on delete cascade,
  mode                      transport_mode not null,
  origin_label              text,
  destination_label         text,
  origin_location           geography(Point, 4326),
  destination_location      geography(Point, 4326),
  depart_at                 timestamptz,
  arrive_at                 timestamptz,
  duration_minutes          integer,
  distance_km               numeric(10,2),
  carrier                   text,
  reference                 text,
  emission_kgco2e           numeric(10,2),
  emission_method           carbon_method,
  emission_confidence       text,
  emission_calculated_at    timestamptz,
  emission_payload          jsonb,
  geometry                  geography(LineString, 4326),
  cost_cents                bigint,
  cost_currency             char(3),
  toll_cents                bigint,
  fuel_cents                bigint,
  notes                     text,
  order_index               integer not null default 0,
  created_at                timestamptz not null default now()
);
create index transport_segments_trip_idx on transport_segments(trip_id);
create index transport_segments_mode_idx on transport_segments(mode);

-- --- Attachments -------------------------------------------------------------
create table attachments (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references trips(id) on delete cascade,
  uploaded_by    uuid references profiles(id) on delete set null,
  bucket         text not null,
  path           text not null,
  mime_type      text,
  size_bytes     bigint,
  original_name  text,
  is_private     boolean not null default true,
  created_at     timestamptz not null default now()
);
create index attachments_trip_idx on attachments(trip_id);

-- --- Expenses ----------------------------------------------------------------
create table expenses (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references trips(id) on delete cascade,
  day_id              uuid references trip_days(id) on delete set null,
  stop_id             uuid references trip_stops(id) on delete set null,
  type                expense_type not null,
  subtype             text,
  label               text not null,
  city                text,
  amount_cents        bigint not null,
  currency            char(3) not null,
  fx_rate             numeric(14,6),
  amount_base_cents   bigint,
  spent_on            date,
  payment_status      expense_payment_status not null default 'unpaid',
  split_method        expense_split_method not null default 'equal',
  link                text,
  note                text,
  attachment_id       uuid references attachments(id) on delete set null,
  created_by          uuid references profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index expenses_trip_idx on expenses(trip_id);
create index expenses_type_idx on expenses(type);
create index expenses_spent_on_idx on expenses(spent_on);

-- --- Expense allocations (who owes what for an expense) ---------------------
create table expense_allocations (
  expense_id        uuid not null references expenses(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  share_cents       bigint not null default 0,
  share_percentage  numeric(6,3),
  primary key (expense_id, user_id)
);

-- --- Expense payments (who has actually paid what) ---------------------------
create table expense_payments (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references expenses(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  paid_cents   bigint not null,
  paid_on      date,
  method       text,
  created_at   timestamptz not null default now()
);
create index expense_payments_expense_idx on expense_payments(expense_id);
create index expense_payments_user_idx on expense_payments(user_id);

-- --- Media links (YouTube, Drive, Airbnb, etc.) ------------------------------
create table media_links (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references trips(id) on delete cascade,
  kind            text not null,
  url             text not null,
  title           text,
  description     text,
  thumbnail_url   text,
  is_public       boolean not null default false,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index media_links_trip_idx on media_links(trip_id);

-- --- Map imports & features --------------------------------------------------
create table map_imports (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid references trips(id) on delete cascade,
  uploaded_by           uuid not null references profiles(id) on delete cascade,
  source_format         map_import_format not null,
  source_attachment_id  uuid references attachments(id) on delete set null,
  feature_count         integer not null default 0,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);
create index map_imports_trip_idx on map_imports(trip_id);

create table map_features (
  id            uuid primary key default gen_random_uuid(),
  import_id     uuid references map_imports(id) on delete set null,
  trip_id       uuid references trips(id) on delete cascade,
  feature_type  text not null check (feature_type in ('point','line','polygon')),
  geometry      geography not null,
  properties    jsonb not null default '{}'::jsonb,
  label         text,
  created_at    timestamptz not null default now()
);
create index map_features_trip_idx on map_features(trip_id);
create index map_features_geom_idx on map_features using gist(geometry);

-- --- Trip reviews ------------------------------------------------------------
create table trip_reviews (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references trips(id) on delete cascade,
  author_id           uuid not null references profiles(id) on delete cascade,
  overall             numeric(3,1) not null check (overall between 0 and 10),
  accommodation       numeric(3,1) check (accommodation between 0 and 10),
  transport           numeric(3,1) check (transport between 0 and 10),
  activities_score    numeric(3,1) check (activities_score between 0 and 10),
  value_for_money     numeric(3,1) check (value_for_money between 0 and 10),
  pace                numeric(3,1) check (pace between 0 and 10),
  destination         numeric(3,1) check (destination between 0 and 10),
  would_return_score  numeric(3,1) check (would_return_score between 0 and 10),
  comment             text,
  feeling_tags        text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (trip_id, author_id)
);

-- --- Wish items --------------------------------------------------------------
create table wish_items (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete cascade,
  title                    text not null,
  country                  text,
  city                     text,
  tags                     text[] not null default '{}',
  budget_estimate_cents    bigint,
  duration_days            integer,
  best_season              text,
  priority                 smallint not null default 0,
  company                  wish_company_type not null default 'any',
  status                   wish_status not null default 'idea',
  notes                    text,
  cover_image_url          text,
  converted_to_trip_id     uuid references trips(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index wish_items_user_idx on wish_items(user_id);

-- --- Notifications -----------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  link        text,
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, read_at);

-- --- Destination insights (cached AI / curated content) ----------------------
create table destination_insights (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid references trips(id) on delete cascade,
  stop_id           uuid references trip_stops(id) on delete cascade,
  destination_key   text not null,
  generated_at      timestamptz not null default now(),
  refreshed_at      timestamptz not null default now(),
  provider          text,
  payload           jsonb not null,
  sources           jsonb not null default '[]'::jsonb,
  unique (trip_id, destination_key)
);

-- --- Trip stats snapshots (computed materialized payloads) -------------------
create table trip_stats_snapshots (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips(id) on delete cascade,
  computed_at  timestamptz not null default now(),
  payload      jsonb not null
);
create index trip_stats_snapshots_trip_idx on trip_stats_snapshots(trip_id, computed_at desc);

-- --- Audit log ---------------------------------------------------------------
create table audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references profiles(id) on delete set null,
  trip_id     uuid references trips(id) on delete cascade,
  action      text not null,
  entity      text,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index audit_logs_trip_idx on audit_logs(trip_id);
create index audit_logs_user_idx on audit_logs(user_id);
create index audit_logs_created_idx on audit_logs(created_at desc);
