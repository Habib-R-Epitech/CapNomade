import { Check, X } from 'lucide-react';

const ROWS: Array<{ feature: string; excel: string; capnomade: string }> = [
  {
    feature: 'Planning jour par jour',
    excel: 'À reconstruire à chaque voyage, jamais le même format',
    capnomade: 'Timeline native, drag & drop, jours liés aux étapes',
  },
  {
    feature: 'Dépenses entre voyageurs',
    excel: 'Formules fragiles, partages compliqués, devises oubliées',
    capnomade: "Type, devise, FX, répartition égale / % / montant, paiements partiels, qui doit combien à qui",
  },
  {
    feature: 'Cartographie',
    excel: "Aucune. On ouvre Google Maps à côté.",
    capnomade: 'Carte MapLibre, étapes, transports, imports KML/GPX/GeoJSON',
  },
  {
    feature: 'Empreinte carbone',
    excel: "Pas géré — ou calculé à la main.",
    capnomade: 'Calculée pour chaque vol / trajet, méthode et niveau de confiance visibles',
  },
  {
    feature: 'Documents & vidéos',
    excel: "Pièces jointes éparpillées dans Drive ou Dropbox.",
    capnomade: 'Documents privés (signed URLs), liens YouTube embeds, fiches médias',
  },
  {
    feature: 'Collaboration',
    excel: "Partage du fichier, écrasement en simultané, pas de rôles.",
    capnomade: 'Invitations par email, rôles owner/editor/viewer, audit des modifications',
  },
  {
    feature: 'Statistiques de vie',
    excel: "Inexistantes ou à compiler à la main.",
    capnomade: 'Pays visités, km, heures de vol, top dépenses, timeline annuelle',
  },
];

export function ExcelVsCapNomade() {
  return (
    <section className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-coral-600">Comparaison</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Pourquoi quitter Excel ?</h2>
        <p className="mt-3 text-muted-foreground">
          Excel fait beaucoup, mais pas <em>pour</em> les voyages. CapNomade est conçu pour ce cas précis.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Sujet</th>
              <th className="px-5 py-3">
                <span className="inline-flex items-center gap-1.5">
                  <X className="size-4 text-destructive" /> Avec Excel
                </span>
              </th>
              <th className="px-5 py-3">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-[hsl(var(--success))]" /> Avec CapNomade
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ROWS.map((row) => (
              <tr key={row.feature} className="align-top">
                <th scope="row" className="px-5 py-4 font-medium">{row.feature}</th>
                <td className="px-5 py-4 text-muted-foreground">{row.excel}</td>
                <td className="px-5 py-4">{row.capnomade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
