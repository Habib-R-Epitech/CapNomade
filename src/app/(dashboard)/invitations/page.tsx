import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { asRows } from '@/lib/supabase/helpers';
import { EmptyState } from '@/components/ui/empty-state';
import { InvitationCard } from './InvitationCard';
import type { InvitationStatus, TripRole } from '@/lib/types/database';

export const metadata: Metadata = { title: 'Invitations', robots: { index: false, follow: false } };

interface InvitationRow {
  id: string;
  token: string;
  role: TripRole;
  status: InvitationStatus;
  message: string | null;
  created_at: string;
  expires_at: string;
  trips: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    primary_countries: string[];
    start_date: string | null;
    end_date: string | null;
  } | null;
}

export default async function InvitationsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const resp = await supabase
    .from('trip_invitations')
    .select(
      'id, token, role, status, message, created_at, expires_at, trips!inner(id, title, slug, description, primary_countries, start_date, end_date)',
    )
    .eq('invited_email', session.email)
    .order('created_at', { ascending: false });

  const invitations = asRows<InvitationRow>(resp);
  const pending = invitations.filter((i) => i.status === 'pending');
  const handled = invitations.filter((i) => i.status !== 'pending');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Voyages partagés avec vous</p>
        <h1 className="font-serif text-3xl font-semibold">Invitations</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          En attente ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon={Mail} title="Aucune invitation en attente" />
        ) : (
          <div className="space-y-3">
            {pending.map((inv) =>
              inv.trips ? (
                <InvitationCard
                  key={inv.id}
                  invitation={{
                    id: inv.id,
                    token: inv.token,
                    role: inv.role,
                    message: inv.message,
                    expires_at: inv.expires_at,
                    trip: inv.trips,
                  }}
                />
              ) : null,
            )}
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Historique
          </h2>
          <ul className="divide-y rounded-xl border bg-card">
            {handled.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{inv.trips?.title ?? '—'}</span>
                <span className="text-muted-foreground">{inv.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
