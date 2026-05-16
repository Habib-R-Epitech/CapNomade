'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu({
  fullName,
  email,
  avatarUrl,
}: {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const initials = (fullName ?? email)
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleSignOut(e: Event) {
    e.preventDefault();
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/auth/signout', { method: 'POST' });
    } catch {
      // Ignore network errors — we still want to clear the local state.
    }
    router.push('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? email} />}
          <AvatarFallback>{initials || 'C'}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium text-foreground">{fullName ?? 'Voyageur'}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/parametres">
            <UserIcon /> Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/parametres">
            <SettingsIcon /> Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          disabled={signingOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="size-4" />
          {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
