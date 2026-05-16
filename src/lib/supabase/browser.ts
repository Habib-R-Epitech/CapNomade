'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';
import { publicEnvironment } from '@/lib/env';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Singleton browser-side Supabase client (anon key only). */
export function getSupabaseBrowserClient() {
  if (!cached) {
    cached = createBrowserClient<Database>(
      publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
      publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return cached;
}
