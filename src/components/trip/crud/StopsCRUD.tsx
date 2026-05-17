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
import { upsertStopAction, deleteStopAction } from '@/server/actions/tripDetail';
import { countryName } from '@/lib/data/countries';

export interface StopRow {
  id: string;
  name: string;
  city: string | null;
  country_code: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
}

interface Props {
  tripId: string;
  items: StopRow[];
  canEdit: boolean;
}

export function StopsCRUD({ tripId, items, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StopRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} étape{items.length > 1 ? 's' : ''}
        </p>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm">
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Aucune étape pour ce voyage.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2.5">Nom</th>
                <th className="p-2.5">Ville</th>
                <th className="p-2.5">Pays</th>
                <th className="p-2.5">Période</th>
                {canEdit && <th className="w-20 p-2.5" />}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2.5 font-medium">{row.name}</td>
                  <td className="p-2.5 text-muted-foreground">{row.city ?? '—'}</td>
                  <td className="p-2.5 text-muted-foreground">
                    {row.country_code ? countryName(row.country_code) ?? row.country_code : '—'}
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {row.arrival_date || row.departure_date
                      ? `${row.arrival_date ?? '?'} → ${row.departure_date ?? '?'}`
                      : '—'}
                  </td>
                  {canEdit && (
                    <td className="p-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(row); setDialogOpen(true); }}>
                          <Pencil className="size-4" />
                        </Button>
                        <DeleteButton id={row.id} label={row.name} />
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
        <StopDialog open={dialogOpen} onOpenChange={setDialogOpen} tripId={tripId} existing={editing} />
      )}
    </div>
  );
}

function DeleteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  async function onDelete() {
    if (!window.confirm(`Supprimer "${label}" ?`)) return;
    setPending(true);
    const res = await deleteStopAction(id);
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

function StopDialog({
  open,
  onOpenChange,
  tripId,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  existing: StopRow | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [name, setName] = React.useState(existing?.name ?? '');
  const [city, setCity] = React.useState(existing?.city ?? '');
  const [countryCode, setCountryCode] = React.useState(existing?.country_code ?? '');
  const [arrival, setArrival] = React.useState(existing?.arrival_date ?? '');
  const [departure, setDeparture] = React.useState(existing?.departure_date ?? '');
  const [notes, setNotes] = React.useState(existing?.notes ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Le nom est obligatoire.');
      return;
    }
    setPending(true);
    const res = await upsertStopAction({
      ...(existing ? { id: existing.id } : {}),
      trip_id: tripId,
      name: name.trim(),
      city: city.trim() || null,
      country_code: countryCode.trim() ? countryCode.toUpperCase() : null,
      arrival_date: arrival || null,
      departure_date: departure || null,
      notes: notes.trim() || null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success(existing ? 'Étape modifiée' : 'Étape ajoutée');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Modifier l’étape' : 'Ajouter une étape'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Nom *</Label>
            <Input id="st-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ubud, Bali" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="st-city">Ville</Label>
              <Input id="st-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-country">Pays (ISO2)</Label>
              <Input id="st-country" maxLength={2} value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))} placeholder="ID" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-arrival">Arrivée</Label>
              <Input id="st-arrival" type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-departure">Départ</Label>
              <Input id="st-departure" type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-notes">Notes</Label>
            <Textarea id="st-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
