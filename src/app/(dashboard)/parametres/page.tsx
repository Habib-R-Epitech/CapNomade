import type { Metadata } from 'next';
import { requireSession } from '@/lib/auth/session';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = { title: 'Paramètres', robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Votre compte</p>
        <h1 className="font-serif text-3xl font-semibold">Paramètres</h1>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Profil</h2>
        <ProfileForm
          initial={{
            full_name: session.profile.full_name ?? '',
            default_currency: session.profile.default_currency,
            timezone: session.profile.timezone,
          }}
        />
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-6">
        <h2 className="font-serif text-xl">Données</h2>
        <p className="text-sm text-muted-foreground">
          Vous pouvez exporter ou supprimer votre compte à tout moment. La suppression cascade
          immédiatement sur tous les voyages dont vous êtes propriétaire.
        </p>
        <div className="flex flex-wrap gap-2 pt-3">
          <a
            href="/api/account/export"
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Exporter mes données
          </a>
          <a
            href="/api/account/delete"
            className="rounded-md border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            Supprimer mon compte
          </a>
        </div>
      </section>
    </div>
  );
}
