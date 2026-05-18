-- =============================================================================
-- Vol aller / vol retour : one row per direction per trip. Waypoints are
-- stored inline as JSON ([{ name, lng, lat }, ...]) so layovers don't have to
-- be added to trip_stops first.
-- =============================================================================

create table if not exists public.trip_flights (
  id                      uuid primary key default gen_random_uuid(),
  trip_id                 uuid not null references public.trips(id) on delete cascade,
  direction               text not null check (direction in ('outbound', 'return')),
  waypoints               jsonb not null default '[]'::jsonb,
  total_distance_km       numeric(10,2),
  total_duration_minutes  integer,
  total_emission_kgco2e   numeric(10,2),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index if not exists trip_flights_unique_direction
  on public.trip_flights(trip_id, direction);

create index if not exists trip_flights_trip_idx on public.trip_flights(trip_id);

alter table public.trip_flights enable row level security;

create policy "flights_member_read" on public.trip_flights
  for select using (public.is_trip_member(trip_id));
create policy "flights_editor_insert" on public.trip_flights
  for insert with check (public.is_trip_editor(trip_id));
create policy "flights_editor_update" on public.trip_flights
  for update using (public.is_trip_editor(trip_id))
  with check (public.is_trip_editor(trip_id));
create policy "flights_editor_delete" on public.trip_flights
  for delete using (public.is_trip_editor(trip_id));

drop trigger if exists trip_flights_set_updated_at on public.trip_flights;
create trigger trip_flights_set_updated_at
  before update on public.trip_flights
  for each row execute function tg_set_updated_at();

notify pgrst, 'reload schema';
