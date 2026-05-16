'use client';

import { useTransition, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { upsertReviewAction } from '@/server/actions/reviews';

interface ExistingReview {
  overall: number;
  accommodation: number | null;
  transport: number | null;
  activities_score: number | null;
  value_for_money: number | null;
  pace: number | null;
  destination: number | null;
  would_return_score: number | null;
  comment: string | null;
  feeling_tags: string[];
}

const FIELDS: Array<{ key: keyof ExistingReview; label: string }> = [
  { key: 'overall', label: 'Note globale' },
  { key: 'accommodation', label: 'Logement' },
  { key: 'transport', label: 'Transport' },
  { key: 'activities_score', label: 'Activités' },
  { key: 'value_for_money', label: 'Rapport qualité-prix' },
  { key: 'pace', label: 'Rythme du voyage' },
  { key: 'destination', label: 'Plaisir de la destination' },
  { key: 'would_return_score', label: "Envie d'y retourner" },
];

const SUGGESTED_TAGS = [
  'ressourçant',
  'sportif',
  'gourmand',
  'culturel',
  'romantique',
  'aventureux',
  'fatigant',
  'familial',
  'dépaysant',
  'authentique',
];

export function TripReview({
  tripId,
  initial,
  canReview,
}: {
  tripId: string;
  initial: ExistingReview | null;
  canReview: boolean;
}) {
  const [pending, start] = useTransition();
  const [values, setValues] = useState<Partial<ExistingReview>>(
    initial ?? { overall: 8, feeling_tags: [] },
  );
  const [tag, setTag] = useState('');
  const tags = (values.feeling_tags ?? []) as string[];

  function submit() {
    start(async () => {
      const r = await upsertReviewAction({
        trip_id: tripId,
        overall: Number(values.overall ?? 0),
        accommodation: values.accommodation ?? null,
        transport: values.transport ?? null,
        activities_score: values.activities_score ?? null,
        value_for_money: values.value_for_money ?? null,
        pace: values.pace ?? null,
        destination: values.destination ?? null,
        would_return_score: values.would_return_score ?? null,
        comment: values.comment ?? null,
        feeling_tags: tags,
      });
      if (!r.ok) toast.error('Note non enregistrée', { description: r.error });
      else toast.success('Note enregistrée');
    });
  }

  return (
    <Card className="p-6">
      <header className="flex items-center gap-2">
        <Star className="size-5 text-coral-500" />
        <h3 className="font-serif text-xl font-semibold">Notation post-voyage</h3>
      </header>
      {!canReview ? (
        <p className="mt-3 text-sm text-muted-foreground">
          La notation devient disponible une fois le voyage marqué comme réalisé.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FIELDS.map(({ key, label }) => (
            <ScoreField
              key={key}
              label={label}
              value={(values[key] as number | null) ?? null}
              onChange={(v) => setValues((s) => ({ ...s, [key]: v }))}
            />
          ))}
          <div className="sm:col-span-2 space-y-2">
            <Label>Tags de ressenti</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValues((s) => ({ ...s, feeling_tags: tags.filter((x) => x !== t) }))}
                  className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary"
                >
                  #{t} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un tag…"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (tag.trim()) {
                      setValues((s) => ({ ...s, feeling_tags: [...tags, tag.trim()] }));
                      setTag('');
                    }
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValues((s) => ({ ...s, feeling_tags: [...tags, t] }))}
                  className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="comment">Commentaire libre</Label>
            <Textarea
              id="comment"
              rows={4}
              value={(values.comment as string) ?? ''}
              onChange={(e) => setValues((s) => ({ ...s, comment: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={submit} disabled={pending}>
              {pending ? 'Enregistrement…' : 'Enregistrer la note'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-[hsl(var(--accent))]"
          aria-label={label}
        />
        <span className="w-12 text-right font-serif text-base font-semibold">
          {value != null ? value.toFixed(1) : '—'}
        </span>
      </div>
    </div>
  );
}
