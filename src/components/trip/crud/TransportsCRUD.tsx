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
import { upsertTransportAction, deleteTransportAction } from '@/server/actions/tripDetail';

export interface TransportRow {
  id: string;
  mode: 'plane' | 'car' | 'train' | 'bus' | 'ferry' | 'motorcycle' | 'other';
  origin_label: string | null;
  destination_label: string | null;
  depart_at: string | null;
  arrive_at: string | null;
  carrier: string | null;
  reference: string | null;
  cost_cents: number | null;
  cost_currency: string | null;
  notes: string | null;
}

const MODE_LABELS: Record<TransportRow['mode'], string> = {
  plane: 'Avion',
  car: 'Voiture',
  train: 'Train',
  bus: 'Bus',
  ferry: 'Ferry',
  motorcycle: 'Moto',
  other: 'Autre',
};

interface Props {
  tripId: string;
  items: TransportRow[];
  baseCurrency: string;
  canEdit: boolean;
}

export function TransportsCRUD({ tripId, items, baseCurrency, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TransportRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} segment{items.length > 1 ? 's' : ''} de transport
        </p>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm">
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Aucun transport pour ce voyage.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2.5">Mode</th>
                <th className="p-2.5">Trajet</th>
                <th className="p-2.5">Compagnie / Réf.</th>
                <th className="p-2.5 text-right">Coût</th>
                {canEdit && <th className="w-20 p-2.5" />}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2.5 font-medium">{MODE_LABELS[row.mode]}</td>
                  <td className="p-2.5">
                    {row.origin_label && row.destination_label
                      ? `${row.origin_label} → ${row.destination_label}`
                      : row.notes ?? '—'}
                  </td>
                  <td className="p-2.5 text-muted-foreground">
                    {[row.carrier, row.reference].filter(Boolean).join(' · ') || '—'}
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
                        <DeleteButton id={row.id} label={`${MODE_LABELS[row.mode]} ${row.origin_label ?? ''}`} />
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
        <TransportDialog
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
    if (!window.confirm(`Supprimer "${label.trim()}" ?`)) return;
    setPending(true);
    const res = await deleteTransportAction(id);
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

function TransportDialog({
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
  existing: TransportRow | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [mode, setMode] = React.useState<TransportRow['mode']>(existing?.mode ?? 'plane');
  const [origin, setOrigin] = React.useState(existing?.origin_label ?? '');
  const [destination, setDestination] = React.useState(existing?.destination_label ?? '');
  const [departAt, setDepartAt] = React.useState(existing?.depart_at?.slice(0, 16) ?? '');
  const [arriveAt, setArriveAt] = React.useState(existing?.arrive_at?.slice(0, 16) ?? '');
  const [carrier, setCarrier] = React.useState(existing?.carrier ?? '');
  const [reference, setReference] = React.useState(existing?.reference ?? '');
  const [cost, setCost] = React.useState<string>(
    existing?.cost_cents != null ? (existing.cost_cents / 100).toFixed(2) : '',
  );
  const [currency, setCurrency] = React.useState(existing?.cost_currency ?? baseCurrency);
  const [notes, setNotes] = React.useState(existing?.notes ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const costNumber = cost ? Math.round((Number(cost.replace(',', '.')) || 0) * 100) : null;
    const res = await upsertTransportAction({
      ...(existing ? { id: existing.id } : {}),
      trip_id: tripId,
      mode,
      origin_label: origin.trim() || null,
      destination_label: destination.trim() || null,
      depart_at: departAt || null,
      arrive_at: arriveAt || null,
      carrier: carrier.trim() || null,
      reference: reference.trim() || null,
      cost_cents: costNumber,
      cost_currency: cost ? currency.toUpperCase() : null,
      notes: notes.trim() || null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success(existing ? 'Transport modifié' : 'Transport ajouté');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Modifier le transport' : 'Ajouter un transport'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tr-mode">Mode</Label>
              <select
                id="tr-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as TransportRow['mode'])}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {Object.entries(MODE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-carrier">Compagnie</Label>
              <Input id="tr-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Air France, SNCF…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-origin">Départ</Label>
              <Input id="tr-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Paris" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-dest">Arrivée</Label>
              <Input id="tr-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Bali" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-depart">Date/heure départ</Label>
              <Input id="tr-depart" type="datetime-local" value={departAt} onChange={(e) => setDepartAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-arrive">Date/heure arrivée</Label>
              <Input id="tr-arrive" type="datetime-local" value={arriveAt} onChange={(e) => setArriveAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-ref">Référence</Label>
              <Input id="tr-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="AF234, billet n°…" />
            </div>
            <div className="space-y-1.5 grid grid-cols-[1fr_5rem] gap-1.5">
              <div className="space-y-1.5">
                <Label htmlFor="tr-cost">Coût</Label>
                <Input id="tr-cost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-ccy">Devise</Label>
                <Input id="tr-ccy" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tr-notes">Notes</Label>
            <Textarea id="tr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
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
