import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Database } from '@/lib/types/database';
import { publicEnvironment } from '@/lib/env';

/**
 * Server-side Supabase client bound to the Next.js cookies() store.
 * Use in Server Components, Server Actions, and Route Handlers.
 *
 * Wrapped in `cache()` so a single request reuses the same client.
 */
export const getSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
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
