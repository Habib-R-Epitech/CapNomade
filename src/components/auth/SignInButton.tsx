'use client';

import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { GoogleIcon } from '@/components/ui/google-icon';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { toast } from 'sonner';

interface SignInButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  redirectTo?: string;
  label?: string;
}

export function SignInButton({
  redirectTo,
  label = 'Se connecter avec Google',
  ...rest
}: SignInButtonProps) {
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    const origin = window.location.origin;
    // Read the optional `?redirect=` param at click time instead of via
    // `useSearchParams()` so this button can sit on statically-generated
    // marketing pages without each consumer needing a Suspense boundary.
    const search = new URLSearchParams(window.location.search);
    const next = redirectTo ?? search.get('redirect') ?? '/dashboard';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) {
      toast.error('Impossible de se connecter pour le moment.', { description: error.message });
      setPending(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={pending} {...rest}>
      <GoogleIcon className="size-4" />
      {pending ? 'Connexion…' : label}
    </Button>
  );
}
