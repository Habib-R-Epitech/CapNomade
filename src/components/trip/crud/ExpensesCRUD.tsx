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
import { upsertExpenseAction, deleteExpenseRowAction } from '@/server/actions/tripDetail';

export interface ExpenseRow {
  id: string;
  type: 'accommodation' | 'transport' | 'activity' | 'food' | 'other';
  label: string;
  amount_cents: number;
  currency: string;
  spent_on: string | null;
  city: string | null;
  note: string | null;
}

const TYPE_LABELS: Record<ExpenseRow['type'], string> = {
  accommodation: 'Logement',
  transport: 'Transport',
  activity: 'Activité',
  food: 'Nourriture',
  other: 'Autre',
};

interface Props {
  tripId: string;
  items: ExpenseRow[];
  baseCurrency: string;
  canEdit: boolean;
}

export function ExpensesCRUD({ tripId, items, baseCurrency, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExpenseRow | null>(null);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(row: ExpenseRow) {
    setEditing(row);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} dépense{items.length > 1 ? 's' : ''} ·{' '}
          {formatCurrency(items.reduce((s, e) => s + e.amount_cents, 0), baseCurrency)} au total
        </p>
        {canEdit && (
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Aucune dépense pour ce voyage.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2.5">Libellé</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5 text-right">Montant</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Ville</th>
                {canEdit && <th className="w-20 p-2.5" />}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2.5 font-medium">{row.label}</td>
                  <td className="p-2.5 text-muted-foreground">{TYPE_LABELS[row.type]}</td>
                  <td className="p-2.5 text-right tabular-nums">
                    {formatCurrency(row.amount_cents, row.currency)}
                  </td>
                  <td className="p-2.5 text-muted-foreground">{row.spent_on ?? '—'}</td>
                  <td className="p-2.5 text-muted-foreground">{row.city ?? '—'}</td>
                  {canEdit && (
                    <td className="p-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                          <Pencil className="size-4" />
                        </Button>
                        <DeleteButton id={row.id} label={row.label} />
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
        <ExpenseDialog
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
    const res = await deleteExpenseRowAction(id);
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

function ExpenseDialog({
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
  existing: ExpenseRow | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [label, setLabel] = React.useState(existing?.label ?? '');
  const [type, setType] = React.useState<ExpenseRow['type']>(existing?.type ?? 'other');
  const [amount, setAmount] = React.useState<string>(
    existing ? (existing.amount_cents / 100).toFixed(2) : '',
  );
  const [currency, setCurrency] = React.useState(existing?.currency ?? baseCurrency);
  const [date, setDate] = React.useState(existing?.spent_on ?? '');
  const [city, setCity] = React.useState(existing?.city ?? '');
  const [note, setNote] = React.useState(existing?.note ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round((Number(amount.replace(',', '.')) || 0) * 100);
    if (!label.trim()) {
      toast.error('Le libellé est obligatoire.');
      return;
    }
    setPending(true);
    const res = await upsertExpenseAction({
      ...(existing ? { id: existing.id } : {}),
      trip_id: tripId,
      type,
      label: label.trim(),
      amount_cents: cents,
      currency: currency.toUpperCase(),
      spent_on: date || null,
      city: city.trim() || null,
      note: note.trim() || null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success(existing ? 'Dépense modifiée' : 'Dépense ajoutée');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Modifier la dépense' : 'Ajouter une dépense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="exp-label">Libellé *</Label>
            <Input id="exp-label" autoFocus value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="exp-type">Type</Label>
              <select
                id="exp-type"
                value={type}
                onChange={(e) => setType(e.target.value as ExpenseRow['type'])}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Montant</Label>
              <Input
                id="exp-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-currency">Devise</Label>
              <Input
                id="exp-currency"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="exp-city">Ville</Label>
              <Input id="exp-city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-note">Note (optionnel)</Label>
            <Textarea id="exp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
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
