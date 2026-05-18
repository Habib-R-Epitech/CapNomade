import type { ReactNode } from 'react';
import { requireSession } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireSession('/?signin=1');
  const supabase = await getSupabaseServerClient();

  const [{ count: pendingCount }, { count: unreadCount }] = await Promise.all([
    supabase
      .from('trip_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('invited_email', session.email)
      .eq('status', 'pending'),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .is('read_at', null),
  ]);

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar unreadInvitations={pendingCount ?? 0} />
      <div className="flex flex-1 flex-col">
        <DashboardTopbar
          fullName={session.profile.full_name}
          email={session.email}
          avatarUrl={session.profile.avatar_url}
          unreadNotifications={unreadCount ?? 0}
          unreadInvitations={pendingCount ?? 0}
        />
        <div className="flex-1 px-4 py-8 md:px-8 md:py-10">{children}</div>
      </div>
    </div>
  );
}
