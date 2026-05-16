import 'server-only';
import { Resend } from 'resend';
import { serverEnv } from '@/lib/env';

let cached: Resend | null = null;

export function getResend(): Resend | null {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) return null;
  if (!cached) cached = new Resend(env.RESEND_API_KEY);
  return cached;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  const resend = getResend();
  const env = serverEnv();
  const from = env.EMAIL_FROM ?? 'CapNomade <hello@capnomade.app>';
  const replyTo = msg.replyTo ?? env.EMAIL_REPLY_TO;

  if (!resend) {
    console.warn('Resend not configured — email skipped:', msg.subject);
    return { ok: false, error: 'resend_not_configured' };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    replyTo,
    headers: msg.headers,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}
