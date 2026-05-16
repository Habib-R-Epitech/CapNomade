import {
  CalendarDays,
  Wallet,
  Map,
  Plane,
  Youtube,
  FileText,
  Stars,
  HeartHandshake,
  Heart,
  Leaf,
} from 'lucide-react';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Planning jour par jour',
    body: 'Une timeline claire avec activités, logements, transports et notes. Glissez-déposez pour réorganiser.',
  },
  {
    icon: Wallet,
    title: 'Dépenses détaillées entre voyageurs',
    body: "Type, sous-type, devise, taux de change, statut de paiement. Répartition égale, pourcentage ou montants fixes — qui doit combien à qui, en un coup d'œil.",
  },
  {
    icon: Map,
    title: 'Carte interactive',
    body: 'Étapes, logements, activités, trajets. Importez vos KML, GPX, GeoJSON ou Excel — CapNomade les unifie.',
  },
  {
    icon: Plane,
    title: 'Trajets & empreinte carbone',
    body: 'Vols, voitures, trains, ferries. Distance, durée, coût et CO₂ estimé avec méthode de calcul transparente.',
  },
  {
    icon: Youtube,
    title: 'Médias & documents',
    body: 'Vidéos YouTube, playlists, PDFs de réservation, liens Airbnb et Drive. Privés par défaut, partagés à la demande.',
  },
  {
    icon: Stars,
    title: 'Notation post-voyage',
    body: "Notez logement, transport, activités, rythme, rapport qualité-prix. Modifiable plus tard, taggable par ressenti.",
  },
  {
    icon: HeartHandshake,
    title: 'Voyage collaboratif',
    body: 'Invitez par email, rôles owner / editor / viewer. Toutes les modifications visibles, audit log côté owner.',
  },
  {
    icon: FileText,
    title: 'Import Excel intelligent',
    body: 'Reprenez vos anciens fichiers : assistant de mapping par feuille pour reconstruire chaque voyage en quelques clics.',
  },
  {
    icon: Heart,
    title: 'Envies de voyages',
    body: "Stockez vos idées, taggez-les, estimez budget et durée. Convertissez une envie en voyage planifié quand l'envie devient projet.",
  },
  {
    icon: Leaf,
    title: 'Statistiques de vie de voyageur',
    body: 'Pays visités, kilomètres, heures de vol, dépenses moyennes par jour ou par personne, top destinations…',
  },
];

export function FeaturesGrid() {
  return (
    <section id="fonctionnalites" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Fonctionnalités</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Tout ce que vous mettiez dans Excel, en mieux pensé.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Conçu pour les voyageurs exigeants : assez puissant pour un tour du monde, assez simple pour un week-end.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="group flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-soft transition-all hover:shadow-elevated"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-5" />
            </div>
            <h3 className="font-serif text-lg font-semibold">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
