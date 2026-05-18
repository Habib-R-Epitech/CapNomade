/**
 * Demo-mode cookie shared by the auth layer and the Supabase server client.
 * Lives in its own file to avoid a circular import: session.ts depends on
 * server.ts (for getSupabaseServerClient), and server.ts needs the cookie
 * name to detect demo mode.
 */
export const DEMO_COOKIE = 'capnomade-demo';

export const DEMO_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60, // 1 hour
} as const;
