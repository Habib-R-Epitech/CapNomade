'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ImportPastTripDialog = dynamic(
  () => import('./ImportPastTripDialog').then((m) => m.ImportPastTripDialog),
  { ssr: false },
);

export function ImportPastTripButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Importer un voyage passé
      </Button>
      {open && <ImportPastTripDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
