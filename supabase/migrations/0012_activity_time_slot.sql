-- =============================================================================
-- Activities : add time_slot to organize a day in 3 buckets (Matin / Après-midi
-- / Journée). Default 'day' so existing rows are visible in the new planning
-- board.
-- =============================================================================

create type activity_time_slot as enum ('morning', 'afternoon', 'day');

alter table public.activities
  add column if not exists time_slot activity_time_slot not null default 'day';

create index if not exists activities_day_slot_idx
  on public.activities(day_id, time_slot, order_index);
