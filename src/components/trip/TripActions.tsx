'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy as CopyIcon, Share2, Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  changeTripStatusAction,
  deleteTripAction,
  duplicateTripAction,
} from '@/server/actions/trips';
import type { TripStatus } from '@/lib/types/database';

export function TripActions({
  tripId,
  slug,
  status,
  canEdit,
  isOwner,
}: {
  tripId: string;
  slug: string;
  status: TripStatus;
  canEdit: boolean;
  isOwner: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function copyLink() {
    const url = `${window.location.origin}/voyages/${slug}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Lien copié dans le presse-papier'),
      () => toast.error("Impossible d'accéder au presse-papier"),
    );
  }

  function archive() {
    if (!confirm('Archiver ce voyage ?')) return;
    start(async () => {
      const r = await changeTripStatusAction(tripId, 'archived');
      if (!r.ok) toast.error('Action impossible', { description: r.error });
      else toast.success('Voyage archivé');
    });
  }

  function duplicate() {
    start(async () => {
      const r = await duplicateTripAction(tripId);
      if (!r.ok || !r.data) toast.error('Duplication impossible', { description: r.error });
      else {
        toast.success('Voyage dupliqué');
        router.push(`/voyages/${r.data.slug}`);
      }
    });
  }

  function remove() {
    if (!confirm('Supprimer définitivement ce voyage ? Cette action est irréversible.')) return;
    start(async () => {
      const r = await deleteTripAction(tripId);
      if (!r?.ok) toast.error('Suppression impossible', { description: r?.error });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          Plus d&apos;actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={copyLink}>
          <Share2 /> Copier le lien
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem onSelect={duplicate}>
            <CopyIcon /> Dupliquer
          </DropdownMenuItem>
        )}
        {canEdit && status !== 'archived' && (
          <DropdownMenuItem onSelect={archive}>
            <Archive /> Archiver
          </DropdownMenuItem>
        )}
        {isOwner && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={remove} className="text-destructive">
              <Trash2 /> Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
