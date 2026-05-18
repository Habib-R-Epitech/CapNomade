import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { publicEnvironment, serverEnv } from '@/lib/env';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { DEMO_COOKIE } from '@/lib/auth/demo';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client bound to the Next.js cookies() store.
 * Use in Server Components, Server Actions, and Route Handlers.
 *
 * Wrapped in `cache()` so a single request reuses the same client.
 *
 * When the visitor is in "demo mode" (cookie set, no Supabase auth) we
 * return the admin client wrapped in a read-only proxy. Reads bypass RLS
 * (so the demo profile can see its own data), writes short-circuit to a
 * `demo_readonly` error result without touching the database.
 */
export const getSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();

  const hasSupabaseAuth = cookieStore.getAll().some((c) => c.name.startsWith('sb-'));
  const isDemo = !hasSupabaseAuth && cookieStore.get(DEMO_COOKIE)?.value === '1';

  if (isDemo) {
    const env = serverEnv();
    if (env.DEMO_USER_ID && env.SUPABASE_SERVICE_ROLE_KEY) {
      return wrapReadOnly(getSupabaseAdminClient()) as unknown as ReturnType<typeof createServerClient>;
    }
  }

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

/**
 * Wrap a supabase-js client so insert / update / delete / upsert / rpc all
 * short-circuit to `{ data: null, error: { message: 'demo_readonly' } }`
 * — preserves the await-able shape that server actions check.
 */
function wrapReadOnly<T extends object>(real: T): T {
  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === 'from' && typeof value === 'function') {
        return (...args: unknown[]) =>
          wrapTableBuilder(
            (value as (...a: unknown[]) => object).apply(target, args),
          );
      }
      if (prop === 'rpc' && typeof value === 'function') {
        return () => makeReadOnlyResult();
      }
      if (prop === 'storage' && value && typeof value === 'object') {
        return wrapStorage(value as object);
      }
      return value;
    },
  };
  return new Proxy(real, handler);
}

function wrapTableBuilder<T extends object>(builder: T): T {
  const handler: ProxyHandler<T> = {
    get(target, prop) {
      if (prop === 'insert' || prop === 'update' || prop === 'delete' || prop === 'upsert') {
        return () => makeReadOnlyResult();
      }
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  };
  return new Proxy(builder, handler);
}

function wrapStorage<T extends object>(storage: T): T {
  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === 'from' && typeof value === 'function') {
        return (...args: unknown[]) => {
          const bucket = (value as (...a: unknown[]) => object).apply(target, args);
          return new Proxy(bucket, {
            get(t, p, r) {
              if (p === 'upload' || p === 'update' || p === 'remove' || p === 'move' || p === 'copy') {
                return async () => ({ data: null, error: { message: 'demo_readonly' } });
              }
              return Reflect.get(t, p, r);
            },
          });
        };
      }
      return value;
    },
  };
  return new Proxy(storage, handler);
}

interface ReadOnlyThenable {
  data: null;
  error: { message: string; code: string };
  then: (onFulfilled: (v: { data: null; error: { message: string; code: string } }) => unknown) => unknown;
}

/**
 * A thenable that mimics the final shape of a Supabase query — supports any
 * chained filter/modifier (.eq, .select, .single, etc.) and resolves to a
 * standard error result when awaited.
 */
function makeReadOnlyResult(): ReadOnlyThenable {
  const result = {
    data: null,
    error: {
      message: 'Mode démo : lecture seule. Créez un compte pour enregistrer vos voyages.',
      code: 'demo_readonly',
    },
  };
  const base = {
    ...result,
    then: (resolve: (v: typeof result) => unknown) => resolve(result),
  };
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      // Any unknown method (.eq, .select, .single, .order, .in, etc.) returns
      // the same thenable so chaining keeps working.
      return () => base;
    },
  }) as ReadOnlyThenable;
}
