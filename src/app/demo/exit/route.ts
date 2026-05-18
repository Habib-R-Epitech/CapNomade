import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DEMO_COOKIE } from '@/lib/auth/demo';

export async function GET(request: Request) {
  return exit(request);
}
export async function POST(request: Request) {
  return exit(request);
}

async function exit(request: Request) {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  const url = new URL(request.url);
  return NextResponse.redirect(new URL('/', url.origin));
}
