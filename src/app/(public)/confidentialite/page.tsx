import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confidentialité — CapNomade',
  description:
    "Comment CapNomade protège vos données : private by default, suppression de compte cascadée, aucun secret exposé côté client, URLs signées pour les documents.",
  alternates: { canonical: '/confidentialite' },
};

export default function PrivacyPage() {
  return (
    <main className="container py-16">
      <article className="prose prose-slate dark:prose-invert mx-auto max-w-3xl">
        <h1 className="font-serif">Confidentialité</h1>
        <p>
          CapNomade applique le principe <strong>private by default</strong>. Chaque voyage est privé
          à sa création ; l&apos;accès passe par des invitations explicites avec rôles
          (<em>owner</em>, <em>editor</em>, <em>viewer</em>).
        </p>
        <h2 className="font-serif">Données collectées</h2>
        <ul>
          <li>Profil minimum : email, nom, avatar (via Google OAuth)</li>
          <li>Vos voyages et leur contenu (créés par vous ou partagés avec vous)</li>
          <li>Vos préférences (devise par défaut, fuseau horaire, thème)</li>
        </ul>
        <h2 className="font-serif">Sécurité</h2>
        <ul>
          <li>Authentification Google OAuth, sessions cookies HttpOnly</li>
          <li>Row Level Security activée sur toutes les tables métier</li>
          <li>Documents stockés en privé, accès via URLs signées de courte durée</li>
          <li>En-têtes HTTP de sécurité : HSTS, CSP, X-Frame-Options, Referrer-Policy</li>
          <li>Aucun secret côté client (clés Google Maps, IA, service_role uniquement côté serveur)</li>
        </ul>
        <h2 className="font-serif">Vos droits</h2>
        <p>
          Vous pouvez à tout moment exporter ou supprimer votre compte depuis vos paramètres.
          Toutes les données associées (voyages dont vous êtes propriétaire, dépenses, médias,
          envies, notifications) sont supprimées en cascade.
        </p>
      </article>
    </main>
  );
}
