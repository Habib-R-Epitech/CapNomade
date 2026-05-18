import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEMO_COOKIE, DEMO_COOKIE_OPTIONS } from '@/lib/auth/demo';
import { serverEnv } from '@/lib/env';

export async function GET(request: Request) {
  return enter(request);
}
export async function POST(request: Request) {
  return enter(request);
}

async function enter(request: Request) {
  const env = serverEnv();
  if (!env.DEMO_USER_ID || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse('Démo non configurée', { status: 503 });
  }

  const store = await cookies();
  store.set(DEMO_COOKIE, '1', DEMO_COOKIE_OPTIONS);

  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirect') ?? '/dashboard';
  // Restrict to in-app paths to avoid open-redirect.
  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/dashboard';
  return NextResponse.redirect(new URL(safeRedirect, url.origin));
}
