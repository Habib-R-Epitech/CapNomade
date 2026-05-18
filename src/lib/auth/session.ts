import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { asRow } from '@/lib/supabase/helpers';
import { serverEnv } from '@/lib/env';
import { DEMO_COOKIE } from '@/lib/auth/demo';
import type { Database } from '@/lib/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface CurrentSession {
  userId: string;
  email: string;
  profile: Profile;
  /** True when the visitor is browsing read-only as the demo user. */
  isDemo: boolean;
}

/** Get the current user + profile, or null if not signed in. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const resp = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const profile = asRow<Profile>(resp);
    if (!profile) return null;
    return { userId: user.id, email: user.email ?? profile.email, profile, isDemo: false };
  }

  // No real Supabase session — maybe a demo cookie is set. Demo mode lets
  // visitors browse a real account's data (read-only) without signing in.
  const demoSession = await tryLoadDemoSession();
  if (demoSession) return demoSession;

  return null;
});

async function tryLoadDemoSession(): Promise<CurrentSession | null> {
  const env = serverEnv();
  if (!env.DEMO_USER_ID) return null;

  const store = await cookies();
  if (store.get(DEMO_COOKIE)?.value !== '1') return null;

  try {
    const admin = getSupabaseAdminClient();
    const resp = await admin.from('profiles').select('*').eq('id', env.DEMO_USER_ID).maybeSingle();
    const profile = asRow<Profile>(resp);
    if (!profile) return null;
    return { userId: profile.id, email: profile.email, profile, isDemo: true };
  } catch {
    return null;
  }
}

/** Same as getSession() but redirects to landing if unauthenticated. */
export async function requireSession(redirectTo = '/'): Promise<CurrentSession> {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}

/**
 * For write server actions: throws if the current session is a demo session.
 * Returns the (real) session otherwise so callers can use the user ID.
 */
export async function requireWriteSession(): Promise<CurrentSession> {
  const session = await requireSession();
  if (session.isDemo) {
    throw new DemoReadOnlyError();
  }
  return session;
}

export class DemoReadOnlyError extends Error {
  constructor() {
    super('Mode démo : lecture seule, créez un compte pour modifier.');
    this.name = 'DemoReadOnlyError';
  }
}
