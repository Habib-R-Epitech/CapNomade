/**
 * Database types — hand-written for first cut.
 * Regenerate from the live schema with `npm run db:types` once Supabase is running.
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string;
          email: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      trips: {
        Row: {
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
        };
        Insert: Omit<
          Database['public']['Tables']['trips']['Row'],
          'id' | 'created_at' | 'updated_at' | 'archived_at'
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          archived_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['trips']['Row']>;
      };
      trip_members: {
        Row: { trip_id: string; user_id: string; role: TripRole; joined_at: string };
        Insert: { trip_id: string; user_id: string; role: TripRole; joined_at?: string };
        Update: Partial<{ trip_id: string; user_id: string; role: TripRole; joined_at: string }>;
      };
      trip_invitations: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['trip_invitations']['Row']> & {
          trip_id: string;
          invited_email: string;
          invited_by: string;
          token: string;
        };
        Update: Partial<Database['public']['Tables']['trip_invitations']['Row']>;
      };
      trip_stops: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['trip_stops']['Row']> & {
          trip_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['trip_stops']['Row']>;
      };
      trip_days: {
        Row: {
          id: string;
          trip_id: string;
          date: string;
          title: string | null;
          notes: string | null;
          order_index: number;
        };
        Insert: Partial<Database['public']['Tables']['trip_days']['Row']> & {
          trip_id: string;
          date: string;
        };
        Update: Partial<Database['public']['Tables']['trip_days']['Row']>;
      };
      activities: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['activities']['Row']> & {
          trip_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Row']>;
      };
      accommodations: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['accommodations']['Row']> & {
          trip_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['accommodations']['Row']>;
      };
      transport_segments: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['transport_segments']['Row']> & {
          trip_id: string;
          mode: TransportMode;
        };
        Update: Partial<Database['public']['Tables']['transport_segments']['Row']>;
      };
      attachments: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['attachments']['Row']> & {
          trip_id: string;
          bucket: string;
          path: string;
        };
        Update: Partial<Database['public']['Tables']['attachments']['Row']>;
      };
      expenses: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & {
          trip_id: string;
          type: ExpenseType;
          label: string;
          amount_cents: number;
          currency: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Row']>;
      };
      expense_allocations: {
        Row: {
          expense_id: string;
          user_id: string;
          share_cents: number;
          share_percentage: number | null;
        };
        Insert: Database['public']['Tables']['expense_allocations']['Row'];
        Update: Partial<Database['public']['Tables']['expense_allocations']['Row']>;
      };
      expense_payments: {
        Row: {
          id: string;
          expense_id: string;
          user_id: string;
          paid_cents: number;
          paid_on: string | null;
          method: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['expense_payments']['Row']> & {
          expense_id: string;
          user_id: string;
          paid_cents: number;
        };
        Update: Partial<Database['public']['Tables']['expense_payments']['Row']>;
      };
      media_links: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['media_links']['Row']> & {
          trip_id: string;
          kind: string;
          url: string;
        };
        Update: Partial<Database['public']['Tables']['media_links']['Row']>;
      };
      map_imports: {
        Row: {
          id: string;
          trip_id: string | null;
          uploaded_by: string;
          source_format: MapImportFormat;
          source_attachment_id: string | null;
          feature_count: number;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['map_imports']['Row']> & {
          uploaded_by: string;
          source_format: MapImportFormat;
        };
        Update: Partial<Database['public']['Tables']['map_imports']['Row']>;
      };
      map_features: {
        Row: {
          id: string;
          import_id: string | null;
          trip_id: string | null;
          feature_type: 'point' | 'line' | 'polygon';
          geometry: unknown;
          properties: Json;
          label: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['map_features']['Row']> & {
          feature_type: 'point' | 'line' | 'polygon';
          geometry: unknown;
        };
        Update: Partial<Database['public']['Tables']['map_features']['Row']>;
      };
      trip_reviews: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['trip_reviews']['Row']> & {
          trip_id: string;
          author_id: string;
          overall: number;
        };
        Update: Partial<Database['public']['Tables']['trip_reviews']['Row']>;
      };
      wish_items: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['wish_items']['Row']> & {
          user_id: string;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['wish_items']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          link: string | null;
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['notifications']['Row']> & {
          user_id: string;
          type: NotificationType;
          title: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      destination_insights: {
        Row: {
          id: string;
          trip_id: string | null;
          stop_id: string | null;
          destination_key: string;
          generated_at: string;
          refreshed_at: string;
          provider: string | null;
          payload: Json;
          sources: Json;
        };
        Insert: Partial<Database['public']['Tables']['destination_insights']['Row']> & {
          destination_key: string;
          payload: Json;
        };
        Update: Partial<Database['public']['Tables']['destination_insights']['Row']>;
      };
      trip_stats_snapshots: {
        Row: { id: string; trip_id: string; computed_at: string; payload: Json };
        Insert: { id?: string; trip_id: string; computed_at?: string; payload: Json };
        Update: Partial<Database['public']['Tables']['trip_stats_snapshots']['Row']>;
      };
      audit_logs: {
        Row: {
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
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']> & { action: string };
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
      };
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
  };
}
