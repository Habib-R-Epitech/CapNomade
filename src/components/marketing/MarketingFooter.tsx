import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Logo } from '@/components/brand/Logo';

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo size={34} withTagline />
          <p className="max-w-xs text-sm text-muted-foreground">
            Le carnet de voyage moderne pour planifier, suivre et raconter vos voyages — à plusieurs.
          </p>
        </div>

        <FooterColumn
          title="Produit"
          links={[
            { href: '/fonctionnalites', label: 'Fonctionnalités' },
            { href: '/pourquoi-quitter-excel', label: 'Pourquoi quitter Excel' },
            { href: '/dashboard', label: 'Mon dashboard' },
          ]}
        />
        <FooterColumn
          title="Ressources"
          links={[
            { href: '/confidentialite', label: 'Confidentialité' },
            { href: '/conditions', label: 'Conditions générales' },
            { href: `mailto:${siteConfig.email.support}`, label: 'Support' },
          ]}
        />
        <FooterColumn
          title="Société"
          links={[
            { href: '/', label: 'À propos' },
            { href: '/', label: 'Mentions légales' },
          ]}
        />
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-start justify-between gap-2 py-4 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.</p>
          <p>Conçu pour voyager mieux, à plusieurs.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={`${title}-${l.href}-${l.label}`}>
            <Link href={l.href} className="text-foreground/80 hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
