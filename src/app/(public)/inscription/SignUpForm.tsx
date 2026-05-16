'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignInButton } from '@/components/auth/SignInButton';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const schema = z.object({
  full_name: z.string().min(2, 'Au moins 2 caractères').max(120),
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Au moins 8 caractères')
    .max(128, 'Maximum 128 caractères'),
});
type Values = z.infer<typeof schema>;

export function SignUpForm() {
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '' },
  });

  async function submit(values: Values) {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL!;
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
        emailRedirectTo: `${origin}/auth/callback?next=/auth/onboarding`,
      },
    });
    setPending(false);
    if (error) {
      toast.error('Inscription impossible', { description: friendlyError(error.message) });
      return;
    }
    if (data.session) {
      // Auto-confirmed (or confirmations disabled) — redirect to onboarding.
      router.push('/auth/onboarding');
      router.refresh();
    } else {
      // Confirmation email required.
      setCheckEmail(values.email);
    }
  }

  if (checkEmail) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-3">
        <CheckCircle2 className="mx-auto size-10 text-[hsl(var(--success))]" />
        <h2 className="font-serif text-xl font-semibold">Vérifiez votre email</h2>
        <p className="text-sm text-muted-foreground">
          Nous avons envoyé un lien de confirmation à{' '}
          <span className="font-medium text-foreground">{checkEmail}</span>. Cliquez dessus pour
          activer votre compte.
        </p>
        <p className="pt-2 text-xs text-muted-foreground">
          Pensez à regarder dans les spams si vous ne le voyez pas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SignInButton size="lg" className="w-full" label="Continuer avec Google" />

      <Divider />

      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Prénom et nom</Label>
          <Input
            id="full_name"
            autoComplete="name"
            autoFocus
            {...form.register('full_name')}
          />
          {form.formState.errors.full_name && (
            <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Création…' : 'Créer mon compte'}
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
  if (/already registered|already in use|already exists/i.test(message))
    return 'Cet email est déjà utilisé. Essayez de vous connecter.';
  if (/password.*weak|password.*short/i.test(message)) return 'Mot de passe trop faible.';
  if (/rate limit/i.test(message)) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return message;
}
