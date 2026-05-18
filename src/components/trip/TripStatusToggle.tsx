'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Heart, MapPinned, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { changeTripStatusAction } from '@/server/actions/trips';
import type { TripStatus } from '@/lib/types/database';

interface Choice {
  status: TripStatus;
  label: string;
  Icon: typeof Heart;
  short: string;
}

// The three "user-facing" statuses. Trips with status booked/draft/archived
// still surface here (mapped to the closest concept) so the toggle always
// shows something coherent.
const CHOICES: Choice[] = [
  { status: 'wishlist',  label: 'Ce voyage est une envie',     short: 'Envie',    Icon: Heart },
  { status: 'planning',  label: 'Ce voyage est planifié',      short: 'Planifié', Icon: MapPinned },
  { status: 'completed', label: 'Ce voyage a été réalisé',     short: 'Réalisé',  Icon: CheckCircle2 },
];

function normalize(status: TripStatus): TripStatus {
  if (status === 'booked' || status === 'draft') return 'planning';
  if (status === 'archived') return 'completed';
  return status;
}

interface Props {
  tripId: string;
  status: TripStatus;
  canEdit: boolean;
}

export function TripStatusToggle({ tripId, status, canEdit }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const effective = normalize(status);
  const current = CHOICES.find((c) => c.status === effective) ?? CHOICES[2]!;
  const CurrentIcon = current.Icon;

  async function set(next: TripStatus) {
    if (next === effective) return;
    setPending(true);
    const res = await changeTripStatusAction(tripId, next);
    setPending(false);
    if (!res.ok) {
      toast.error('Changement de statut impossible', { description: res.error });
      return;
    }
    toast.success('Statut mis à jour');
    router.refresh();
  }

  if (!canEdit) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs font-medium',
          effective === 'completed' && 'border-emerald-300/60 text-emerald-700 dark:text-emerald-300',
          effective === 'planning' && 'border-amber-300/60 text-amber-700 dark:text-amber-300',
          effective === 'wishlist' && 'border-pink-300/60 text-pink-700 dark:text-pink-300',
        )}
      >
        <CurrentIcon className="size-3.5" />
        {current.short}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="gap-1.5">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CurrentIcon className="size-3.5" />}
          {current.label}
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[15rem]">
        {CHOICES.map((c) => {
          const Icon = c.Icon;
          const isCurrent = c.status === effective;
          return (
            <DropdownMenuItem
              key={c.status}
              onSelect={() => set(c.status)}
              disabled={isCurrent}
              className="gap-2"
            >
              <Icon className="size-4" />
              {c.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
