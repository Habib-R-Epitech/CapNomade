'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignInButton } from '@/components/auth/SignInButton';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
});
type Values = z.infer<typeof schema>;

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const next = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function submit(values: Values) {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setPending(false);
    if (error) {
      toast.error('Connexion impossible', { description: friendlyError(error.message) });
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <SignInButton size="lg" className="w-full" redirectTo={next} />

      <Divider />

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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Oublié ?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-widest">
        <span className="bg-background px-2 text-muted-foreground">ou par email</span>
      </div>
    </div>
  );
}

function friendlyError(message: string): string {
  if (/invalid login/i.test(message)) return 'Email ou mot de passe incorrect.';
  if (/email not confirmed/i.test(message)) return "Email non confirmé. Vérifiez votre boîte mail.";
  if (/rate limit/i.test(message)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return message;
}
