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
import { upsertActivityAction, deleteActivityAction } from '@/server/actions/tripDetail';

export interface ActivityRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  starts_at: string | null;
  ends_at: string | null;
  address: string | null;
  url: string | null;
  cost_cents: number | null;
  cost_currency: string | null;
}

interface Props {
  tripId: string;
  items: ActivityRow[];
  baseCurrency: string;
  canEdit: boolean;
}

export function ActivitiesCRUD({ tripId, items, baseCurrency, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ActivityRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} activité{items.length > 1 ? 's' : ''}
        </p>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm">
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Aucune activité.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2.5">Titre</th>
                <th className="p-2.5">Catégorie</th>
                <th className="p-2.5">Quand</th>
                <th className="p-2.5 text-right">Coût</th>
                {canEdit && <th className="w-20 p-2.5" />}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2.5 font-medium">
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noreferrer noopener" className="hover:underline">{row.title}</a>
                    ) : row.title}
                  </td>
                  <td className="p-2.5 text-muted-foreground">{row.category ?? '—'}</td>
                  <td className="p-2.5 text-muted-foreground text-xs">
                    {row.starts_at ? new Date(row.starts_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
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
                        <DeleteButton id={row.id} label={row.title} />
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
        <ActivityDialog
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
    const res = await deleteActivityAction(id);
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

function ActivityDialog({
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
  existing: ActivityRow | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [description, setDescription] = React.useState(existing?.description ?? '');
  const [category, setCategory] = React.useState(existing?.category ?? '');
  const [startsAt, setStartsAt] = React.useState(existing?.starts_at?.slice(0, 16) ?? '');
  const [endsAt, setEndsAt] = React.useState(existing?.ends_at?.slice(0, 16) ?? '');
  const [address, setAddress] = React.useState(existing?.address ?? '');
  const [url, setUrl] = React.useState(existing?.url ?? '');
  const [cost, setCost] = React.useState<string>(
    existing?.cost_cents != null ? (existing.cost_cents / 100).toFixed(2) : '',
  );
  const [currency, setCurrency] = React.useState(existing?.cost_currency ?? baseCurrency);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Le titre est obligatoire.');
      return;
    }
    setPending(true);
    const costNumber = cost ? Math.round((Number(cost.replace(',', '.')) || 0) * 100) : null;
    const res = await upsertActivityAction({
      ...(existing ? { id: existing.id } : {}),
      trip_id: tripId,
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
      address: address.trim() || null,
      url: url.trim() || null,
      cost_cents: costNumber,
      cost_currency: cost ? currency.toUpperCase() : null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success(existing ? 'Activité modifiée' : 'Activité ajoutée');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Modifier l’activité' : 'Ajouter une activité'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ac-title">Titre *</Label>
            <Input id="ac-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cours de cuisine balinaise" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ac-category">Catégorie</Label>
              <Input id="ac-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="visite, sport…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-url">Lien</Label>
              <Input id="ac-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-start">Début</Label>
              <Input id="ac-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-end">Fin</Label>
              <Input id="ac-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
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
            <Label htmlFor="ac-desc">Description</Label>
            <Textarea id="ac-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
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
