import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { asRow } from '@/lib/supabase/helpers';

/**
 * OAuth callback handler.
 *
 * Supabase Auth redirects here with `?code=...&next=/optional/redirect`.
 * We exchange the code for a session (sets HttpOnly cookies via Set-Cookie)
 * and then redirect:
 *   - to `next` if provided AND it is a same-origin path,
 *   - to `/auth/onboarding` for first-time sign-ins,
 *   - to `/dashboard` otherwise.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/dashboard';
  const next = sanitizeRedirect(rawNext);

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error?.message ?? 'auth_failed')}`);
  }

  // Determine if this is a first-time login (no onboarding_completed_at).
  const userId = data.session.user.id;
  const profileResp = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();
  const profile = asRow<{ onboarding_completed_at: string | null }>(profileResp);

  const needsOnboarding = !profile?.onboarding_completed_at;
  const destination = needsOnboarding ? '/auth/onboarding' : next;
  return NextResponse.redirect(`${origin}${destination}`);
}

function sanitizeRedirect(input: string): string {
  // Only allow internal redirects (start with a single slash, no protocol).
  if (!input.startsWith('/') || input.startsWith('//')) return '/dashboard';
  if (input.includes('\\')) return '/dashboard';
  return input;
}
