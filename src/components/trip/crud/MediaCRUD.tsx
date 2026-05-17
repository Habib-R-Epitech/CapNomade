'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Pencil, Plus, Trash2, Loader2 } from 'lucide-react';
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
import { upsertMediaAction, deleteMediaAction } from '@/server/actions/tripDetail';

export interface MediaRow {
  id: string;
  kind: 'youtube' | 'drive' | 'photo' | 'article' | 'booking' | 'other';
  url: string;
  title: string | null;
  description: string | null;
}

const KIND_LABELS: Record<MediaRow['kind'], string> = {
  youtube: 'YouTube',
  drive: 'Drive',
  photo: 'Photo',
  article: 'Article',
  booking: 'Réservation',
  other: 'Autre',
};

interface Props {
  tripId: string;
  items: MediaRow[];
  canEdit: boolean;
}

export function MediaCRUD({ tripId, items, canEdit }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MediaRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} média{items.length > 1 ? 's' : ''}
        </p>
        {canEdit && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm">
            <Plus className="size-4" /> Ajouter
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          Aucun média partagé.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 rounded-md border bg-card p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{KIND_LABELS[row.kind]}</span>
                  <a href={row.url} target="_blank" rel="noreferrer noopener" className="truncate font-medium hover:underline">
                    {row.title || row.url}
                  </a>
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                </div>
                {row.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{row.description}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(row); setDialogOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteButton id={row.id} label={row.title || row.url} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && dialogOpen && (
        <MediaDialog open={dialogOpen} onOpenChange={setDialogOpen} tripId={tripId} existing={editing} />
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
    const res = await deleteMediaAction(id);
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

function MediaDialog({
  open,
  onOpenChange,
  tripId,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  existing: MediaRow | null;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [kind, setKind] = React.useState<MediaRow['kind']>(existing?.kind ?? 'other');
  const [url, setUrl] = React.useState(existing?.url ?? '');
  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [description, setDescription] = React.useState(existing?.description ?? '');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Le lien est obligatoire.');
      return;
    }
    setPending(true);
    const res = await upsertMediaAction({
      ...(existing ? { id: existing.id } : {}),
      trip_id: tripId,
      kind,
      url: url.trim(),
      title: title.trim() || null,
      description: description.trim() || null,
    });
    if (!res.ok) {
      toast.error('Enregistrement impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success(existing ? 'Média modifié' : 'Média ajouté');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Modifier le média' : 'Ajouter un média'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="me-url">Lien *</Label>
            <Input id="me-url" type="url" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="me-kind">Type</Label>
              <select
                id="me-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as MediaRow['kind'])}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="me-title">Titre</Label>
              <Input id="me-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="me-desc">Description</Label>
            <Textarea id="me-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
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
