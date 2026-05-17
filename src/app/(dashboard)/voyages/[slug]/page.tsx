import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin, CheckCircle2, Users } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { assertTripAccessBySlug } from '@/lib/auth/permissions';
import { asRow, asRows } from '@/lib/supabase/helpers';
import { loadTripStats } from '@/lib/stats/tripStats';
import type { Database, TripRole } from '@/lib/types/database';

type TripRow = Database['public']['Tables']['trips']['Row'];
type StopRow = Database['public']['Tables']['trip_stops']['Row'];
type DayRow = Database['public']['Tables']['trip_days']['Row'];
type ActivityRow = Database['public']['Tables']['activities']['Row'];
type AccommodationRow = Database['public']['Tables']['accommodations']['Row'];
type TransportRow = Database['public']['Tables']['transport_segments']['Row'];
type MediaRow = Database['public']['Tables']['media_links']['Row'];
type ReviewRow = Database['public']['Tables']['trip_reviews']['Row'];

interface MemberRow {
  role: TripRole;
  joined_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripPlanning } from '@/components/trip/TripPlanning';
import { TripExpensesSummary } from '@/components/trip/TripExpensesSummary';
import { TripMembers } from '@/components/trip/TripMembers';
import { TripReview } from '@/components/trip/TripReview';
import { TripActions } from '@/components/trip/TripActions';
import { CompleteTripDialog } from '@/components/trip/CompleteTripDialog';
import { EditTripButton } from '@/components/voyages/EditTripButton';
import { ExpensesCRUD } from '@/components/trip/crud/ExpensesCRUD';
import { TransportsCRUD } from '@/components/trip/crud/TransportsCRUD';
import { StopsCRUD } from '@/components/trip/crud/StopsCRUD';
import { AccommodationsCRUD } from '@/components/trip/crud/AccommodationsCRUD';
import { ActivitiesCRUD } from '@/components/trip/crud/ActivitiesCRUD';
import { DaysCRUD } from '@/components/trip/crud/DaysCRUD';
import { MediaCRUD } from '@/components/trip/crud/MediaCRUD';
import { formatCurrency, formatDateRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TripDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireSession();
  let context;
  try {
    context = await assertTripAccessBySlug(slug, 'viewer');
  } catch {
    notFound();
  }

  const supabase = await getSupabaseServerClient();
  const [
    tripResp,
    stopsResp,
    daysResp,
    activitiesResp,
    accommodationsResp,
    transportsResp,
    membersResp,
    reviewResp,
    mediaResp,
    expensesResp,
    stats,
  ] = await Promise.all([
    supabase.from('trips').select('*').eq('id', context.trip.id).single(),
    supabase.from('trip_stops').select('*').eq('trip_id', context.trip.id).order('order_index'),
    supabase.from('trip_days').select('*').eq('trip_id', context.trip.id).order('date'),
    supabase.from('activities').select('*').eq('trip_id', context.trip.id).order('order_index'),
    supabase
      .from('accommodations')
      .select('*')
      .eq('trip_id', context.trip.id)
      .order('check_in_date', { nullsFirst: false }),
    supabase
      .from('transport_segments')
      .select('*')
      .eq('trip_id', context.trip.id)
      .order('order_index'),
    supabase
      .from('trip_members')
      .select('role, joined_at, profiles!inner(id, full_name, email, avatar_url)')
      .eq('trip_id', context.trip.id),
    supabase
      .from('trip_reviews')
      .select('*')
      .eq('trip_id', context.trip.id)
      .eq('author_id', session.userId)
      .maybeSingle(),
    supabase.from('media_links').select('*').eq('trip_id', context.trip.id),
    supabase
      .from('expenses')
      .select('id, type, label, amount_cents, currency, spent_on, city, note')
      .eq('trip_id', context.trip.id)
      .order('spent_on', { ascending: false, nullsFirst: false }),
    loadTripStats(context.trip.id),
  ]);

  const trip = asRow<TripRow>(tripResp);
  const stops = asRows<StopRow>(stopsResp);
  const days = asRows<DayRow>(daysResp);
  const activities = asRows<ActivityRow>(activitiesResp);
  const accommodations = asRows<AccommodationRow>(accommodationsResp);
  const transports = asRows<TransportRow>(transportsResp);
  const members = asRows<MemberRow>(membersResp);
  const review = asRow<ReviewRow>(reviewResp);
  const media = asRows<MediaRow>(mediaResp);
  const expenses = asRows<{
    id: string;
    type: 'accommodation' | 'transport' | 'activity' | 'food' | 'other';
    label: string;
    amount_cents: number;
    currency: string;
    spent_on: string | null;
    city: string | null;
    note: string | null;
  }>(expensesResp);

  if (!trip) notFound();

  const canEdit = context.canEdit;
  const isCompletable = canEdit && trip.status !== 'completed' && trip.status !== 'archived';

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {trip.cover_image_url && (
        <div className="relative -mx-4 h-56 overflow-hidden md:mx-0 md:h-72 md:rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip.cover_image_url}
            alt={`Couverture de ${trip.title}`}
            className="size-full object-cover"
          />
        </div>
      )}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link href="/voyages" className="hover:text-foreground">
            Mes voyages
          </Link>
          <span>·</span>
          <Badge variant="muted">{statusLabel(trip.status)}</Badge>
          {trip.primary_countries.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {trip.primary_countries.join(', ')}
            </span>
          )}
        </div>
        <h1 className="font-serif text-4xl font-semibold leading-tight md:text-5xl">{trip.title}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {(trip.start_date || trip.end_date) && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" /> {formatDateRange(trip.start_date, trip.end_date)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" /> {members.length}{' '}
            {members.length > 1 ? 'voyageurs' : 'voyageur'}
          </span>
          {stats.totals.overall_cents > 0 && (
            <span>Total : {formatCurrency(stats.totals.overall_cents, trip.base_currency)}</span>
          )}
        </div>
        {trip.description && (
          <p className="max-w-3xl text-balance text-muted-foreground">{trip.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {isCompletable && (
            <CompleteTripDialog tripId={trip.id} tripTitle={trip.title}>
              <Button>
                <CheckCircle2 className="size-4" /> Marquer comme voyage fait
              </Button>
            </CompleteTripDialog>
          )}
          {canEdit && (
            <EditTripButton
              trip={{
                id: trip.id,
                slug: trip.slug,
                title: trip.title,
                description: trip.description,
                start_date: trip.start_date,
                end_date: trip.end_date,
                primary_countries: trip.primary_countries ?? [],
                base_currency: trip.base_currency,
                cover_image_url: trip.cover_image_url,
              }}
            />
          )}
          <TripActions tripId={trip.id} slug={trip.slug} status={trip.status} canEdit={canEdit} isOwner={context.isOwner} />
        </div>
      </header>

      <Tabs defaultValue="planning" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <StyledTab value="planning">Planning</StyledTab>
          <StyledTab value="depenses">Dépenses</StyledTab>
          <StyledTab value="transports">Transports</StyledTab>
          <StyledTab value="etapes">Étapes</StyledTab>
          <StyledTab value="logements">Logements</StyledTab>
          <StyledTab value="medias">Médias</StyledTab>
          <StyledTab value="carte">Carte</StyledTab>
          <StyledTab value="equipe">Équipe</StyledTab>
          <StyledTab value="notation">Notation</StyledTab>
        </TabsList>

        <TabsContent value="planning" className="space-y-6">
          <TripPlanning
            tripId={trip.id}
            days={days.map((d) => ({ id: d.id, date: d.date, title: d.title, notes: d.notes }))}
            activities={activities.map((a) => ({
              id: a.id,
              title: a.title,
              day_id: a.day_id,
              starts_at: a.starts_at,
              ends_at: a.ends_at,
              category: a.category,
              cost_cents: a.cost_cents,
              cost_currency: a.cost_currency,
            }))}
            canEdit={canEdit}
          />
          <section className="space-y-3">
            <h3 className="font-serif text-lg font-semibold">Jours</h3>
            <DaysCRUD
              tripId={trip.id}
              items={days.map((d) => ({ id: d.id, date: d.date, title: d.title, notes: d.notes }))}
              canEdit={canEdit}
            />
          </section>
          <section className="space-y-3">
            <h3 className="font-serif text-lg font-semibold">Activités</h3>
            <ActivitiesCRUD
              tripId={trip.id}
              items={activities.map((a) => ({
                id: a.id,
                title: a.title,
                description: a.description,
                category: a.category,
                starts_at: a.starts_at,
                ends_at: a.ends_at,
                address: a.address,
                url: a.url,
                cost_cents: a.cost_cents,
                cost_currency: a.cost_currency,
              }))}
              baseCurrency={trip.base_currency}
              canEdit={canEdit}
            />
          </section>
        </TabsContent>
        <TabsContent value="depenses" className="space-y-6">
          <TripExpensesSummary
            tripId={trip.id}
            slug={trip.slug}
            stats={stats}
            baseCurrency={trip.base_currency}
          />
          <ExpensesCRUD
            tripId={trip.id}
            items={expenses.map((e) => ({
              id: e.id,
              type: e.type,
              label: e.label,
              amount_cents: e.amount_cents,
              currency: e.currency,
              spent_on: e.spent_on,
              city: e.city,
              note: e.note,
            }))}
            baseCurrency={trip.base_currency}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="transports">
          <TransportsCRUD
            tripId={trip.id}
            items={transports.map((t) => ({
              id: t.id,
              mode: t.mode,
              origin_label: t.origin_label,
              destination_label: t.destination_label,
              depart_at: t.depart_at,
              arrive_at: t.arrive_at,
              carrier: t.carrier,
              reference: t.reference,
              cost_cents: t.cost_cents,
              cost_currency: t.cost_currency,
              notes: t.notes,
            }))}
            baseCurrency={trip.base_currency}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="etapes">
          <StopsCRUD
            tripId={trip.id}
            items={stops.map((s) => ({
              id: s.id,
              name: s.name,
              city: s.city,
              country_code: s.country_code,
              arrival_date: s.arrival_date,
              departure_date: s.departure_date,
              notes: s.notes,
            }))}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="logements">
          <AccommodationsCRUD
            tripId={trip.id}
            items={accommodations.map((a) => ({
              id: a.id,
              name: a.name,
              kind: a.kind,
              check_in_date: a.check_in_date,
              check_out_date: a.check_out_date,
              address: a.address,
              booking_url: a.booking_url,
              cost_cents: a.cost_cents,
              cost_currency: a.cost_currency,
              notes: a.notes,
            }))}
            baseCurrency={trip.base_currency}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="medias">
          <MediaCRUD
            tripId={trip.id}
            items={media.map((m) => ({
              id: m.id,
              kind: normalizeMediaKind(m.kind),
              url: m.url,
              title: m.title,
              description: m.description ?? null,
            }))}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="carte">
          <div className="rounded-xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Carte interactive du voyage — l&apos;intégration MapLibre côté détail s&apos;appuie sur les
              étapes, transports et features importés.
            </p>
            <p className="mt-2 text-sm">
              {stops.length} étape{stops.length > 1 ? 's' : ''} ·{' '}
              {transports.length} segment{transports.length > 1 ? 's' : ''}.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Carte plein écran : bientôt disponible.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="equipe">
          <TripMembers
            tripId={trip.id}
            slug={trip.slug}
            members={members
              .filter((m): m is MemberRow & { profiles: NonNullable<MemberRow['profiles']> } => m.profiles !== null)
              .map((m) => ({ role: m.role, joined_at: m.joined_at, user: m.profiles }))}
            isOwner={context.isOwner}
          />
        </TabsContent>
        <TabsContent value="notation">
          <TripReview
            tripId={trip.id}
            initial={review ?? null}
            canReview={Boolean(context.canEdit) || trip.status === 'completed'}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const MEDIA_KINDS = ['youtube', 'drive', 'photo', 'article', 'booking', 'other'] as const;
type MediaKind = (typeof MEDIA_KINDS)[number];
function normalizeMediaKind(raw: string): MediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(raw) ? (raw as MediaKind) : 'other';
}

function StyledTab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-md border bg-card px-3 py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-soft"
    >
      {children}
    </TabsTrigger>
  );
}

function statusLabel(status: string): string {
  return (
    {
      draft: 'Brouillon',
      planning: 'Planning',
      booked: 'Réservé',
      completed: 'Réalisé',
      archived: 'Archivé',
    } as Record<string, string>
  )[status] ?? status;
}
