'use client';

import { createBrowserClient } from '@supabase/ssr';
import { publicEnvironment } from '@/lib/env';

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Singleton browser-side Supabase client (anon key only). */
export function getSupabaseBrowserClient() {
  if (!cached) {
    cached = createBrowserClient(
      publicEnvironment.NEXT_PUBLIC_SUPABASE_URL,
      publicEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return cached;
}
