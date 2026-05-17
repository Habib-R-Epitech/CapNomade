'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertDayAction, deleteDayAction } from '@/server/actions/tripDetail';

export interface DayRow {
  id: string;
  date: string;
  title: string | null;
  notes: string | null;
}

interface Props {
  tripId: string;
  items: DayRow[];
  canEdit: boolean;
}

export function DaysCRUD({ tripId, items, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DayRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} jour{items.length > 1 ? 's' : ''} planifié{items.length > 1 ? 's' : ''}
        </p>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm">
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Aucun jour planifié.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Titre</th>
                <th className="p-2.5">Notes</th>
                {canEdit && <th className="w-20 p-2.5" />}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2.5 font-medium tabular-nums">{row.date}</td>
                  <td className="p-2.5">{row.title ?? '—'}</td>
                  <td className="p-2.5 text-xs text-muted-foreground line-clamp-2">{row.notes ?? '—'}</td>
                  {canEdit && (
                    <td className="p-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(row); setDialogOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <DeleteButton id={row.id} label={row.title || row.date} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && dialogOpen && (
        <DayDialog open={dialogOpen} onOpenChange={setDialogOpen} tripId={tripId} existing={editing} />
      )}
    </div>
  );
}

function DeleteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  async function onDelete() {
    if (!window.confirm(`Supprimer le jour "${label}" ?`)) return;
    setPending(true);
    const res = await deleteDayAction(id);
    if (!res.ok) {
      toast.error('Suppression impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success('Supprimé');
    router.refresh();
  }
  return (
    <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 text-destructive" />}
    </Button>
  );
}

function DayDialog({
  open,
  onOpenChange,
  tripId,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  existing: DayRow | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [date, setDate] = React.useState(existing?.date ?? '');
  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [notes, setNotes] = React.useState(existing?.notes ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      toast.error('La date est obligatoire.');
      return;
    }
    setPending(true);
    const res = await upsertDayAction({
      ...(existing ? { id: existing.id } : {}),
      trip_id: tripId,
      date,
      title: title.trim() || null,
      notes: notes.trim() || null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success(existing ? 'Jour modifié' : 'Jour ajouté');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Modifier le jour' : 'Ajouter un jour'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="day-date">Date *</Label>
            <Input id="day-date" type="date" autoFocus value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="day-title">Titre (optionnel)</Label>
            <Input id="day-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Arrivée à Ubud" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="day-notes">Notes</Label>
            <Textarea id="day-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Annuler</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {existing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
