import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { publicEnvironment } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client bound to the Next.js cookies() store.
 * Use in Server Components, Server Actions, and Route Handlers.
 *
 * Wrapped in `cache()` so a single request reuses the same client.
 *
 * Note: we don't pass our hand-written `Database` generic to createClient.
 * Its structure didn't satisfy supabase-js's internal generic constraints
 * (Insert/Row inference collapsed to `never`), which broke every query
 * and every insert. Queries are typed via `asRow` / `asRows` cast helpers
 * at the call site; row shapes come from `src/lib/types/database.ts`.
 */
export const getSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // Middleware will refresh the session on the next request.
          }
        },
      },
    },
  );
});
