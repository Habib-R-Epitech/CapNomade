'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { upsertReviewAction } from '@/server/actions/reviews';

const FIELDS: Array<{ key: string; label: string }> = [
  { key: 'overall', label: 'Note globale' },
  { key: 'accommodation', label: 'Logement' },
  { key: 'transport', label: 'Transport' },
  { key: 'activities_score', label: 'Activités' },
  { key: 'value_for_money', label: 'Budget' },
  { key: 'pace', label: 'Rythme' },
  { key: 'destination', label: 'Destination' },
  { key: 'would_return_score', label: "Envie d'y retourner" },
];

export function CompleteTripDialog({
  tripId,
  tripTitle,
  children,
}: {
  tripId: string;
  tripTitle: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [scores, setScores] = useState<Record<string, number>>({ overall: 8 });
  const [comment, setComment] = useState('');
  const router = useRouter();

  function submit() {
    start(async () => {
      const r = await upsertReviewAction({
        trip_id: tripId,
        overall: scores.overall ?? 8,
        accommodation: scores.accommodation ?? null,
        transport: scores.transport ?? null,
        activities_score: scores.activities_score ?? null,
        value_for_money: scores.value_for_money ?? null,
        pace: scores.pace ?? null,
        destination: scores.destination ?? null,
        would_return_score: scores.would_return_score ?? null,
        comment: comment.trim() || null,
        feeling_tags: [],
      });
      if (!r.ok) {
        toast.error("Impossible d'enregistrer", { description: r.error });
        return;
      }
      toast.success('Voyage marqué comme fait. Note enregistrée.');
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Marquer « {tripTitle} » comme voyage fait</DialogTitle>
          <DialogDescription>
            Notez le voyage maintenant — vous pourrez tout modifier plus tard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={scores[f.key] ?? (f.key === 'overall' ? 8 : 0)}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [f.key]: Number(e.target.value) }))
                  }
                  className="flex-1 accent-[hsl(var(--accent))]"
                  aria-label={f.label}
                />
                <span className="w-12 text-right font-serif text-base font-semibold">
                  {(scores[f.key] ?? (f.key === 'overall' ? 8 : 0)).toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="complete-comment">Commentaire</Label>
          <Textarea
            id="complete-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Un mot sur le voyage, les moments forts, ce qu'on retiendra…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Enregistrement…' : 'Valider et marquer comme fait'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
