'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/button';
import { GoogleIcon } from '@/components/ui/google-icon';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { toast } from 'sonner';

interface SignInButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  redirectTo?: string;
  label?: string;
}

export function SignInButton({ redirectTo, label = 'Se connecter avec Google', ...rest }: SignInButtonProps) {
  const [pending, setPending] = React.useState(false);
  const params = useSearchParams();
  const next = redirectTo ?? params.get('redirect') ?? '/dashboard';

  async function handleClick() {
    setPending(true);
    const supabase = getSupabaseBrowserClient();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL!;
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
