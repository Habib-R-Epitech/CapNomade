'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MapPinned,
  Plane,
  Heart,
  Mail,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';

const ITEMS = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/voyages', label: 'Mes voyages', icon: Plane },
  { href: '/voyages/planifies', label: 'Planifiés', icon: MapPinned },
  { href: '/envies', label: 'Mes envies', icon: Heart },
  { href: '/invitations', label: 'Invitations', icon: Mail },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

export function DashboardSidebar({ unreadInvitations = 0 }: { unreadInvitations?: number }) {
  const pathname = usePathname() ?? '';

  // Pick the longest matching href so /voyages/planifies doesn't also highlight /voyages.
  const activeHref = React.useMemo(() => {
    let best: string | null = null;
    for (const item of ITEMS) {
      if (item.href === pathname || pathname.startsWith(item.href + '/')) {
        if (!best || item.href.length > best.length) best = item.href;
      }
    }
    return best;
  }, [pathname]);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card/40 lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center border-b px-6 py-5" aria-label="CapNomade — Accueil">
        <Logo size={34} />
      </Link>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="Navigation principale">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === activeHref;
          // Sidebar nav rarely benefits from prefetch — every link points to a
          // heavy dynamic page. Skipping prefetch on hover/render cuts a chunk
          // of background work on dashboard load.
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {href === '/invitations' && unreadInvitations > 0 && (
                <span className="rounded-full bg-coral-500 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                  {unreadInvitations}
                </span>
              )}
              {active && <ChevronRight className="size-3 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 text-xs text-muted-foreground">
        Privé par défaut · vos données vous appartiennent.
      </div>
    </aside>
  );
}
