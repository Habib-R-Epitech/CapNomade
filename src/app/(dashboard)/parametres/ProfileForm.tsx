'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateProfileAction } from '@/server/actions/profile';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY', 'AUD'] as const;
type Currency = (typeof CURRENCIES)[number];

const schema = z.object({
  full_name: z.string().min(2).max(120),
  default_currency: z.enum(CURRENCIES),
  timezone: z.string().min(2),
});
type Values = z.infer<typeof schema>;

export interface ProfileFormProps {
  initial: {
    full_name: string;
    default_currency: string;
    timezone: string;
  };
}

function normalizeCurrency(input: string): Currency {
  const upper = input.toUpperCase();
  return (CURRENCIES as readonly string[]).includes(upper) ? (upper as Currency) : 'EUR';
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const [pending, start] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initial.full_name,
      default_currency: normalizeCurrency(initial.default_currency),
      timezone: initial.timezone,
    },
  });

  function submit(v: Values) {
    start(async () => {
      const r = await updateProfileAction(v);
      if (!r.ok) toast.error('Mise à jour impossible', { description: r.error });
      else toast.success('Profil mis à jour');
    });
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4 rounded-xl border bg-card p-6">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nom complet</Label>
        <Input id="full_name" {...form.register('full_name')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Devise par défaut</Label>
          <Select
            value={form.watch('default_currency')}
            onValueChange={(v) => form.setValue('default_currency', v as Currency)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Fuseau horaire</Label>
          <Input id="timezone" {...form.register('timezone')} />
        </div>
      </div>
      <div className="pt-2">
        <Button disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </form>
  );
}
