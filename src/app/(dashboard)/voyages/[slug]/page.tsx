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
import { TripTransports } from '@/components/trip/TripTransports';
import { TripMembers } from '@/components/trip/TripMembers';
import { TripReview } from '@/components/trip/TripReview';
import { TripMedia } from '@/components/trip/TripMedia';
import { TripActions } from '@/components/trip/TripActions';
import { CompleteTripDialog } from '@/components/trip/CompleteTripDialog';
import { EditTripButton } from '@/components/voyages/EditTripButton';
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
          <StyledTab value="logements">Logements</StyledTab>
          <StyledTab value="medias">Médias</StyledTab>
          <StyledTab value="carte">Carte</StyledTab>
          <StyledTab value="equipe">Équipe</StyledTab>
          <StyledTab value="notation">Notation</StyledTab>
        </TabsList>

        <TabsContent value="planning">
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
        </TabsContent>
        <TabsContent value="depenses">
          <TripExpensesSummary
            tripId={trip.id}
            slug={trip.slug}
            stats={stats}
            baseCurrency={trip.base_currency}
          />
        </TabsContent>
        <TabsContent value="transports">
          <TripTransports
            segments={transports.map((t) => ({
              id: t.id,
              mode: t.mode,
              origin_label: t.origin_label,
              destination_label: t.destination_label,
              depart_at: t.depart_at,
              arrive_at: t.arrive_at,
              distance_km: t.distance_km,
              duration_minutes: t.duration_minutes,
              carrier: t.carrier,
              reference: t.reference,
              emission_kgco2e: t.emission_kgco2e,
              emission_method: t.emission_method,
              emission_confidence: t.emission_confidence,
              cost_cents: t.cost_cents,
              cost_currency: t.cost_currency,
            }))}
            canEdit={canEdit}
          />
        </TabsContent>
        <TabsContent value="logements">
          <ul className="grid gap-3 sm:grid-cols-2">
            {accommodations.map((a) => (
              <li key={a.id} className="rounded-xl border bg-card p-4">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.kind}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateRange(a.check_in_date, a.check_out_date)}
                </p>
                {a.address && <p className="mt-1 text-sm">{a.address}</p>}
                {a.cost_cents != null && (
                  <p className="mt-2 text-sm font-medium">
                    {formatCurrency(a.cost_cents, a.cost_currency ?? trip.base_currency)}
                  </p>
                )}
                {a.booking_url && (
                  <a
                    href={a.booking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-primary hover:underline"
                  >
                    Voir la réservation
                  </a>
                )}
              </li>
            ))}
            {accommodations.length === 0 && (
              <li className="col-span-full rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Aucun logement renseigné.
              </li>
            )}
          </ul>
        </TabsContent>
        <TabsContent value="medias">
          <TripMedia
            tripId={trip.id}
            links={media.map((m) => ({
              id: m.id,
              url: m.url,
              kind: m.kind,
              title: m.title,
              thumbnail_url: m.thumbnail_url,
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
