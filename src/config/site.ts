export const siteConfig = {
  name: 'CapNomade',
  shortName: 'CapNomade',
  tagline: 'Planificateur de voyages collaboratif, budget, carte et carnet de voyage',
  description:
    "CapNomade remplace votre tableur Excel : planning jour par jour, budget détaillé entre voyageurs, carte interactive, trajets et empreinte carbone, documents, vidéos YouTube, notes post-voyage et envies futures — tout sur un même carnet, à plusieurs.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  locale: 'fr-FR',
  defaultCurrency: 'EUR',
  email: {
    support: 'support@capnomade.app',
    from: process.env.EMAIL_FROM ?? 'CapNomade <hello@capnomade.app>',
  },
  socials: {
    twitter: '@capnomade',
  },
  marketingNav: [
    { label: 'Fonctionnalités', href: '/fonctionnalites' },
    { label: 'Pourquoi quitter Excel', href: '/pourquoi-quitter-excel' },
    { label: 'Confidentialité', href: '/confidentialite' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
