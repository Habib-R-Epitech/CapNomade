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
  Menu,
  X,
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
] as const;

function useActiveHref(pathname: string): string | null {
  return React.useMemo(() => {
    let best: string | null = null;
    for (const item of ITEMS) {
      if (item.href === pathname || pathname.startsWith(item.href + '/')) {
        if (!best || item.href.length > best.length) best = item.href;
      }
    }
    return best;
  }, [pathname]);
}

function NavLink({
  href,
  label,
  Icon,
  active,
  unreadInvitations,
  onClick,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
  unreadInvitations: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
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
}

export function DashboardSidebar({ unreadInvitations = 0 }: { unreadInvitations?: number }) {
  const pathname = usePathname() ?? '';
  const activeHref = useActiveHref(pathname);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card/40 lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex items-center border-b px-6 py-5" aria-label="CapNomade — Accueil">
        <Logo size={34} />
      </Link>

      <nav className="flex-1 space-y-0.5 p-3" aria-label="Navigation principale">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            active={href === activeHref}
            unreadInvitations={unreadInvitations}
          />
        ))}
      </nav>

      <div className="border-t p-4 text-xs text-muted-foreground">
        Privé par défaut · vos données vous appartiennent.
      </div>
    </aside>
  );
}

/**
 * Hamburger button + slide-in drawer for mobile / tablet. Hidden on lg+ where
 * the static sidebar is visible.
 */
export function MobileNavButton({ unreadInvitations = 0 }: { unreadInvitations?: number }) {
  const pathname = usePathname() ?? '';
  const activeHref = useActiveHref(pathname);
  const [open, setOpen] = React.useState(false);

  // Close the drawer whenever the route changes — clicking a link triggers
  // navigation but the drawer otherwise lingers.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape closes the drawer.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
        aria-label="Ouvrir le menu"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col border-r bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                aria-label="CapNomade — Accueil"
              >
                <Logo size={30} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Navigation principale">
              {ITEMS.map(({ href, label, icon: Icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  active={href === activeHref}
                  unreadInvitations={unreadInvitations}
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t p-4 text-xs text-muted-foreground">
              Privé par défaut · vos données vous appartiennent.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
