import type { Metadata } from 'next';
import { ExcelVsCapNomade } from '@/components/marketing/ExcelVsCapNomade';
import { CtaSection } from '@/components/marketing/CtaSection';

export const metadata: Metadata = {
  title: 'Pourquoi quitter Excel pour planifier ses voyages — CapNomade',
  description:
    "Tableurs partagés, formules cassées, devises oubliées, dépenses à reconstruire : pourquoi Excel n'est pas fait pour planifier ses voyages à plusieurs, et ce que CapNomade fait mieux.",
  alternates: { canonical: '/pourquoi-quitter-excel' },
};

export default function WhyLeaveExcelPage() {
  return (
    <>
      <section className="container pb-6 pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-coral-600">Pourquoi quitter Excel</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight md:text-5xl">
            Excel a fait son temps pour planifier des voyages.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Excel est un excellent outil — pour les tableurs. Mais planifier un voyage à plusieurs,
            c&apos;est gérer des dates, des devises, des étapes, des trajets, des dépenses partagées,
            des liens de réservation, des cartes, des vidéos et des notes. Excel ne sait rien faire
            de tout ça <em>nativement</em>. CapNomade, si.
          </p>
        </div>
      </section>

      <ExcelVsCapNomade />

      <section className="container pb-24">
        <div className="prose prose-slate dark:prose-invert mx-auto max-w-3xl">
          <h2 className="font-serif">Les 5 frictions qu&apos;on connaît tous</h2>
          <ol>
            <li>
              <strong>La feuille qui s&apos;écrase</strong>. À deux ou plus, on perd des modifs en
              continu — ou pire, on découvre les conflits en arrivant à destination.
            </li>
            <li>
              <strong>Les dépenses qui dérapent</strong>. Calcul à la main des avances entre
              voyageurs, devises oubliées, taux de change copiés à la louche. CapNomade gère ça nativement.
            </li>
            <li>
              <strong>La carte qu&apos;on ouvre à côté</strong>. Aucun lien entre votre Excel et votre
              parcours. CapNomade affiche étapes et trajets sur la même carte, importables depuis
              KML / GPX / GeoJSON / Excel.
            </li>
            <li>
              <strong>L&apos;empreinte carbone qu&apos;on ne calcule pas</strong>. Avec CapNomade,
              chaque vol et trajet voiture se voit attribuer une estimation, avec la méthode et le
              niveau de confiance affichés.
            </li>
            <li>
              <strong>L&apos;archive des voyages passés</strong>. Vos vieux Excel sont éclatés sur
              Drive, Dropbox, en local. CapNomade vous permet de les importer, de les noter à
              posteriori, et de les rassembler dans un vrai carnet de voyageur.
            </li>
          </ol>

          <h2 className="font-serif">Et l&apos;import depuis vos vieux Excel ?</h2>
          <p>
            CapNomade fournit un assistant d&apos;import <code>.xlsx</code> : vous choisissez les
            feuilles à transformer en voyage, vous prévisualisez chaque feuille, et l&apos;assistant
            détecte automatiquement les zones — planning, tableau dépenses, métadonnées. Mapping
            assisté si nécessaire. Le fichier source est conservé en pièce jointe du voyage.
          </p>
        </div>
      </section>

      <CtaSection />
    </>
  );
}
