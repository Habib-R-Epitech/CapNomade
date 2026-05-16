'use client';

import { useTransition, useState } from 'react';
import { Mail, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createInvitationAction } from '@/server/actions/invitations';

interface Member {
  role: string;
  joined_at: string;
  user: { id: string; full_name: string | null; email: string; avatar_url: string | null };
}

export function TripMembers({
  tripId,
  members,
  isOwner,
}: {
  tripId: string;
  slug: string;
  members: Member[];
  isOwner: boolean;
}) {
  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {members.map((m) => {
          const initials =
            (m.user.full_name ?? m.user.email)
              .split(/\s+/)
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || '?';
          return (
            <li key={m.user.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
              <Avatar>
                {m.user.avatar_url && <AvatarImage src={m.user.avatar_url} alt={m.user.full_name ?? m.user.email} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.user.full_name ?? m.user.email}</p>
                <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
              </div>
              <Badge variant="muted">{m.role}</Badge>
            </li>
          );
        })}
      </ul>

      {isOwner && <InviteForm tripId={tripId} />}
    </div>
  );
}

function InviteForm({ tripId }: { tripId: string }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [message, setMessage] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    start(async () => {
      const r = await createInvitationAction({ trip_id: tripId, email, role, message: message || null });
      if (!r.ok) toast.error("Impossible d'envoyer l'invitation", { description: r.error });
      else {
        toast.success(`Invitation envoyée à ${email}`);
        setEmail('');
        setMessage('');
      }
    });
  }

  return (
    <Card className="p-5">
      <header className="mb-3 flex items-center gap-2">
        <UserPlus className="size-4 text-primary" />
        <h3 className="font-serif text-lg font-semibold">Inviter un voyageur</h3>
      </header>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="ami@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'editor' | 'viewer')}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-message">Message (optionnel)</Label>
          <Textarea
            id="invite-message"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Envoi…
              </>
            ) : (
              <>
                <Mail className="size-4" /> Envoyer l&apos;invitation
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
