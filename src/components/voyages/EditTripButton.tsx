'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExistingTrip } from './AddPastTripDialog';

const AddPastTripDialog = dynamic(
  () => import('./AddPastTripDialog').then((m) => m.AddPastTripDialog),
  { ssr: false },
);

export function EditTripButton({ trip }: { trip: ExistingTrip }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Modifier
      </Button>
      {open && <AddPastTripDialog open={open} onOpenChange={setOpen} existing={trip} />}
    </>
  );
}
