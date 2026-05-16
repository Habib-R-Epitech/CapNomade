import 'server-only';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { NotificationType } from '@/lib/types/database';

export async function pushNotification(input: {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  payload?: Record<string, unknown>;
}) {
  const supabase = await getSupabaseServerClient();
  await supabase.from('notifications').insert({
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    payload: (input.payload ?? {}) as never,
  });
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await getSupabaseServerClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
}
