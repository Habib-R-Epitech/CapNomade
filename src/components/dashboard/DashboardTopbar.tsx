import { Bell, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/dashboard/UserMenu';
import { MobileNavButton } from '@/components/dashboard/DashboardSidebar';
import { ThemeToggle } from '@/components/marketing/ThemeToggle';

export function DashboardTopbar({
  fullName,
  email,
  avatarUrl,
  unreadNotifications,
  unreadInvitations = 0,
}: {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  unreadNotifications: number;
  unreadInvitations?: number;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
      <MobileNavButton unreadInvitations={unreadInvitations} />
      <div className="flex-1" />
      <Button asChild size="sm">
        <Link href="/voyages/nouveau">
          <Plus className="size-4" />
          Nouveau voyage
        </Link>
      </Button>
      <Link
        href="/invitations"
        className="relative inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unreadNotifications > 0 && (
          <span className="absolute right-2 top-2 inline-flex size-2 rounded-full bg-coral-500" />
        )}
      </Link>
      <ThemeToggle />
      <UserMenu fullName={fullName} email={email} avatarUrl={avatarUrl} />
    </header>
  );
}
