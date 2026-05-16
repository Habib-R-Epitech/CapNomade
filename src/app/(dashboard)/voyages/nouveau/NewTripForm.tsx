'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTripAction } from '@/server/actions/trips';

const schema = z.object({
  title: z.string().min(2, 'Au moins 2 caractères').max(120),
  status: z.enum(['draft', 'planning', 'booked']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  primary_countries: z
    .string()
    .max(100)
    .transform((v) =>
      v
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => /^[A-Z]{2}$/.test(c)),
    ),
  description: z.string().max(2000).optional(),
  base_currency: z.string().length(3).default('EUR'),
});

type Values = z.input<typeof schema>;

export function NewTripForm() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      status: 'planning',
      start_date: '',
      end_date: '',
      primary_countries: '',
      description: '',
      base_currency: 'EUR',
    },
  });

  function submit(raw: Values) {
    start(async () => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return;
      const result = await createTripAction({
        title: parsed.data.title,
        status: parsed.data.status,
        start_date: parsed.data.start_date || null,
        end_date: parsed.data.end_date || null,
        primary_countries: parsed.data.primary_countries,
        description: parsed.data.description || null,
        base_currency: parsed.data.base_currency,
      });
      if (!result.ok) {
        toast.error('Impossible de créer le voyage', { description: result.error });
        return;
      }
      toast.success('Voyage créé');
      router.push(`/voyages/${result.data!.slug}`);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-5 rounded-xl border bg-card p-6 shadow-soft">
      <div className="space-y-2">
        <Label htmlFor="title">Titre du voyage *</Label>
        <Input id="title" autoFocus placeholder="ex. Japon — Cerisiers 2026" {...form.register('title')} />
        {form.formState.errors.title && (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">Date de début</Label>
          <Input id="start_date" type="date" {...form.register('start_date')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Date de fin</Label>
          <Input id="end_date" type="date" {...form.register('end_date')} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primary_countries">Pays (codes ISO 2 lettres, séparés par virgule)</Label>
          <Input id="primary_countries" placeholder="JP, KR" {...form.register('primary_countries')} />
        </div>
        <div className="space-y-2">
          <Label>Statut</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(v) => form.setValue('status', v as Values['status'])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="booked">Réservé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Note d&apos;intention (optionnel)</Label>
        <Textarea id="description" rows={4} placeholder="Un mot sur l'envie de ce voyage…" {...form.register('description')} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? 'Création…' : 'Créer le voyage'}
        </Button>
      </div>
    </form>
  );
}
