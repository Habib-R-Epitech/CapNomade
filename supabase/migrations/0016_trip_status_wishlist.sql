-- =============================================================================
-- "Envies" : adopt a 'wishlist' trip status so envies become full-fledged trips
-- (same detail page, same widgets) instead of living in a separate wish_items
-- table. wish_items is left in place for backwards compatibility but the UI
-- no longer surfaces it.
-- =============================================================================

alter type public.trip_status add value if not exists 'wishlist';

notify pgrst, 'reload schema';
