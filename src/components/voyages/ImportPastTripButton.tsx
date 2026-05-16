'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImportPastTripDialog } from './ImportPastTripDialog';

export function ImportPastTripButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Importer un voyage passé
      </Button>
      <ImportPastTripDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
