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

const schema = z.object({
  full_name: z.string().min(2).max(120),
  default_currency: z.enum(['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY', 'AUD']),
  timezone: z.string().min(2),
});
type Values = z.infer<typeof schema>;

export function ProfileForm({ initial }: { initial: Values }) {
  const [pending, start] = useTransition();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });

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
      </div>
      <div className="pt-2">
        <Button disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </form>
  );
}
