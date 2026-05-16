/**
 * Database types — hand-written for first cut.
 * Regenerate from the live schema with `npm run db:types` once Supabase is running.
 *
 * The shape mirrors what `supabase gen types typescript` produces:
 *  - Each table has Row / Insert / Update / Relationships (Relationships is `[]`
 *    when we don't model FK relations explicitly; Supabase still needs the field
 *    to be present so its generic constraints resolve and column types don't
 *    collapse to `never`).
 *  - The schema (`public`) also exposes Views, Functions, Enums, CompositeTypes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TripStatus = 'draft' | 'planning' | 'booked' | 'completed' | 'archived';
export type TripVisibility = 'private' | 'members' | 'public';
export type TripRole = 'owner' | 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
export type ExpenseType = 'accommodation' | 'transport' | 'activity' | 'food' | 'other';
export type ExpensePaymentStatus = 'paid' | 'partial' | 'unpaid';
export type ExpenseSplitMethod = 'equal' | 'custom' | 'percentage' | 'fixed_amount';
export type TransportMode = 'plane' | 'car' | 'train' | 'bus' | 'ferry' | 'other';
export type AccommodationType = 'hotel' | 'airbnb' | 'hostel' | 'camping' | 'friends' | 'other';
export type WishStatus = 'idea' | 'researching' | 'almost_ready' | 'planned';
export type WishCompanyType = 'solo' | 'couple' | 'friends' | 'family' | 'any';
export type NotificationType =
  | 'invitation'
  | 'trip_shared'
  | 'trip_updated'
  | 'review_reminder'
  | 'generic';
export type MapImportFormat = 'kml' | 'kmz' | 'gpx' | 'geojson' | 'csv' | 'xlsx';
export type CarbonMethod = 'travel_impact_model' | 'distance_factor' | 'fallback' | 'manual';

/**
 * Helper: declare a table row.
 * Insert/Update kept as `Partial<Row>` — required-field enforcement is done
 * upstream via Zod schemas in server actions. Keeping the intersection
 * `Partial<Row> & Pick<Row, K>` collapses Supabase's overloaded `.insert()`
 * argument inference to `never`, which breaks the type check at every insert
 * call site.
 */
type TableShape<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

// Row interfaces -------------------------------------------------------------

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
  timezone: string;
  default_currency: string;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TripRow {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  description: string | null;
  status: TripStatus;
  visibility: TripVisibility;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  primary_countries: string[];
  base_currency: string;
  total_budget_cents: number | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface TripMemberRow {
  trip_id: string;
  user_id: string;
  role: TripRole;
  joined_at: string;
}

interface TripInvitationRow {
  id: string;
  trip_id: string;
  invited_email: string;
  invited_by: string;
  role: TripRole;
  status: InvitationStatus;
  token: string;
  message: string | null;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
}

interface TripStopRow {
  id: string;
  trip_id: string;
  name: string;
  country_code: string | null;
  city: string | null;
  region: string | null;
  location: unknown | null;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
  order_index: number;
  created_at: string;
}

interface TripDayRow {
  id: string;
  trip_id: string;
  date: string;
  title: string | null;
  notes: string | null;
  order_index: number;
}

interface ActivityRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  stop_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes: number | null;
  location: unknown | null;
  address: string | null;
  url: string | null;
  cost_cents: number | null;
  cost_currency: string | null;
  is_booked: boolean;
  booking_reference: string | null;
  order_index: number;
  created_at: string;
}

interface AccommodationRow {
  id: string;
  trip_id: string;
  stop_id: string | null;
  name: string;
  kind: AccommodationType;
  check_in_date: string | null;
  check_out_date: string | null;
  address: string | null;
  location: unknown | null;
  booking_url: string | null;
  confirmation_number: string | null;
  cost_cents: number | null;
  cost_currency: string | null;
  notes: string | null;
  created_at: string;
}

interface TransportSegmentRow {
  id: string;
  trip_id: string;
  mode: TransportMode;
  origin_label: string | null;
  destination_label: string | null;
  origin_location: unknown | null;
  destination_location: unknown | null;
  depart_at: string | null;
  arrive_at: string | null;
  duration_minutes: number | null;
  distance_km: number | null;
  carrier: string | null;
  reference: string | null;
  emission_kgco2e: number | null;
  emission_method: CarbonMethod | null;
  emission_confidence: string | null;
  emission_calculated_at: string | null;
  emission_payload: Json | null;
  geometry: unknown | null;
  cost_cents: number | null;
  cost_currency: string | null;
  toll_cents: number | null;
  fuel_cents: number | null;
  notes: string | null;
  order_index: number;
  created_at: string;
}

interface AttachmentRow {
  id: string;
  trip_id: string;
  uploaded_by: string | null;
  bucket: string;
  path: string;
  mime_type: string | null;
  size_bytes: number | null;
  original_name: string | null;
  is_private: boolean;
  created_at: string;
}

interface ExpenseRow {
  id: string;
  trip_id: string;
  day_id: string | null;
  stop_id: string | null;
  type: ExpenseType;
  subtype: string | null;
  label: string;
  city: string | null;
  amount_cents: number;
  currency: string;
  fx_rate: number | null;
  amount_base_cents: number | null;
  spent_on: string | null;
  payment_status: ExpensePaymentStatus;
  split_method: ExpenseSplitMethod;
  link: string | null;
  note: string | null;
  attachment_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ExpenseAllocationRow {
  expense_id: string;
  user_id: string;
  share_cents: number;
  share_percentage: number | null;
}

interface ExpensePaymentRow {
  id: string;
  expense_id: string;
  user_id: string;
  paid_cents: number;
  paid_on: string | null;
  method: string | null;
  created_at: string;
}

interface MediaLinkRow {
  id: string;
  trip_id: string;
  kind: string;
  url: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

interface MapImportRow {
  id: string;
  trip_id: string | null;
  uploaded_by: string;
  source_format: MapImportFormat;
  source_attachment_id: string | null;
  feature_count: number;
  metadata: Json;
  created_at: string;
}

interface MapFeatureRow {
  id: string;
  import_id: string | null;
  trip_id: string | null;
  feature_type: 'point' | 'line' | 'polygon';
  geometry: unknown;
  properties: Json;
  label: string | null;
  created_at: string;
}

interface TripReviewRow {
  id: string;
  trip_id: string;
  author_id: string;
  overall: number;
  accommodation: number | null;
  transport: number | null;
  activities_score: number | null;
  value_for_money: number | null;
  pace: number | null;
  destination: number | null;
  would_return_score: number | null;
  comment: string | null;
  feeling_tags: string[];
  created_at: string;
  updated_at: string;
}

interface WishItemRow {
  id: string;
  user_id: string;
  title: string;
  country: string | null;
  city: string | null;
  tags: string[];
  budget_estimate_cents: number | null;
  duration_days: number | null;
  best_season: string | null;
  priority: number;
  company: WishCompanyType;
  status: WishStatus;
  notes: string | null;
  cover_image_url: string | null;
  converted_to_trip_id: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  payload: Json;
  read_at: string | null;
  created_at: string;
}

interface DestinationInsightsRow {
  id: string;
  trip_id: string | null;
  stop_id: string | null;
  destination_key: string;
  generated_at: string;
  refreshed_at: string;
  provider: string | null;
  payload: Json;
  sources: Json;
}

interface TripStatsSnapshotRow {
  id: string;
  trip_id: string;
  computed_at: string;
  payload: Json;
}

interface AuditLogRow {
  id: number;
  user_id: string | null;
  trip_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Database --------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<ProfileRow>;
      trips: TableShape<TripRow>;
      trip_members: TableShape<TripMemberRow>;
      trip_invitations: TableShape<TripInvitationRow>;
      trip_stops: TableShape<TripStopRow>;
      trip_days: TableShape<TripDayRow>;
      activities: TableShape<ActivityRow>;
      accommodations: TableShape<AccommodationRow>;
      transport_segments: TableShape<TransportSegmentRow>;
      attachments: TableShape<AttachmentRow>;
      expenses: TableShape<ExpenseRow>;
      expense_allocations: TableShape<ExpenseAllocationRow>;
      expense_payments: TableShape<ExpensePaymentRow>;
      media_links: TableShape<MediaLinkRow>;
      map_imports: TableShape<MapImportRow>;
      map_features: TableShape<MapFeatureRow>;
      trip_reviews: TableShape<TripReviewRow>;
      wish_items: TableShape<WishItemRow>;
      notifications: TableShape<NotificationRow>;
      destination_insights: TableShape<DestinationInsightsRow>;
      trip_stats_snapshots: TableShape<TripStatsSnapshotRow>;
      audit_logs: TableShape<AuditLogRow>;
    };
    Views: Record<string, never>;
    Functions: {
      accept_trip_invitation: { Args: { p_token: string }; Returns: string };
      decline_trip_invitation: { Args: { p_token: string }; Returns: void };
    };
    Enums: {
      trip_status: TripStatus;
      trip_visibility: TripVisibility;
      trip_role: TripRole;
      invitation_status: InvitationStatus;
      expense_type: ExpenseType;
      expense_payment_status: ExpensePaymentStatus;
      expense_split_method: ExpenseSplitMethod;
      transport_mode: TransportMode;
      accommodation_type: AccommodationType;
      wish_status: WishStatus;
      wish_company_type: WishCompanyType;
      notification_type: NotificationType;
      map_import_format: MapImportFormat;
      carbon_method: CarbonMethod;
    };
    CompositeTypes: Record<string, never>;
  };
}
