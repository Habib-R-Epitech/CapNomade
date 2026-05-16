-- =============================================================================
-- CapNomade — Row Level Security policies
-- Private by default. Helper functions live in 0002_functions_triggers.sql.
-- =============================================================================

set search_path = public;

-- Enable RLS on every business table.
alter table profiles               enable row level security;
alter table trips                  enable row level security;
alter table trip_members           enable row level security;
alter table trip_invitations       enable row level security;
alter table trip_stops             enable row level security;
alter table trip_days              enable row level security;
alter table activities             enable row level security;
alter table accommodations         enable row level security;
alter table transport_segments     enable row level security;
alter table attachments            enable row level security;
alter table expenses               enable row level security;
alter table expense_allocations    enable row level security;
alter table expense_payments       enable row level security;
alter table media_links            enable row level security;
alter table map_imports            enable row level security;
alter table map_features           enable row level security;
alter table trip_reviews           enable row level security;
alter table wish_items             enable row level security;
alter table notifications          enable row level security;
alter table destination_insights   enable row level security;
alter table trip_stats_snapshots   enable row level security;
alter table audit_logs             enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create policy "profiles_self_read" on profiles
  for select using (id = auth.uid());

create policy "profiles_collaborators_read" on profiles
  for select using (
    exists (
      select 1 from trip_members tm1
      join trip_members tm2 on tm2.trip_id = tm1.trip_id
      where tm1.user_id = auth.uid() and tm2.user_id = profiles.id
    )
  );

create policy "profiles_self_insert" on profiles
  for insert with check (id = auth.uid());

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- trips
-- ----------------------------------------------------------------------------
create policy "trips_read_public" on trips
  for select using (visibility = 'public');

create policy "trips_read_members" on trips
  for select using (public.is_trip_member(id));

create policy "trips_owner_insert" on trips
  for insert with check (owner_id = auth.uid());

create policy "trips_editor_update" on trips
  for update using (public.is_trip_editor(id))
                  with check (public.is_trip_editor(id));

create policy "trips_owner_delete" on trips
  for delete using (public.is_trip_owner(id));

-- ----------------------------------------------------------------------------
-- trip_members
-- ----------------------------------------------------------------------------
create policy "members_read_co_members" on trip_members
  for select using (
    user_id = auth.uid() OR public.is_trip_member(trip_id)
  );

create policy "members_owner_insert" on trip_members
  for insert with check (
    public.is_trip_owner(trip_id)
    OR user_id = auth.uid()   -- self-insert handled by accept_trip_invitation()
  );

create policy "members_owner_update" on trip_members
  for update using (public.is_trip_owner(trip_id))
                  with check (public.is_trip_owner(trip_id));

create policy "members_owner_or_self_delete" on trip_members
  for delete using (public.is_trip_owner(trip_id) OR user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- trip_invitations
-- ----------------------------------------------------------------------------
create policy "invites_read_editor_or_invitee" on trip_invitations
  for select using (
    public.is_trip_editor(trip_id)
    OR invited_email = public.current_email()
  );

create policy "invites_editor_insert" on trip_invitations
  for insert with check (public.is_trip_editor(trip_id) AND invited_by = auth.uid());

create policy "invites_update_invitee_or_editor" on trip_invitations
  for update using (
    invited_email = public.current_email() OR public.is_trip_editor(trip_id)
  );

create policy "invites_owner_delete" on trip_invitations
  for delete using (public.is_trip_owner(trip_id));

-- ----------------------------------------------------------------------------
-- Generic "trip-scoped" pattern: member can SELECT, editor can write.
-- We define a reusable macro via repeated policies.
-- ----------------------------------------------------------------------------

-- trip_stops
create policy "stops_member_read"   on trip_stops  for select using (public.is_trip_member(trip_id));
create policy "stops_editor_insert" on trip_stops  for insert with check (public.is_trip_editor(trip_id));
create policy "stops_editor_update" on trip_stops  for update using (public.is_trip_editor(trip_id))
                                                                 with check (public.is_trip_editor(trip_id));
create policy "stops_editor_delete" on trip_stops  for delete using (public.is_trip_editor(trip_id));

-- trip_days
create policy "days_member_read"    on trip_days   for select using (public.is_trip_member(trip_id));
create policy "days_editor_insert"  on trip_days   for insert with check (public.is_trip_editor(trip_id));
create policy "days_editor_update"  on trip_days   for update using (public.is_trip_editor(trip_id))
                                                                 with check (public.is_trip_editor(trip_id));
create policy "days_editor_delete"  on trip_days   for delete using (public.is_trip_editor(trip_id));

-- activities
create policy "activities_member_read"   on activities for select using (public.is_trip_member(trip_id));
create policy "activities_editor_insert" on activities for insert with check (public.is_trip_editor(trip_id));
create policy "activities_editor_update" on activities for update using (public.is_trip_editor(trip_id))
                                                                     with check (public.is_trip_editor(trip_id));
create policy "activities_editor_delete" on activities for delete using (public.is_trip_editor(trip_id));

-- accommodations
create policy "accommodations_member_read"   on accommodations for select using (public.is_trip_member(trip_id));
create policy "accommodations_editor_insert" on accommodations for insert with check (public.is_trip_editor(trip_id));
create policy "accommodations_editor_update" on accommodations for update using (public.is_trip_editor(trip_id))
                                                                             with check (public.is_trip_editor(trip_id));
create policy "accommodations_editor_delete" on accommodations for delete using (public.is_trip_editor(trip_id));

-- transport_segments
create policy "transports_member_read"   on transport_segments for select using (public.is_trip_member(trip_id));
create policy "transports_editor_insert" on transport_segments for insert with check (public.is_trip_editor(trip_id));
create policy "transports_editor_update" on transport_segments for update using (public.is_trip_editor(trip_id))
                                                                             with check (public.is_trip_editor(trip_id));
create policy "transports_editor_delete" on transport_segments for delete using (public.is_trip_editor(trip_id));

-- attachments
create policy "attachments_member_read"   on attachments for select using (public.is_trip_member(trip_id));
create policy "attachments_editor_insert" on attachments for insert with check (public.is_trip_editor(trip_id) AND uploaded_by = auth.uid());
create policy "attachments_editor_delete" on attachments for delete using (public.is_trip_editor(trip_id));

-- expenses
create policy "expenses_member_read"   on expenses for select using (public.is_trip_member(trip_id));
create policy "expenses_editor_insert" on expenses for insert with check (public.is_trip_editor(trip_id));
create policy "expenses_editor_update" on expenses for update using (public.is_trip_editor(trip_id))
                                                                 with check (public.is_trip_editor(trip_id));
create policy "expenses_editor_delete" on expenses for delete using (public.is_trip_editor(trip_id));

-- expense_allocations
create policy "alloc_member_read" on expense_allocations for select using (
  exists (select 1 from expenses e where e.id = expense_id and public.is_trip_member(e.trip_id))
);
create policy "alloc_editor_write" on expense_allocations for all using (
  exists (select 1 from expenses e where e.id = expense_id and public.is_trip_editor(e.trip_id))
) with check (
  exists (select 1 from expenses e where e.id = expense_id and public.is_trip_editor(e.trip_id))
);

-- expense_payments
create policy "payments_member_read" on expense_payments for select using (
  exists (select 1 from expenses e where e.id = expense_id and public.is_trip_member(e.trip_id))
);
create policy "payments_editor_write" on expense_payments for all using (
  exists (select 1 from expenses e where e.id = expense_id and public.is_trip_editor(e.trip_id))
) with check (
  exists (select 1 from expenses e where e.id = expense_id and public.is_trip_editor(e.trip_id))
);

-- media_links
create policy "media_member_read"   on media_links for select using (public.is_trip_member(trip_id));
create policy "media_editor_insert" on media_links for insert with check (public.is_trip_editor(trip_id));
create policy "media_editor_update" on media_links for update using (public.is_trip_editor(trip_id))
                                                                 with check (public.is_trip_editor(trip_id));
create policy "media_editor_delete" on media_links for delete using (public.is_trip_editor(trip_id));

-- map_imports
create policy "map_imports_member_read"   on map_imports for select using (trip_id is null and uploaded_by = auth.uid() OR public.is_trip_member(trip_id));
create policy "map_imports_user_insert"   on map_imports for insert with check (uploaded_by = auth.uid());
create policy "map_imports_owner_delete"  on map_imports for delete using (uploaded_by = auth.uid() OR public.is_trip_editor(trip_id));

-- map_features
create policy "map_features_member_read"   on map_features for select using (public.is_trip_member(trip_id));
create policy "map_features_editor_write"  on map_features for all using (public.is_trip_editor(trip_id))
                                                                       with check (public.is_trip_editor(trip_id));

-- trip_reviews — any member can write their own, all members can read.
create policy "reviews_member_read"     on trip_reviews for select using (public.is_trip_member(trip_id));
create policy "reviews_self_insert"     on trip_reviews for insert with check (public.is_trip_member(trip_id) AND author_id = auth.uid());
create policy "reviews_self_update"     on trip_reviews for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "reviews_self_delete"     on trip_reviews for delete using (author_id = auth.uid());

-- wish_items — strictly personal.
create policy "wishes_self_all" on wish_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications — only recipient.
create policy "notifications_self_read"   on notifications for select using (user_id = auth.uid());
create policy "notifications_self_update" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_self_delete" on notifications for delete using (user_id = auth.uid());

-- destination_insights — readable by members, writable by editors.
create policy "insights_member_read"  on destination_insights for select using (
  trip_id is null OR public.is_trip_member(trip_id)
);
create policy "insights_editor_write" on destination_insights for all using (
  trip_id is null OR public.is_trip_editor(trip_id)
) with check (
  trip_id is null OR public.is_trip_editor(trip_id)
);

-- trip_stats_snapshots — members read, system writes (service role).
create policy "stats_member_read" on trip_stats_snapshots for select using (public.is_trip_member(trip_id));

-- audit_logs — members of the trip can read the trip's audit; users read their own actions.
create policy "audit_member_read" on audit_logs for select using (
  (trip_id is not null AND public.is_trip_member(trip_id))
  OR user_id = auth.uid()
);

-- ----------------------------------------------------------------------------
-- Storage policies
-- ----------------------------------------------------------------------------
-- trip-covers: public read, members write covers of their own trips (path = trips/<trip_id>/...)
create policy "trip_covers_public_read" on storage.objects
  for select using (bucket_id = 'trip-covers');

create policy "trip_covers_editor_write" on storage.objects
  for insert with check (
    bucket_id = 'trip-covers'
    AND auth.uid() is not null
    AND public.is_trip_editor((split_part(name, '/', 2))::uuid)
  );

create policy "trip_covers_editor_update" on storage.objects
  for update using (
    bucket_id = 'trip-covers'
    AND public.is_trip_editor((split_part(name, '/', 2))::uuid)
  );

-- trip-attachments: signed-url only; member can list, editor can write.
create policy "trip_attachments_member_read" on storage.objects
  for select using (
    bucket_id = 'trip-attachments'
    AND public.is_trip_member((split_part(name, '/', 2))::uuid)
  );

create policy "trip_attachments_editor_write" on storage.objects
  for insert with check (
    bucket_id = 'trip-attachments'
    AND public.is_trip_editor((split_part(name, '/', 2))::uuid)
  );

create policy "trip_attachments_editor_delete" on storage.objects
  for delete using (
    bucket_id = 'trip-attachments'
    AND public.is_trip_editor((split_part(name, '/', 2))::uuid)
  );

-- map-sources: uploader read/delete only.
create policy "map_sources_owner_read" on storage.objects
  for select using (bucket_id = 'map-sources' AND owner = auth.uid());

create policy "map_sources_owner_write" on storage.objects
  for insert with check (bucket_id = 'map-sources' AND owner = auth.uid());

create policy "map_sources_owner_delete" on storage.objects
  for delete using (bucket_id = 'map-sources' AND owner = auth.uid());
