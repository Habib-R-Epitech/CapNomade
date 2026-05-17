'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Upload as UploadIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CountryMultiSelect } from '@/components/ui/country-multiselect';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createTripAction, updateTripAction } from '@/server/actions/trips';

export interface ExistingTrip {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  primary_countries: string[];
  base_currency: string;
  cover_image_url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog runs in edit mode and updates this trip. */
  existing?: ExistingTrip;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const CURRENT_YEAR = new Date().getUTCFullYear();

export function AddPastTripDialog({ open, onOpenChange, existing }: Props) {
  const router = useRouter();
  const isEdit = !!existing;
  const [pending, setPending] = React.useState(false);
  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [dateMode, setDateMode] = React.useState<'exact' | 'approx'>('exact');

  // Exact mode
  const [startDate, setStartDate] = React.useState(existing?.start_date ?? '');
  const [endDate, setEndDate] = React.useState(existing?.end_date ?? '');

  // Approximate mode
  const [approxMonth, setApproxMonth] = React.useState<number>(new Date().getUTCMonth() + 1);
  const [approxYear, setApproxYear] = React.useState<number>(CURRENT_YEAR);
  const [approxDuration, setApproxDuration] = React.useState<number>(7);

  // Optional fields
  const [countries, setCountries] = React.useState<string[]>(existing?.primary_countries ?? []);
  const [currency, setCurrency] = React.useState(existing?.base_currency ?? 'EUR');
  const [description, setDescription] = React.useState(existing?.description ?? '');
  const [coverUrl, setCoverUrl] = React.useState<string | null>(existing?.cover_image_url ?? null);
  const [coverUploading, setCoverUploading] = React.useState(false);
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setTitle(existing?.title ?? '');
      setTitleError(null);
      setDateMode('exact');
      setStartDate(existing?.start_date ?? '');
      setEndDate(existing?.end_date ?? '');
      setApproxMonth(new Date().getUTCMonth() + 1);
      setApproxYear(CURRENT_YEAR);
      setApproxDuration(7);
      setCountries(existing?.primary_countries ?? []);
      setCurrency(existing?.base_currency ?? 'EUR');
      setDescription(existing?.description ?? '');
      setCoverUrl(existing?.cover_image_url ?? null);
      setCoverUploading(false);
      setPending(false);
    }
  }, [open, existing]);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !existing) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Format invalide', { description: 'Choisissez une image JPG, PNG, WEBP ou AVIF.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde', { description: 'Maximum 5 Mo.' });
      return;
    }
    setCoverUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `trips/${existing.id}/cover-${Date.now()}.${ext}`;
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.storage.from('trip-covers').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('trip-covers').getPublicUrl(path);
      setCoverUrl(data.publicUrl);
      toast.success('Image uploadée');
    } catch (err) {
      toast.error('Upload impossible', { description: err instanceof Error ? err.message : 'erreur inconnue' });
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      setTitleError('Le titre doit faire au moins 2 caractères.');
      return;
    }
    setTitleError(null);
    setPending(true);

    let computedStart: string | null = null;
    let computedEnd: string | null = null;
    if (dateMode === 'exact') {
      computedStart = startDate || null;
      computedEnd = endDate || null;
    } else {
      if (approxDuration > 0 && approxYear >= 1900 && approxYear <= CURRENT_YEAR + 1) {
        const start = new Date(Date.UTC(approxYear, approxMonth - 1, 1));
        const end = new Date(start);
        end.setUTCDate(start.getUTCDate() + approxDuration - 1);
        computedStart = start.toISOString().slice(0, 10);
        computedEnd = end.toISOString().slice(0, 10);
      }
    }

    const countryCodes = countries.map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c));

    const approxNote =
      dateMode === 'approx'
        ? `(Dates approximatives — ${MONTHS[approxMonth - 1]} ${approxYear}, ${approxDuration} jour${approxDuration > 1 ? 's' : ''})`
        : '';
    // Strip any previously-injected '(Dates approximatives — …)' markers so they
    // don't stack up on every edit.
    const cleanedDescription = description
      .replace(/\s*\(Dates approximatives[^)]*\)\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const finalDescription = [cleanedDescription, approxNote].filter(Boolean).join('\n\n') || null;

    if (isEdit && existing) {
      const res = await updateTripAction({
        id: existing.id,
        title: title.trim(),
        start_date: computedStart,
        end_date: computedEnd,
        primary_countries: countryCodes,
        base_currency: currency || 'EUR',
        description: finalDescription,
        cover_image_url: coverUrl,
      });
      if (!res.ok) {
        toast.error('Modification impossible', { description: res.error });
        setPending(false);
        return;
      }
      toast.success('Voyage modifié');
      onOpenChange(false);
      router.refresh();
      return;
    }

    const res = await createTripAction({
      title: title.trim(),
      status: 'completed',
      visibility: 'private',
      start_date: computedStart,
      end_date: computedEnd,
      primary_countries: countryCodes,
      base_currency: currency || 'EUR',
      description: finalDescription,
    });

    if (!res.ok || !res.data) {
      toast.error('Création impossible', { description: res.error });
      setPending(false);
      return;
    }
    toast.success('Voyage passé ajouté');
    onOpenChange(false);
    router.push(`/voyages/${res.data.slug}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le voyage' : 'Ajouter un voyage passé'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Mettez à jour les informations de ce voyage.'
              : 'Saisissez les informations dont vous vous souvenez. Seul le titre est obligatoire.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="past-title">Titre du voyage *</Label>
            <Input
              id="past-title"
              autoFocus
              placeholder="ex. Bali 2024"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {titleError && <p className="text-sm text-destructive">{titleError}</p>}
          </div>

          <div className="space-y-2">
            <Label>Période</Label>
            <div className="inline-flex rounded-md border bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setDateMode('exact')}
                className={`rounded px-3 py-1 text-sm transition ${
                  dateMode === 'exact' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Dates exactes
              </button>
              <button
                type="button"
                onClick={() => setDateMode('approx')}
                className={`rounded px-3 py-1 text-sm transition ${
                  dateMode === 'approx' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Approximatif
              </button>
            </div>

            {dateMode === 'exact' ? (
              <div className="space-y-3 pt-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="past-start" className="text-xs font-normal">Date de départ</Label>
                    <Input
                      id="past-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="past-end" className="text-xs font-normal">Date de retour</Label>
                    <Input
                      id="past-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Vous pouvez laisser ces champs vides si vous ne vous en souvenez pas.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="past-month" className="text-xs font-normal">Mois</Label>
                    <select
                      id="past-month"
                      value={approxMonth}
                      onChange={(e) => setApproxMonth(Number(e.target.value))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="past-year" className="text-xs font-normal">Année</Label>
                    <Input
                      id="past-year"
                      type="number"
                      min={1900}
                      max={CURRENT_YEAR}
                      value={approxYear}
                      onChange={(e) => setApproxYear(Number(e.target.value) || CURRENT_YEAR)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="past-duration" className="text-xs font-normal">Durée (jours)</Label>
                    <Input
                      id="past-duration"
                      type="number"
                      min={1}
                      max={365}
                      value={approxDuration}
                      onChange={(e) => setApproxDuration(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le voyage sera enregistré du 1er {MONTHS[approxMonth - 1]?.toLowerCase()} {approxYear} pendant {approxDuration} jour{approxDuration > 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="past-countries">Pays (optionnel)</Label>
              <CountryMultiSelect
                id="past-countries"
                value={countries}
                onChange={setCountries}
                placeholder="Sélectionnez un ou plusieurs pays…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="past-currency">Devise principale</Label>
              <Input
                id="past-currency"
                maxLength={3}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="past-description">Souvenir / note (optionnel)</Label>
            <Textarea
              id="past-description"
              rows={3}
              placeholder="Un mot sur ce voyage…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {isEdit && existing && (
            <div className="space-y-2">
              <Label>Image de couverture (optionnel)</Label>
              {coverUrl ? (
                <div className="space-y-2">
                  <div className="relative h-40 w-full overflow-hidden rounded-md border bg-muted">
                    <Image
                      src={coverUrl}
                      alt="Couverture du voyage"
                      fill
                      sizes="(min-width: 768px) 600px, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={coverUploading}
                    >
                      {coverUploading ? <Loader2 className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                      Remplacer
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCoverUrl(null)}
                      disabled={coverUploading}
                    >
                      <Trash2 className="size-4" />
                      Retirer
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={coverUploading}
                >
                  {coverUploading ? <Loader2 className="size-4 animate-spin" /> : <UploadIcon className="size-4" />}
                  Choisir une image
                </Button>
              )}
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP ou AVIF — 5 Mo maximum.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isEdit ? 'Enregistrement…' : 'Création…'}
                </>
              ) : isEdit ? (
                'Enregistrer les modifications'
              ) : (
                'Ajouter le voyage'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
