-- =============================================================================
-- CapNomade — Demo seed
-- Creates a demo profile and three realistic trips (one completed, one
-- planned, one wish). Designed for `supabase db reset` on a local stack.
-- The auth.users row is inserted directly which only works locally.
-- =============================================================================

set search_path = public;

-- --- Demo auth user (local only) ---------------------------------------------
do $$
declare
  v_demo_uid uuid := '00000000-0000-0000-0000-00000000d3m0';
  v_friend_uid uuid := '00000000-0000-0000-0000-0000000fa1ad';
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values (v_demo_uid, '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated',
          'demo@capnomade.app', crypt('capnomade-demo-2026', gen_salt('bf')),
          now(),
          '{"full_name":"Camille Demo","avatar_url":null,"provider":"google"}'::jsonb,
          now(), now())
  on conflict (id) do nothing;

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  values (v_friend_uid, '00000000-0000-0000-0000-000000000000',
          'authenticated', 'authenticated',
          'amie@capnomade.app', crypt('capnomade-demo-2026', gen_salt('bf')),
          now(),
          '{"full_name":"Lou Voyageuse"}'::jsonb,
          now(), now())
  on conflict (id) do nothing;
end $$;

-- Profiles are auto-created by trigger on_auth_user_created.
-- Make sure they're filled in with locale and timezone.
update profiles set full_name = 'Camille Demo', locale = 'fr', timezone = 'Europe/Paris',
                    default_currency = 'EUR'
where email = 'demo@capnomade.app';
update profiles set full_name = 'Lou Voyageuse', locale = 'fr', timezone = 'Europe/Paris'
where email = 'amie@capnomade.app';

-- --- Trip 1 — Bali (completed) -----------------------------------------------
do $$
declare
  v_owner uuid := (select id from profiles where email = 'demo@capnomade.app');
  v_friend uuid := (select id from profiles where email = 'amie@capnomade.app');
  v_trip uuid;
  v_stop_ubud uuid;
  v_stop_canggu uuid;
  v_day_ubud_1 uuid;
  v_acc uuid;
  v_exp uuid;
begin
  insert into trips (id, owner_id, title, slug, description, status, visibility,
                     start_date, end_date, primary_countries, base_currency, total_budget_cents,
                     cover_image_url, metadata)
  values (gen_random_uuid(), v_owner,
          'Échappée à Bali', 'echappee-a-bali',
          'Deux semaines entre rizières d''Ubud et plages de Canggu, en couple. Plongée à Amed, yoga à Ubud, surf à Canggu.',
          'completed', 'private',
          date '2025-09-12', date '2025-09-26',
          array['ID'], 'EUR', 320000,
          null,
          jsonb_build_object('tags', array['plage','yoga','plongée']))
  returning id into v_trip;

  insert into trip_members (trip_id, user_id, role) values (v_trip, v_friend, 'editor')
  on conflict do nothing;

  insert into trip_stops (id, trip_id, name, country_code, city, location,
                          arrival_date, departure_date, order_index)
  values
    (gen_random_uuid(), v_trip, 'Ubud', 'ID', 'Ubud',
     st_setsrid(st_makepoint(115.2625, -8.5069), 4326)::geography,
     '2025-09-12', '2025-09-19', 0)
  returning id into v_stop_ubud;

  insert into trip_stops (id, trip_id, name, country_code, city, location,
                          arrival_date, departure_date, order_index)
  values
    (gen_random_uuid(), v_trip, 'Canggu', 'ID', 'Canggu',
     st_setsrid(st_makepoint(115.1389, -8.6500), 4326)::geography,
     '2025-09-19', '2025-09-26', 1)
  returning id into v_stop_canggu;

  insert into trip_days (id, trip_id, date, title, order_index) values
    (gen_random_uuid(), v_trip, '2025-09-12', 'Arrivée à Ubud, dîner au Locavore', 0)
  returning id into v_day_ubud_1;

  insert into trip_days (trip_id, date, title, order_index) values
    (v_trip, '2025-09-13', 'Rizières de Tegalalang, cours de yoga', 1),
    (v_trip, '2025-09-14', 'Cascade de Tibumana + temple Tirta Empul', 2),
    (v_trip, '2025-09-19', 'Transfert vers Canggu', 7),
    (v_trip, '2025-09-20', 'Cours de surf à Echo Beach', 8);

  insert into accommodations (trip_id, stop_id, name, kind, check_in_date, check_out_date,
                              address, booking_url, cost_cents, cost_currency)
  values
    (v_trip, v_stop_ubud, 'Wapa di Ume Ubud', 'hotel', '2025-09-12', '2025-09-19',
     'Jl. Suweta, Ubud', 'https://www.wapadiumeubud.com', 84000, 'EUR'),
    (v_trip, v_stop_canggu, 'Villa Citakara', 'airbnb', '2025-09-19', '2025-09-26',
     'Jl. Pantai Batu Bolong, Canggu', 'https://airbnb.com/rooms/123456', 95000, 'EUR')
  returning id into v_acc;

  insert into transport_segments (trip_id, mode, origin_label, destination_label,
                                  origin_location, destination_location,
                                  depart_at, arrive_at, duration_minutes, distance_km,
                                  carrier, reference, emission_kgco2e, emission_method,
                                  emission_confidence, emission_calculated_at,
                                  cost_cents, cost_currency, order_index)
  values
    (v_trip, 'plane', 'Paris CDG', 'Denpasar DPS',
     st_setsrid(st_makepoint(2.55, 49.01), 4326)::geography,
     st_setsrid(st_makepoint(115.1675, -8.7482), 4326)::geography,
     '2025-09-11 22:00+02', '2025-09-12 18:30+08',
     940, 12330, 'Singapore Airlines', 'SQ333+SQ938',
     2098.5, 'distance_factor', 'medium', now(),
     90000, 'EUR', 0),
    (v_trip, 'car', 'Ubud', 'Canggu',
     st_setsrid(st_makepoint(115.2625, -8.5069), 4326)::geography,
     st_setsrid(st_makepoint(115.1389, -8.6500), 4326)::geography,
     '2025-09-19 10:00+08', '2025-09-19 11:30+08',
     90, 38, null, null,
     7.3, 'distance_factor', 'high', now(),
     2500, 'EUR', 1);

  -- A handful of realistic expenses
  insert into expenses (id, trip_id, day_id, type, subtype, label, city,
                        amount_cents, currency, spent_on, payment_status, split_method, created_by)
  values
    (gen_random_uuid(), v_trip, v_day_ubud_1, 'food', 'restaurant', 'Dîner Locavore', 'Ubud',
     11000, 'EUR', '2025-09-12', 'paid', 'equal', v_owner),
    (gen_random_uuid(), v_trip, null, 'activity', 'cours', 'Cours de yoga matinal x6', 'Ubud',
     6000, 'EUR', '2025-09-15', 'paid', 'equal', v_owner),
    (gen_random_uuid(), v_trip, null, 'activity', 'excursion', 'Plongée à Amed (2 plongées)', 'Amed',
     14000, 'EUR', '2025-09-17', 'paid', 'equal', v_owner),
    (gen_random_uuid(), v_trip, null, 'food', 'restaurant', 'Warungs locaux (cumulé)', 'Ubud',
     8200, 'EUR', '2025-09-18', 'paid', 'equal', v_owner),
    (gen_random_uuid(), v_trip, null, 'transport', 'taxi', 'Taxis Grab divers', null,
     3500, 'EUR', '2025-09-25', 'paid', 'equal', v_owner);

  insert into trip_reviews (trip_id, author_id, overall, accommodation, transport,
                            activities_score, value_for_money, pace, destination,
                            would_return_score, comment, feeling_tags)
  values (v_trip, v_owner, 9.0, 9.0, 7.5, 9.5, 8.0, 8.5, 9.5, 9.0,
          'Rythme parfait. La plongée à Amed reste un point culminant ; à Canggu, retour au bruit après le calme d''Ubud.',
          array['ressourçant','dépaysant','romantique']);

  insert into media_links (trip_id, kind, url, title, is_public, created_by) values
    (v_trip, 'youtube_video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
     'Mes carnets de Bali — épisode 1', true, v_owner);
end $$;

-- --- Trip 2 — Japon (planning) -----------------------------------------------
do $$
declare
  v_owner uuid := (select id from profiles where email = 'demo@capnomade.app');
  v_trip uuid;
  v_tokyo uuid;
begin
  insert into trips (id, owner_id, title, slug, description, status, visibility,
                     start_date, end_date, primary_countries, base_currency, total_budget_cents, metadata)
  values (gen_random_uuid(), v_owner,
          'Japon — Tokyo, Kyoto, Kanazawa', 'japon-tokyo-kyoto-kanazawa',
          'Trois semaines au Japon en avril 2026, idéalement pendant les cerisiers en fleurs.',
          'planning', 'private',
          date '2026-04-02', date '2026-04-22',
          array['JP'], 'EUR', 600000,
          jsonb_build_object('tags', array['culture','urbain','gastronomie']))
  returning id into v_trip;

  insert into trip_stops (id, trip_id, name, country_code, city, location,
                          arrival_date, departure_date, order_index)
  values
    (gen_random_uuid(), v_trip, 'Tokyo', 'JP', 'Tokyo',
     st_setsrid(st_makepoint(139.6917, 35.6895), 4326)::geography,
     '2026-04-02', '2026-04-09', 0)
  returning id into v_tokyo;

  insert into trip_stops (trip_id, name, country_code, city, location,
                          arrival_date, departure_date, order_index) values
    (v_trip, 'Kyoto',     'JP', 'Kyoto',
     st_setsrid(st_makepoint(135.7681, 35.0116), 4326)::geography,
     '2026-04-09', '2026-04-15', 1),
    (v_trip, 'Kanazawa',  'JP', 'Kanazawa',
     st_setsrid(st_makepoint(136.6256, 36.5613), 4326)::geography,
     '2026-04-15', '2026-04-19', 2),
    (v_trip, 'Tokyo',     'JP', 'Tokyo (retour)',
     st_setsrid(st_makepoint(139.6917, 35.6895), 4326)::geography,
     '2026-04-19', '2026-04-22', 3);

  insert into transport_segments (trip_id, mode, origin_label, destination_label,
                                  origin_location, destination_location,
                                  depart_at, arrive_at, distance_km,
                                  emission_kgco2e, emission_method, emission_confidence,
                                  emission_calculated_at, order_index)
  values
    (v_trip, 'plane', 'Paris CDG', 'Tokyo HND',
     st_setsrid(st_makepoint(2.55, 49.01), 4326)::geography,
     st_setsrid(st_makepoint(139.781, 35.553), 4326)::geography,
     '2026-04-02 11:00+02', '2026-04-03 07:00+09', 9710,
     1652.4, 'distance_factor', 'medium', now(), 0);
end $$;

-- --- Trip 3 — Wish: Patagonie ------------------------------------------------
insert into wish_items (user_id, title, country, city, tags, budget_estimate_cents,
                        duration_days, best_season, priority, company, status, notes)
select id, 'Patagonie — Torres del Paine', 'Chili', 'Puerto Natales',
       array['trek','nature','grand froid'],
       450000, 14, 'novembre à mars', 5, 'couple', 'researching',
       'Trek W : 5 jours, refuges à réserver très à l''avance.'
from profiles where email = 'demo@capnomade.app';

-- --- Notification de bienvenue ----------------------------------------------
insert into notifications (user_id, type, title, body, link)
select id, 'generic', 'Bienvenue sur CapNomade',
       'Trois voyages de démo ont été ajoutés à votre compte. Bon planning !',
       '/dashboard'
from profiles where email = 'demo@capnomade.app';
