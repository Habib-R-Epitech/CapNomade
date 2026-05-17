-- =============================================================================
-- Lien jour → étape (ville). Chaque trip_day peut pointer vers un trip_stop
-- pour indiquer dans quelle ville se déroule ce jour.
-- =============================================================================

alter table public.trip_days
  add column if not exists stop_id uuid references public.trip_stops(id) on delete set null;

create index if not exists trip_days_stop_idx on public.trip_days(stop_id);
