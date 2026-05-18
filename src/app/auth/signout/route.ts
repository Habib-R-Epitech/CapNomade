import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DEMO_COOKIE } from '@/lib/auth/demo';

export async function POST() {
  const supabase = await getSupabaseServerClient();
  // signOut on the read-only demo client is a no-op (auth methods aren't
  // intercepted) but clearing the demo cookie is what actually matters.
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}

export const dynamic = 'force-dynamic';
