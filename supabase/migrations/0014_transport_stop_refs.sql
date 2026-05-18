-- =============================================================================
-- Link transport_segments to specific trip_stops so the journey builder can
-- record "from city A to city B" rather than free-form labels. Also adds a
-- 'motorcycle' value to the transport_mode enum.
-- =============================================================================

-- Postgres only allows ADD VALUE outside a transaction OR in a separate
-- transaction from any usage. Doing it first, alone, in this migration keeps
-- us safe even if Supabase wraps the file in BEGIN/COMMIT.
alter type public.transport_mode add value if not exists 'motorcycle';

alter table public.transport_segments
  add column if not exists origin_stop_id      uuid references public.trip_stops(id) on delete set null,
  add column if not exists destination_stop_id uuid references public.trip_stops(id) on delete set null;

create index if not exists transport_segments_origin_stop_idx      on public.transport_segments(origin_stop_id);
create index if not exists transport_segments_destination_stop_idx on public.transport_segments(destination_stop_id);

notify pgrst, 'reload schema';
