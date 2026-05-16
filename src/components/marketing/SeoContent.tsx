export function SeoContent() {
  return (
    <section className="container py-20">
      <div className="prose prose-slate dark:prose-invert mx-auto max-w-3xl">
        <h2 className="font-serif">Un carnet de voyage à hauteur de voyageur</h2>
        <p>
          Pendant des années, organiser un voyage à plusieurs voulait dire ouvrir un tableur Excel,
          empiler des onglets — un par voyage, parfois un par jour — et empiler les colonnes :
          dates, étapes, dépenses, qui a payé quoi, taux de change, liens de réservation. Un système
          qui marche jusqu&apos;à ce qu&apos;on ajoute un voyageur, qu&apos;on parte sur deux pays, ou qu&apos;on essaie
          de retrouver une note prise en route.
        </p>
        <p>
          <strong>CapNomade</strong> reprend ces usages réels et les outille proprement : un planning
          jour par jour, un module de dépenses pensé pour la vraie vie (paiements partiels, devises
          mélangées, répartitions au pourcentage), une carte interactive, des trajets avec empreinte
          carbone estimée et méthode de calcul affichée, et enfin une couche collaborative claire :
          owner, editor, viewer, invitations par email, audit log côté propriétaire.
        </p>
        <h3 className="font-serif">Pour qui ?</h3>
        <p>
          Les voyageurs réguliers qui veulent garder une trace propre de leurs voyages passés et
          futurs, les couples ou groupes d&apos;amis qui veulent éviter les conflits de dépenses,
          et celles et ceux qui aiment <em>regarder en arrière</em> autant qu&apos;ils aiment partir.
        </p>
        <h3 className="font-serif">Vos données vous appartiennent</h3>
        <p>
          Chaque voyage est privé par défaut. L&apos;accès passe par des invitations explicites, avec
          rôles. Les documents sont stockés en privé avec des URLs signées de courte durée. Le code
          d&apos;extraction de vos vieux Excel reste dans votre navigateur autant que possible, et
          votre compte est supprimable à tout moment (cascade complète des données).
        </p>
      </div>
    </section>
  );
}
