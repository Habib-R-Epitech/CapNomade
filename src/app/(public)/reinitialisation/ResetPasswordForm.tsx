'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const schema = z
  .object({
    password: z.string().min(8, 'Au moins 8 caractères').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Les deux mots de passe ne correspondent pas',
    path: ['confirm'],
  });
type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Supabase emits a PASSWORD_RECOVERY event after parsing the URL hash.
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  async function submit({ password }: Values) {
    setPending(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      toast.error('Impossible de changer le mot de passe', { description: updateError.message });
      return;
    }
    toast.success('Mot de passe mis à jour');
    router.push('/dashboard');
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        Validation du lien en cours…
        <p className="mt-2 text-xs">
          Si rien ne se passe au bout de quelques secondes, le lien est probablement expiré.
          Demandez-en un nouveau depuis &quot;mot de passe oublié&quot;.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          {...form.register('password')}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmer</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...form.register('confirm')}
        />
        {form.formState.errors.confirm && (
          <p className="text-sm text-destructive">{form.formState.errors.confirm.message}</p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? 'Mise à jour…' : 'Valider le nouveau mot de passe'}
      </Button>
    </form>
  );
}
