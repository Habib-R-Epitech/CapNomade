-- =============================================================================
-- CapNomade — Functions, triggers, helpers
-- =============================================================================

set search_path = public;

-- --- updated_at trigger ------------------------------------------------------
create or replace function tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function tg_set_updated_at();

create trigger trips_set_updated_at
  before update on trips
  for each row execute function tg_set_updated_at();

create trigger expenses_set_updated_at
  before update on expenses
  for each row execute function tg_set_updated_at();

create trigger trip_reviews_set_updated_at
  before update on trip_reviews
  for each row execute function tg_set_updated_at();

create trigger wish_items_set_updated_at
  before update on wish_items
  for each row execute function tg_set_updated_at();

-- --- Auto-create profile on auth signup --------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Auto-add owner as trip_member on trip creation --------------------------
create or replace function public.handle_new_trip() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- --- Permission helpers ------------------------------------------------------
create or replace function public.current_email() returns citext
language sql stable security definer set search_path = public, auth as $$
  select (select email::citext from auth.users where id = auth.uid());
$$;

create or replace function public.is_trip_member(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists(
    select 1 from public.trip_members
    where trip_id = p_trip and user_id = auth.uid()
  );
$$;

create or replace function public.trip_role_of(p_trip uuid) returns trip_role
language sql stable security definer set search_path = public as $$
  select role from public.trip_members
  where trip_id = p_trip and user_id = auth.uid();
$$;

create or replace function public.is_trip_editor(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.trip_role_of(p_trip) in ('owner','editor');
$$;

create or replace function public.is_trip_owner(p_trip uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.trip_role_of(p_trip) = 'owner';
$$;

-- --- Slug helper -------------------------------------------------------------
create or replace function public.slugify(input text) returns text
language sql immutable as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'),
    '-{2,}', '-', 'g'
  ));
$$;

-- --- Accept an invitation (server-side function with security definer) -------
-- Idempotent: returns the trip_id; creates trip_members row if not present.
create or replace function public.accept_trip_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_invitation public.trip_invitations%rowtype;
  v_email      citext;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  v_email := public.current_email();

  select * into v_invitation
  from public.trip_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = '22023';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = '22023';
  end if;

  if v_invitation.expires_at < now() then
    update public.trip_invitations
    set status = 'expired'
    where id = v_invitation.id;
    raise exception 'invitation_expired' using errcode = '22023';
  end if;

  if v_invitation.invited_email <> v_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invitation.trip_id, auth.uid(), v_invitation.role)
  on conflict (trip_id, user_id) do update set role = excluded.role;

  update public.trip_invitations
  set status = 'accepted', responded_at = now()
  where id = v_invitation.id;

  insert into public.audit_logs (user_id, trip_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    v_invitation.trip_id,
    'invitation.accepted',
    'trip_invitation',
    v_invitation.id,
    jsonb_build_object('role', v_invitation.role)
  );

  return v_invitation.trip_id;
end;
$$;

create or replace function public.decline_trip_invitation(p_token text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_invitation public.trip_invitations%rowtype;
  v_email      citext;
begin
  if auth.uid() is null then
    raise exception 'auth_required' using errcode = '42501';
  end if;

  v_email := public.current_email();

  select * into v_invitation
  from public.trip_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = '22023';
  end if;

  if v_invitation.invited_email <> v_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  if v_invitation.status <> 'pending' then
    return;
  end if;

  update public.trip_invitations
  set status = 'declined', responded_at = now()
  where id = v_invitation.id;

  insert into public.audit_logs (user_id, trip_id, action, entity, entity_id)
  values (auth.uid(), v_invitation.trip_id, 'invitation.declined', 'trip_invitation', v_invitation.id);
end;
$$;

-- --- Storage buckets ---------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('trip-covers', 'trip-covers', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/avif']),
  ('trip-attachments', 'trip-attachments', false, 25165824,
   array['application/pdf','image/jpeg','image/png','image/webp',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-excel',
         'text/csv','application/json']),
  ('map-sources', 'map-sources', false, 26214400,
   array['application/vnd.google-earth.kml+xml',
         'application/vnd.google-earth.kmz',
         'application/gpx+xml','application/xml','text/xml',
         'application/geo+json','application/json',
         'text/csv',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;
