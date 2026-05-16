'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddPastTripDialog } from './AddPastTripDialog';

export function AddPastTripButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Voyage passé
      </Button>
      <AddPastTripDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
