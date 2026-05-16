import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { asRow } from '@/lib/supabase/helpers';
import type { Database } from '@/lib/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface CurrentSession {
  userId: string;
  email: string;
  profile: Profile;
}

/** Get the current user + profile, or null if not signed in. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const resp = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  const profile = asRow<Profile>(resp);

  if (!profile) return null;

  return { userId: user.id, email: user.email ?? profile.email, profile };
});

/** Same as getSession() but redirects to landing if unauthenticated. */
export async function requireSession(redirectTo = '/'): Promise<CurrentSession> {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}
