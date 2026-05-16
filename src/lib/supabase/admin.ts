import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Admin client using the service_role key. Bypasses RLS — use ONLY in
 * server actions / route handlers where the permission check is performed
 * upstream (e.g. via lib/auth/permissions).
 *
 * Never import this module from a Client Component.
 */
let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Admin client must not be used in the browser');
  }
  const env = serverEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return cached;
}
