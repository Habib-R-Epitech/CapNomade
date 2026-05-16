'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const schema = z.object({
  email: z.string().email('Email invalide'),
});
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function submit({ email }: Values) {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL!;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reinitialisation`,
    });
    setPending(false);
    // Always show success to avoid email enumeration.
    if (error && !/rate limit/i.test(error.message)) {
      // Log silently — don't reveal account existence.
      // eslint-disable-next-line no-console
      console.warn('resetPasswordForEmail error', error.message);
    }
    if (error && /rate limit/i.test(error.message)) {
      toast.error('Trop de tentatives, réessayez plus tard.');
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-3">
        <Mail className="mx-auto size-8 text-primary" />
        <h2 className="font-serif text-xl font-semibold">Email envoyé</h2>
        <p className="text-sm text-muted-foreground">
          Si un compte existe pour <span className="font-medium text-foreground">{sentTo}</span>,
          vous recevrez un lien de réinitialisation dans quelques instants.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          {...form.register('email')}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? 'Envoi…' : 'Recevoir le lien de réinitialisation'}
      </Button>
    </form>
  );
}
