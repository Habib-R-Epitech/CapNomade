'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateRange } from '@/lib/utils';
import { respondInvitationAction } from '@/server/actions/invitations';

export interface InvitationCardProps {
  invitation: {
    id: string;
    token: string;
    role: string;
    message: string | null;
    expires_at: string;
    trip: {
      title: string;
      slug: string;
      description: string | null;
      primary_countries: string[];
      start_date: string | null;
      end_date: string | null;
    };
  };
}

export function InvitationCard({ invitation }: InvitationCardProps) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function respond(action: 'accept' | 'decline') {
    start(async () => {
      const result = await respondInvitationAction({ token: invitation.token, action });
      if (!result.ok) {
        toast.error("Cette invitation n'a pas pu être traitée", { description: result.error });
        return;
      }
      if (action === 'accept' && result.data?.trip_slug) {
        toast.success('Invitation acceptée');
        router.push(`/voyages/${result.data.trip_slug}`);
      } else {
        toast.success(action === 'accept' ? 'Invitation acceptée' : 'Invitation refusée');
        router.refresh();
      }
    });
  }

  const trip = invitation.trip;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Rôle proposé : {invitation.role}
          </p>
          <h3 className="font-serif text-xl font-semibold">{trip.title}</h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {(trip.start_date || trip.end_date) && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            )}
            {trip.primary_countries.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {trip.primary_countries.join(', ')}
              </span>
            )}
          </div>
        </div>
        <Badge variant="muted">Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}</Badge>
      </div>

      {trip.description && <p className="mt-3 text-sm text-muted-foreground">{trip.description}</p>}
      {invitation.message && (
        <blockquote className="mt-3 border-l-2 border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          {invitation.message}
        </blockquote>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => respond('accept')} disabled={pending}>
          {pending ? 'Traitement…' : 'Accepter'}
        </Button>
        <Button onClick={() => respond('decline')} disabled={pending} variant="outline">
          Refuser
        </Button>
      </div>
    </Card>
  );
}
