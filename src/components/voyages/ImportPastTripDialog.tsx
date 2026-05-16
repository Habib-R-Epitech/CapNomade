'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileSpreadsheet, Loader2, AlertCircle, Download } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import {
  analyzePastTripAction,
  confirmImportedTripAction,
  type ConfirmImportInput,
} from '@/server/actions/importTrip';
import type { ExtractedTripData } from '@/lib/imports/pastTripExtractor';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = 'upload' | 'validate' | 'submitting';

export function ImportPastTripDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>('upload');
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<ExtractedTripData | null>(null);
  const [keepExpense, setKeepExpense] = React.useState<boolean[]>([]);
  const [keepStop, setKeepStop] = React.useState<boolean[]>([]);
  const [keepTransport, setKeepTransport] = React.useState<boolean[]>([]);

  React.useEffect(() => {
    if (!open) {
      setPhase('upload');
      setError(null);
      setDraft(null);
      setKeepExpense([]);
      setKeepStop([]);
      setKeepTransport([]);
    }
  }, [open]);

  async function handleFile(file: File) {
    setError(null);
    setPhase('submitting');
    const fd = new FormData();
    fd.append('file', file);
    const res = await analyzePastTripAction(fd);
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Analyse impossible.');
      setPhase('upload');
      return;
    }
    setDraft(res.data);
    setKeepExpense(res.data.expenses.map(() => true));
    setKeepStop(res.data.stops.map(() => true));
    setKeepTransport(res.data.transports.map(() => true));
    setPhase('validate');
  }

  async function handleConfirm() {
    if (!draft) return;
    setPhase('submitting');
    const payload: ConfirmImportInput = {
      meta: draft.meta,
      stops: draft.stops
        .filter((_, i) => keepStop[i])
        .map((s) => ({ name: s.name, city: s.city, country_code: s.country_code })),
      transports: draft.transports
        .filter((_, i) => keepTransport[i])
        .map((t) => ({
          mode: t.mode,
          label: t.label,
          origin_label: t.origin_label,
          destination_label: t.destination_label,
          depart_date: t.depart_date,
          cost_amount: t.cost_amount,
          cost_currency: t.cost_currency,
        })),
      expenses: draft.expenses
        .filter((_, i) => keepExpense[i])
        .map((e) => ({
          label: e.label,
          type: e.type,
          amount: e.amount,
          currency: e.currency,
          date: e.date,
          city: e.city,
        })),
    };
    const res = await confirmImportedTripAction(payload);
    if (!res.ok || !res.data) {
      toast.error('Création impossible', { description: res.error });
      setPhase('validate');
      return;
    }
    toast.success('Voyage importé');
    onOpenChange(false);
    router.push(`/voyages/${res.data.slug}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer un voyage passé</DialogTitle>
          <DialogDescription>
            Importez un fichier Excel ou CSV. Nous détectons automatiquement les dépenses,
            les étapes et les transports — vous validez avant de créer le voyage.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {phase === 'upload' && <UploadStep onPick={handleFile} />}
        {phase === 'submitting' && (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Analyse en cours…
          </div>
        )}

        {phase === 'validate' && draft && (
          <ValidateStep
            draft={draft}
            setDraft={setDraft}
            keepExpense={keepExpense}
            setKeepExpense={setKeepExpense}
            keepStop={keepStop}
            setKeepStop={setKeepStop}
            keepTransport={keepTransport}
            setKeepTransport={setKeepTransport}
          />
        )}

        {phase === 'validate' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirm}>Créer le voyage</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

const CSV_TEMPLATE = [
  'Libellé,Type,Montant,Devise,Date,Ville',
  'Hôtel Ubud Jungle,accommodation,450,EUR,2024-04-12,Ubud',
  'Vol Paris → Denpasar,transport,870,EUR,2024-04-12,Paris',
  'Restaurant Warung Made,food,35,EUR,2024-04-13,Ubud',
  'Cours de cuisine balinaise,activity,55,EUR,2024-04-14,Ubud',
  'Taxi aéroport,transport,18,EUR,2024-04-25,Denpasar',
].join('\n');

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modele-import-voyage-capnomade.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function UploadStep({ onPick }: { onPick: (file: File) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onPick(file);
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-10 text-center transition hover:border-primary/50 hover:bg-muted/50"
      >
        <FileSpreadsheet className="size-10 text-muted-foreground" />
        <div className="text-sm font-medium">Cliquez pour choisir un fichier</div>
        <div className="text-xs text-muted-foreground">
          .xlsx, .xls ou .csv — 5 Mo maximum
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        onChange={onChange}
        className="hidden"
      />
      <div className="rounded-md border bg-muted/20 p-3 text-xs">
        <div className="mb-2 font-medium">Pas de fichier sous la main&nbsp;?</div>
        <p className="mb-3 text-muted-foreground">
          Téléchargez notre modèle CSV, remplissez-le dans Excel ou Google Sheets, puis ré-importez-le ici.
          Colonnes attendues&nbsp;: <b>Libellé</b>, <b>Type</b>, <b>Montant</b>, <b>Devise</b>, <b>Date</b>, <b>Ville</b>.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="size-4" />
          Télécharger le modèle CSV
        </Button>
        <div className="mt-3 text-muted-foreground">
          Types acceptés&nbsp;: <code className="rounded bg-muted px-1">accommodation</code>,{' '}
          <code className="rounded bg-muted px-1">transport</code>,{' '}
          <code className="rounded bg-muted px-1">activity</code>,{' '}
          <code className="rounded bg-muted px-1">food</code>,{' '}
          <code className="rounded bg-muted px-1">other</code>. Dates au format <code className="rounded bg-muted px-1">AAAA-MM-JJ</code>.
        </div>
      </div>
    </div>
  );
}

function ValidateStep({
  draft,
  setDraft,
  keepExpense,
  setKeepExpense,
  keepStop,
  setKeepStop,
  keepTransport,
  setKeepTransport,
}: {
  draft: ExtractedTripData;
  setDraft: (d: ExtractedTripData) => void;
  keepExpense: boolean[];
  setKeepExpense: (v: boolean[]) => void;
  keepStop: boolean[];
  setKeepStop: (v: boolean[]) => void;
  keepTransport: boolean[];
  setKeepTransport: (v: boolean[]) => void;
}) {
  function updateMeta<K extends keyof typeof draft.meta>(key: K, value: (typeof draft.meta)[K]) {
    setDraft({ ...draft, meta: { ...draft.meta, [key]: value } });
  }

  function toggle(arr: boolean[], setter: (v: boolean[]) => void, i: number) {
    const next = [...arr];
    next[i] = !next[i];
    setter(next);
  }

  return (
    <div className="space-y-6">
      {draft.warnings.length > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
          {draft.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Métadonnées du voyage</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="imp-title">Titre</Label>
            <Input
              id="imp-title"
              value={draft.meta.title}
              onChange={(e) => updateMeta('title', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="imp-start">Date de départ</Label>
            <Input
              id="imp-start"
              type="date"
              value={draft.meta.start_date ?? ''}
              onChange={(e) => updateMeta('start_date', e.target.value || null)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="imp-end">Date de retour</Label>
            <Input
              id="imp-end"
              type="date"
              value={draft.meta.end_date ?? ''}
              onChange={(e) => updateMeta('end_date', e.target.value || null)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="imp-ccy">Devise principale</Label>
            <Input
              id="imp-ccy"
              maxLength={3}
              value={draft.meta.base_currency}
              onChange={(e) => updateMeta('base_currency', e.target.value.toUpperCase().slice(0, 3))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="imp-countries">Pays (codes ISO2, séparés par virgule)</Label>
            <Input
              id="imp-countries"
              placeholder="FR, ID"
              value={draft.meta.primary_countries.join(', ')}
              onChange={(e) =>
                updateMeta(
                  'primary_countries',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim().toUpperCase())
                    .filter((s) => /^[A-Z]{2}$/.test(s)),
                )
              }
            />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">
          Étapes détectées <span className="font-normal text-muted-foreground">({draft.stops.length})</span>
        </h3>
        {draft.stops.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune étape détectée — vous pourrez en ajouter plus tard.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {draft.stops.map((s, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                <input
                  type="checkbox"
                  checked={keepStop[i] ?? true}
                  onChange={() => toggle(keepStop, setKeepStop, i)}
                  className="size-4 cursor-pointer"
                />
                <span className={keepStop[i] ? '' : 'line-through text-muted-foreground'}>{s.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">
          Transports détectés <span className="font-normal text-muted-foreground">({draft.transports.length})</span>
        </h3>
        {draft.transports.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun transport détecté.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {draft.transports.map((t, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                <input
                  type="checkbox"
                  checked={keepTransport[i] ?? true}
                  onChange={() => toggle(keepTransport, setKeepTransport, i)}
                  className="size-4 cursor-pointer"
                />
                <span className={`flex-1 ${keepTransport[i] ? '' : 'line-through text-muted-foreground'}`}>
                  <span className="font-medium">{t.mode}</span> · {t.label}
                  {t.cost_amount != null && (
                    <span className="ml-2 text-muted-foreground">
                      {t.cost_amount.toFixed(2)} {t.cost_currency}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Dépenses détectées{' '}
            <span className="font-normal text-muted-foreground">
              ({keepExpense.filter(Boolean).length} / {draft.expenses.length})
            </span>
          </h3>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setKeepExpense(draft.expenses.map(() => true))}
              className="text-muted-foreground underline-offset-2 hover:underline"
            >
              Tout cocher
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => setKeepExpense(draft.expenses.map(() => false))}
              className="text-muted-foreground underline-offset-2 hover:underline"
            >
              Tout décocher
            </button>
          </div>
        </div>
        {draft.expenses.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune dépense extraite.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 text-left">
                <tr>
                  <th className="w-8 p-2" />
                  <th className="p-2">Libellé</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Montant</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Ville</th>
                </tr>
              </thead>
              <tbody>
                {draft.expenses.map((e, i) => (
                  <tr
                    key={i}
                    className={`border-t ${keepExpense[i] ? '' : 'opacity-40 line-through'}`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={keepExpense[i] ?? true}
                        onChange={() => toggle(keepExpense, setKeepExpense, i)}
                        className="size-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-2">{e.label}</td>
                    <td className="p-2 text-muted-foreground">{e.type}</td>
                    <td className="p-2 text-right tabular-nums">
                      {e.amount.toFixed(2)} {e.currency}
                    </td>
                    <td className="p-2 text-muted-foreground">{e.date ?? '—'}</td>
                    <td className="p-2 text-muted-foreground">{e.city ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
