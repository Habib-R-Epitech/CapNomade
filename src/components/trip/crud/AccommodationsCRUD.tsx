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
import { formatCurrency } from '@/lib/utils';
import { upsertAccommodationAction, deleteAccommodationAction } from '@/server/actions/tripDetail';

export interface AccommodationRow {
  id: string;
  name: string;
  kind: 'hotel' | 'airbnb' | 'hostel' | 'camping' | 'friends' | 'other';
  check_in_date: string | null;
  check_out_date: string | null;
  address: string | null;
  booking_url: string | null;
  cost_cents: number | null;
  cost_currency: string | null;
  notes: string | null;
}

const KIND_LABELS: Record<AccommodationRow['kind'], string> = {
  hotel: 'Hôtel',
  airbnb: 'Airbnb',
  hostel: 'Auberge',
  camping: 'Camping',
  friends: 'Chez des amis',
  other: 'Autre',
};

interface Props {
  tripId: string;
  items: AccommodationRow[];
  baseCurrency: string;
  canEdit: boolean;
}

export function AccommodationsCRUD({ tripId, items, baseCurrency, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccommodationRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} logement{items.length > 1 ? 's' : ''}
        </p>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm">
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Aucun logement enregistré.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2.5">Nom</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Dates</th>
                <th className="p-2.5 text-right">Coût</th>
                {canEdit && <th className="w-20 p-2.5" />}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2.5 font-medium">
                    {row.booking_url ? (
                      <a href={row.booking_url} target="_blank" rel="noreferrer noopener" className="hover:underline">
                        {row.name}
                      </a>
                    ) : row.name}
                  </td>
                  <td className="p-2.5 text-muted-foreground">{KIND_LABELS[row.kind]}</td>
                  <td className="p-2.5 text-muted-foreground">
                    {row.check_in_date || row.check_out_date
                      ? `${row.check_in_date ?? '?'} → ${row.check_out_date ?? '?'}`
                      : '—'}
                  </td>
                  <td className="p-2.5 text-right tabular-nums">
                    {row.cost_cents != null && row.cost_currency
                      ? formatCurrency(row.cost_cents, row.cost_currency)
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
        <AccommodationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          tripId={tripId}
          baseCurrency={baseCurrency}
          existing={editing}
        />
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
    const res = await deleteAccommodationAction(id);
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

function AccommodationDialog({
  open,
  onOpenChange,
  tripId,
  baseCurrency,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  baseCurrency: string;
  existing: AccommodationRow | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [name, setName] = React.useState(existing?.name ?? '');
  const [kind, setKind] = React.useState<AccommodationRow['kind']>(existing?.kind ?? 'hotel');
  const [checkIn, setCheckIn] = React.useState(existing?.check_in_date ?? '');
  const [checkOut, setCheckOut] = React.useState(existing?.check_out_date ?? '');
  const [address, setAddress] = React.useState(existing?.address ?? '');
  const [bookingUrl, setBookingUrl] = React.useState(existing?.booking_url ?? '');
  const [cost, setCost] = React.useState<string>(
    existing?.cost_cents != null ? (existing.cost_cents / 100).toFixed(2) : '',
  );
  const [currency, setCurrency] = React.useState(existing?.cost_currency ?? baseCurrency);
  const [notes, setNotes] = React.useState(existing?.notes ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Le nom est obligatoire.');
      return;
    }
    setPending(true);
    const costNumber = cost ? Math.round((Number(cost.replace(',', '.')) || 0) * 100) : null;
    const res = await upsertAccommodationAction({
      ...(existing ? { id: existing.id } : {}),
      trip_id: tripId,
      name: name.trim(),
      kind,
      check_in_date: checkIn || null,
      check_out_date: checkOut || null,
      address: address.trim() || null,
      booking_url: bookingUrl.trim() || null,
      cost_cents: costNumber,
      cost_currency: cost ? currency.toUpperCase() : null,
      notes: notes.trim() || null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success(existing ? 'Logement modifié' : 'Logement ajouté');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Modifier le logement' : 'Ajouter un logement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ac-name">Nom *</Label>
            <Input id="ac-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ac-kind">Type</Label>
              <select
                id="ac-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as AccommodationRow['kind'])}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-booking">Lien de réservation</Label>
              <Input id="ac-booking" type="url" placeholder="https://…" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-in">Check-in</Label>
              <Input id="ac-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-out">Check-out</Label>
              <Input id="ac-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-cost">Coût</Label>
              <Input id="ac-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-ccy">Devise</Label>
              <Input id="ac-ccy" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-address">Adresse</Label>
            <Input id="ac-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ac-notes">Notes</Label>
            <Textarea id="ac-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
