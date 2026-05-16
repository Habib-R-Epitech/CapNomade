'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AddPastTripDialog = dynamic(
  () => import('./AddPastTripDialog').then((m) => m.AddPastTripDialog),
  { ssr: false },
);

export function AddPastTripButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Voyage passé
      </Button>
      {open && <AddPastTripDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
