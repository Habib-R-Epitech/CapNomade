'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { completeOnboardingAction } from '@/server/actions/onboarding';

const schema = z.object({
  full_name: z.string().min(2, 'Au moins 2 caractères').max(120),
  default_currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY', 'AUD']),
  timezone: z.string().min(2),
});

type Values = z.infer<typeof schema>;

export function OnboardingForm({
  initialName,
  initialCurrency,
}: {
  initialName: string;
  initialCurrency: string;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initialName,
      default_currency:
        (['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY', 'AUD'] as const).find(
          (c) => c === initialCurrency.toUpperCase(),
        ) ?? 'EUR',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Paris',
    },
  });

  function onSubmit(values: Values) {
    const fd = new FormData();
    fd.set('full_name', values.full_name);
    fd.set('default_currency', values.default_currency);
    fd.set('timezone', values.timezone);
    startTransition(() => completeOnboardingAction(fd));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="full_name">Votre prénom et nom</Label>
        <Input id="full_name" autoComplete="name" {...form.register('full_name')} />
        {form.formState.errors.full_name && (
          <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Devise par défaut</Label>
        <Select
          value={form.watch('default_currency')}
          onValueChange={(v) => form.setValue('default_currency', v as Values['default_currency'])}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY', 'AUD'].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Fuseau horaire</Label>
        <Input id="timezone" {...form.register('timezone')} />
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Commencer à planifier'}
      </Button>
    </form>
  );
}
