# CapNomade — État d'avancement

> Ce fichier est mis à jour à chaque push.
> Dernière mise à jour : **2026-05-16** — fix RLS trips (RPC SECURITY DEFINER) + cleanup debug + perf modals.

---

## Vue d'ensemble

| Domaine                              | État    |
| ------------------------------------ | ------- |
| Configs racine & toolchain           | ✅ Fait |
| Base de données + RLS + seed         | ✅ Fait |
| Auth Google + middleware + sessions  | ✅ Fait |
| Permissions (modèle de rôles)        | ✅ Fait |
| Primitives UI shadcn + design tokens | ✅ Fait |
| Pages publiques (SEO)                | ✅ Fait |
| Dashboard + page accueil             | ✅ Fait |
| Détail voyage (8 onglets)            | ✅ Fait |
| Server actions (trips/expenses/…)    | ✅ Fait |
| Services métier (stats/carbone/…)    | ✅ Fait |
| Imports KML/KMZ/GPX/GeoJSON/CSV/XLSX | ✅ Fait |
| Exports CSV/GeoJSON/ICS/PDF          | ✅ Fait |
| Email transactionnel (Resend)        | ✅ Fait |
| Google Geocoding + Routes server     | ✅ Fait |
| Tests Vitest + Playwright (initiaux) | ✅ Fait |
| Page édition voyage                  | ⏳ TODO |
| Page dépenses CRUD complète          | ⏳ TODO |
| Page carte plein écran               | ⏳ TODO |
| Wizard d'import (UI)                 | ⏳ TODO |
| Insights destination (UI)            | ⏳ TODO |
| Export/suppression de compte         | ⏳ TODO |

---

## Journal des fixes / patchs

- **2026-05-16 · Cleanup debug + perf modals (commit n°27)** —
  1. Suppression de la route `/api/debug/auth` et de toutes les fonctions de
     debug Postgres (migration `0011_cleanup_debug_functions.sql`).
  2. Retrait du bouton "Éditer" sur `/voyages/[slug]` (pointait vers
     `/parametres` qui n'existe pas encore — TODO P1) + remplacement du lien
     "Carte plein écran" par un placeholder (route `/carte` TODO P2 aussi).
  3. Perf modal "Voyage passé" : remplacé shadcn Tabs + Select (Radix Portal,
     lourd au premier rendu) par HTML natif (toggle buttons + `<select>`).
     Dynamic import des 2 dialogs (`AddPastTripDialog`, `ImportPastTripDialog`)
     via `next/dynamic({ ssr: false })` pour les sortir du bundle initial de
     `/voyages` — ils ne se chargent que quand le user clique.
- **2026-05-16 · Fix RLS trips via SECURITY DEFINER RPC (commits 23-26)** —
  après une chasse au bug épique (~10 commits + 6 migrations de debug), le
  diagnostic via `/api/debug/auth` + un trap RLS a montré que `auth.uid()`
  retourne la bonne UUID dans une fonction PL/pgSQL appelée depuis WITH CHECK
  mais que la comparaison directe `(owner_id = auth.uid())` dans la policy
  échoue. Les workarounds standards `(select auth.uid())` puis wrapper PL/pgSQL
  `app_uid()` n'ont pas suffi (Postgres inline malgré tout dans ce contexte
  Supabase/PostgREST). **Fix final** : RPC `public.create_trip_secure(...)`
  SECURITY DEFINER owned par postgres (BYPASSRLS), qui :
  - vérifie elle-même `auth.uid() is not null` (lève si non authentifié)
  - force `owner_id = auth.uid()` côté serveur (pas de paramètre)
  - insère aussi la ligne `trip_members` correspondante en une transaction
  Les server actions `createTripAction`, `duplicateTripAction`,
  `confirmImportedTripAction` appellent maintenant ce RPC au lieu de
  `.from('trips').insert(...)`. La garantie de sécurité est préservée : impossible
  pour un client de créer un trip au nom de quelqu'un d'autre.
- **2026-05-16 · Fix RLS trips (commit n°23)** — bug majeur diagnostiqué via
  `/api/debug/auth` : tous les voyants étaient au vert
  (`auth.uid()` = `session.user_id` = `profile.id`, policy `trips_owner_insert`
  intacte avec `with_check (owner_id = auth.uid())`) ET POURTANT l'insert
  échouait avec `42501 — new row violates row-level security policy for table
  "trips"`. Le probe avec **trigger désactivé** a tranché : l'erreur venait
  du trigger AFTER INSERT `on_trip_created` qui appelle `handle_new_trip` qui
  insère dans `trip_members`. Bien que `handle_new_trip` soit
  `SECURITY DEFINER` owned by postgres (avec `BYPASSRLS=true`), Supabase ne
  bypasse pas effectivement RLS pour les triggers AFTER INSERT déclenchés via
  PostgREST, et Postgres remonte l'erreur en mentionnant la table d'origine
  (`trips`) au lieu de `trip_members`. **Fix** :
  1. Migration `0005_drop_trip_member_trigger.sql` — DROP TRIGGER
     on_trip_created + DROP FUNCTION handle_new_trip.
  2. `createTripAction`, `duplicateTripAction`,
     `confirmImportedTripAction` : insertent maintenant la ligne
     `trip_members` (trip_id, user_id, 'owner') juste après la création du
     trip. La policy `members_owner_insert` (`with check user_id = auth.uid()
     OR is_trip_owner(trip_id)`) accepte ce self-insert.
  Plus aucune dépendance à des comportements obscurs de Postgres/Supabase.
- **2026-05-16 · Fix bouton "Se déconnecter" (commit n°21)** — le pattern
  `<DropdownMenuItem asChild><form><button type="submit">` ne fonctionnait pas :
  Radix appelle `event.preventDefault()` sur `onSelect`, ce qui empêche le
  submit du form de bouillonner. Le POST `/auth/signout` n'était donc jamais
  envoyé. Refactor en `DropdownMenuItem` avec `onSelect` handler qui :
  - `event.preventDefault()` pour bloquer la fermeture immédiate du menu ;
  - `fetch('/auth/signout', { method: 'POST' })` côté client ;
  - `router.push('/')` + `router.refresh()` pour invalider le cache et
    rediriger.
  État `signingOut` pour disable le bouton pendant l'appel et afficher
  "Déconnexion…". Conséquence collatérale probable : les sessions Supabase
  obsolètes des users qui ne pouvaient pas se déconnecter expliquent les
  erreurs RLS "new row violates row-level security policy for table 'trips'"
  remontées : `auth.uid()` ne matchait plus le `owner_id`. Après reconnexion
  fresh, RLS doit repasser.
- **2026-05-16 · Bouton "Voyage passé" sur /voyages (commit n°20)** — la page
  `/voyages` ne liste que les voyages réalisés/archivés, donc le bouton
  "Nouveau voyage" qui pointait vers `/voyages/nouveau` (formulaire orienté
  voyage futur avec statut draft/planning/booked) était hors contexte. Remplacé
  par un bouton **"Voyage passé"** qui ouvre un modal léger.
  - Seul le **titre est obligatoire** — tout le reste est optionnel.
  - Composant `Tabs` shadcn pour choisir entre **2 modes de période** :
    - **Dates exactes** : 2 date pickers (start/end) que l'utilisateur peut
      laisser vides s'il ne se souvient plus.
    - **Approximatif** : mois (select) + année (number) + durée en jours
      (number 1-365). Les dates concrètes sont calculées (1er du mois
      sélectionné + durée), et une mention "(Dates approximatives — Avril 2024,
      14 jours)" est automatiquement ajoutée à la description pour garder la
      trace que les dates ne sont pas précises.
  - Trip créé avec `status='completed'`, redirection vers `/voyages/[slug]`.
  - Réutilise `createTripAction` existante (aucun changement backend).
  - `/voyages/nouveau` reste accessible depuis `/voyages/planifies`, dashboard
    et topbar pour les voyages futurs.
- **2026-05-16 · fix build Vercel + template CSV (commit n°19)** — le build
  Vercel échouait sur 2 erreurs ESLint dans `ImportPastTripDialog.tsx` :
  apostrophes non échappées dans le texte d'astuce JSX (`react/no-unescaped-entities`)
  et un `<th></th>` vide (`react/self-closing-comp`). Plutôt que d'échapper
  bêtement les `'` avec `&apos;`, j'ai refondu le bloc d'astuce en **carte
  d'aide avec un bouton "Télécharger le modèle CSV"** : le user clique → un
  CSV exemple Bali (5 lignes, 5 types de dépenses) est généré côté client via
  `Blob` + `URL.createObjectURL` et téléchargé sous le nom
  `modele-import-voyage-capnomade.csv`. Plus de problème d'apostrophes et UX
  bien meilleure pour les utilisateurs qui n'ont pas de fichier sous la main.
- **2026-05-16 · Import voyages passés (commit n°18)** — nouvelle feature majeure
  sur `/voyages` : bouton "Importer un voyage passé" ouvre un modal large qui
  accepte `.xlsx`/`.xls`/`.csv` (5 Mo max). L'analyse côté serveur :
  1. **Extracteur** `src/lib/imports/pastTripExtractor.ts` — réutilise
     `excelWizard.ts` pour la détection auto de l'en-tête de tableau de dépenses
     (Libellé/Type/Montant/Devise/Date/Ville, n'importe où dans la feuille), parse
     toutes les feuilles d'un classeur, fallback CSV avec détection automatique
     du délimiteur (`,`/`;`/`\t`).
  2. **Synthèse intelligente** : titre dérivé du nom de fichier, dates start/end
     calculées comme min/max des dates de dépenses, devise dominante détectée,
     budget total = somme des dépenses, étapes uniques extraites des villes,
     transports classifiés (plane/train/bus/ferry/car) via heuristique sur le
     libellé (regex sur "vol", "TGV", "Flixbus"…), origine/destination parsées
     du libellé via pattern "X → Y" / "X to Y".
  3. **Server actions** `src/server/actions/importTrip.ts` :
     `analyzePastTripAction(FormData)` → renvoie `ExtractedTripData` ;
     `confirmImportedTripAction(input)` → insère trip (status='completed') +
     trip_stops + transport_segments + expenses dans la même transaction (avec
     map name→id pour lier les dépenses aux stops).
  4. **Modal de validation** `ImportPastTripDialog.tsx` — Dialog max-w-3xl
     scrollable, 2 phases (upload → validate). Phase 2 : champs méta éditables
     (titre/dates/devise/pays ISO2), liste de stops/transports/dépenses tous
     cochables individuellement, tableau de dépenses scrollable avec sticky
     header. Boutons "Tout cocher / décocher" pour les dépenses.
  5. À la confirmation : crée le voyage, redirige vers `/voyages/[slug]`,
     revalide `/voyages` et `/dashboard`.
- **2026-05-16 · mockup HTML navigable (commit n°17)** — `public/mockup.html` :
  un seul fichier HTML autonome avec routeur hash-based, Tailwind via CDN,
  fonts Inter+Fraunces, logo SVG fidèle à la maquette. **13 routes
  navigables** : landing complète (hero + features + comparaison Excel + CTA + footer),
  connexion, inscription, fonctionnalités, pourquoi-quitter-excel,
  confidentialité, dashboard (welcome + map mondiale + 11 stats + 4 widgets + recent),
  mes voyages, voyages planifiés, **détail voyage Bali** (8 onglets cliquables —
  planning timeline, dépenses, transports, logements, médias, carte, équipe,
  notation post-voyage avec sliders), détail voyage Japon, envies, invitations,
  paramètres, nouveau voyage, 404. Accessible localement via `open public/mockup.html`
  ou en ligne via `https://<domaine>/mockup.html` une fois déployé.
- **2026-05-16 · `public/` + vercel.json (commit n°16)** — **build Next.js 100% OK**
  (compile, lint, types, page data collection, 16/16 static pages, traces) mais
  Vercel échouait en post-build avec "No Output Directory named 'public' found".
  Vercel exige la présence d'un dossier `public/` même vide (pour les assets
  statiques). Fix : `public/.gitkeep` + `vercel.json` explicite (framework: nextjs,
  region cdg1 pour Paris). Le dossier est aussi prêt à accueillir le `logo.png`
  exact pour remplacer le SVG inline.
  **Routes générées** : 26 routes au total — 10 statiques (`/`, `/fonctionnalites`,
  `/pourquoi-quitter-excel`, `/confidentialite`, `/conditions`, `/mot-de-passe-oublie`,
  `/reinitialisation`, `/sitemap.xml`, `/robots.txt`, `/_not-found`), 16 dynamiques
  (dashboard, voyages, auth, api, server actions). First Load JS shared = 102 kB.
- **2026-05-16 · SignInButton sans useSearchParams (commit n°15)** —
  Static generation de `/fonctionnalites` (et autres pages publiques) plantait :
  `SignInButton` appelait `useSearchParams()`, ce qui force chaque consommateur
  à être wrappé dans `<Suspense>`. Fix : la lecture du `?redirect=` est faite
  via `new URLSearchParams(window.location.search)` au moment du clic, plus
  via le hook. Plus de hook = plus de contrainte Suspense, les pages publiques
  restent pré-rendues statiquement.
- **2026-05-16 · env build-safe (commit n°14)** — "Collecting page data" plantait
  parce que `lib/env.ts` parsait Zod à l'import et Vercel n'avait pas encore
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_APP_URL`.
  Deux niveaux de fix : (a) chaque champ public a un `.default(...)` placeholder
  (URL localhost + clé fake) qui permet au build de passer ; (b) `publicEnvironment`
  est exposée via un Proxy lazy qui n'invoque `loadPublicEnv()` qu'au premier accès
  property. Au runtime, les vraies env vars Vercel prennent le dessus. À noter :
  pour que l'app fonctionne en prod, il faut configurer côté Vercel :
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_APP_URL`, et éventuellement `RESEND_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY`,
  les tiles MapLibre…
- **2026-05-16 · authzToResult générique (commit n°13)** — l'helper retournait
  `ActionResult<unknown>` (par défaut) mais `duplicateTripAction` renvoie
  `ActionResult<{ slug: string }>`. Fix : `authzToResult<T = unknown>(e): ActionResult<T>`,
  TS infère T du contexte d'appel.
- **2026-05-16 · Type setAll cookies (commit n°12)** — conséquence du drop de
  `<Database>` au commit n°10 : sans le générique, les callbacks `setAll`/`getAll`
  passés à `createServerClient` perdent leur inférence, et `cookiesToSet` est
  `any` implicite (rejeté par strict mode). Type alias `CookieToSet =
  { name; value; options: CookieOptions }` ajouté dans `middleware.ts` et
  `server.ts` (preventive sur le 2ᵉ pour éviter le prochain build à vide).
- **2026-05-16 · switch type-safe dans tripStats (commit n°11)** — vraie erreur
  TS (pas Supabase) : avec `noUncheckedIndexedAccess: true`, `TYPE_TO_FIELD[exp.type]`
  retournait `keyof TripStats['totals'] | undefined`, et `(totals as Record<...>)[field]`
  retournait `number | undefined` qu'on ne pouvait pas `+=`. Remplacement du lookup
  par un `switch` exhaustif sur `exp.type` — plus lisible, totalement type-safe,
  pas besoin du cast Record.
- **2026-05-16 · Drop `<Database>` + logo brand (commit n°10)** — 2 livraisons :
  1. **Build fix nucléaire** : suppression du générique `<Database>` dans les 4
     `createClient` calls (server/browser/admin/middleware). Aucune variation de mon
     `Database` type fait-main ne satisfaisait les contraintes internes de supabase-js
     (`.insert(...)` collapsait à `never[]`). Sans le générique, les queries renvoient
     `any` côté Supabase et les casts `asRow<T>` / `asRows<T>` font le typage explicite
     au call site. Defense-in-depth via Zod schemas + NOT NULL constraints + RLS reste
     en place.
  2. **Logo** : nouveau composant `src/components/brand/Logo.tsx` (`LogoMark` /
     `LogoWordmark` / `Logo`) en SVG, fidèle à la maquette (cercle + globe stylisé
     teal + montagnes + trajet d'avion pointillé + pin coral, wordmark "Cap" navy +
     "Nomade" teal). Utilisé dans header marketing, sidebar dashboard, footer. Favicon
     dynamique via `app/icon.tsx` (Edge runtime + ImageResponse). Pour la version
     PNG exacte : drop le fichier sur `public/logo.png` et swap le SVG via `next/image`.
- **2026-05-16 · Simplifier TableShape (commit n°9)** —
  `.insert({...})` collapsait à `never[]` parce que mon `TableShape<R, K>` avec
  `Insert: Partial<R> & Pick<R, K>` ne satisfaisait pas les contraintes
  génériques internes de supabase-js (l'intersection cassait l'inférence des
  overloads). Simplification : `Insert: Partial<R>` (plus de générique K).
  La validation des champs requis se fait via Zod dans les server actions
  (défense en profondeur : Zod + NOT NULL en BDD + RLS).
- **2026-05-16 · session.ts cast (commit n°8)** — `profile.email` collapsait à
  `never` dans `getSession`. Le refactor du Database type au commit n°5 n'a
  apparemment pas résolu tous les cas d'inférence — peut-être le helper
  `TableShape<Row, ...>` interfère avec l'auto-inférence de supabase-js.
  Fix : `asRow<Profile>(resp)` pour casser explicitement. Audit grep de tous
  les autres call sites Supabase → tous déjà castés (Auth methods incluses).
- **2026-05-16 · MapLibre 4.x API (commit n°7)** — `attributionControl: true`
  n'est plus valide en MapLibre 4.x : le type accepte `false | AttributionControlOptions`.
  Suppression de la ligne (le défaut affiche déjà l'attribution).
- **2026-05-16 · Email auth + fix devise (commit n°6)** — 2 choses :
  1. **Build error** : `parametres/page.tsx` passait `session.profile.default_currency` (typé
     `string` depuis la DB) à un form dont le prop attendait l'enum
     `'EUR' | 'USD' | ...`. Fix : `ProfileForm` accepte maintenant `default_currency: string`
     et normalise vers le set de devises supportées au moment du `defaultValues`.
  2. **Nouvelle feature** : système email+password complet en complément de Google OAuth.
     Pages publiques `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`,
     toutes avec formulaires Zod+RHF, gestion du flow de confirmation email Supabase,
     redirection auto si déjà connecté, anti-énumération sur le forgot-password.
     Header marketing pointe vers `/connexion` et `/inscription`, hero CTA propose les
     deux options. Middleware redirige les routes protégées vers `/connexion?redirect=...`
     au lieu de `/?signin=1`. Tests Playwright et sitemap mis à jour.
- **2026-05-16 · TS Vercel root cause (commit n°5)** — `wishes.id` (et toute
  query Supabase) collapsait à `never` à cause de mon `Database` type qui
  manquait `Relationships: []` sur chaque table et `CompositeTypes` sur le
  schéma. Refactor `src/lib/types/database.ts` avec un helper `TableShape<Row, K>`
  qui ajoute `Relationships: []` à toutes les tables + ajout de
  `CompositeTypes: Record<string, never>`. En filet de sécurité : cast `asRow`/
  `asRows` ajouté sur 7 call sites restants (envies/page, auth/callback,
  api/.../expenses.csv, api/.../geojson, server/actions/{invitations, trips,
  reviews, expenses}).
- **2026-05-16 · TS Vercel (commit n°4)** — sur les 11 queries Supabase utilisant
  `!inner` join syntax, l'inférence de types collapsait à `never` parce que mon
  `Database` type ne déclare pas `Relationships`. Ajout de `src/lib/supabase/helpers.ts`
  (`asRow<T>`, `asRows<T>`) et typage explicite des résultats dans :
  dashboard/page, voyages/page, voyages/planifies/page, voyages/[slug]/page,
  invitations/page, auth/permissions, stats/globalStats, stats/tripStats,
  server/actions/expenses. Bonus : assertTripAccessBySlug simplifié (fallback
  `.or(...)` retiré, qui ne marchait pas).
- **2026-05-16 · lint Vercel (commit n°3)** — 9 erreurs ESLint qui bloquaient le build :
  imports inutilisés (`formatDateRange`, `CopyIcon/Share2/Archive`, `TransportMode`),
  `let` non réassignés → `const` (`used` dans `expenseSplit`), `<a>` → `<Link>` dans
  `error.tsx`, arg unused → préfixe `_` dans `TripPlanning`, et passage à
  `import type { ZodError }` dans `server/actions/trips.ts`. Plus nettoyage des
  `any` du dashboard `page.tsx`.
- **2026-05-16 · build Vercel (commit n°2)** — `src/server/actions/onboarding.ts` extrait
  hors de `src/app/auth/onboarding/page.tsx`. Cause : Next 15 interdit d'exporter à la
  fois `metadata` et une inline server action `'use server'` depuis un fichier
  importé par un Client Component (`OnboardingForm.tsx`). Bonus : `typedRoutes`
  déplacé d'`experimental` vers le top-level (Next 15.5+).

---

## Détail par vague

### Vague 1 — Configs racine ✅

`package.json`, `tsconfig.json` (strict + `noUncheckedIndexedAccess`), `next.config.ts`
(headers de sécurité + noindex sur `/dashboard|/api`), `tailwind.config.ts` (palette
ocean/sand/lagoon/coral + plugin animate), `postcss.config.mjs`, `.eslintrc.json`,
`.prettierrc`, `.gitignore`, `.env.example` (commenté par sections), `README.md`,
`vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`.

### Vague 2 — Schéma SQL + seed ✅

- `supabase/migrations/0001_init_schema.sql` — extensions `pgcrypto/citext/postgis`,
  enums métier, 22 tables (profiles, trips, trip_members, trip_invitations, trip_stops,
  trip_days, activities, accommodations, transport_segments, expenses, expense_allocations,
  expense_payments, attachments, media_links, map_imports, map_features, trip_reviews,
  wish_items, notifications, destination_insights, trip_stats_snapshots, audit_logs),
  contraintes, indexes GIST.
- `0002_functions_triggers.sql` — triggers `updated_at`, auto-création de profil sur
  signup auth, auto-ajout owner dans trip_members, helpers permissions `is_trip_*`,
  RPC `accept_trip_invitation` / `decline_trip_invitation` (security definer, audit log),
  `slugify`, storage buckets (`trip-covers` public, `trip-attachments` privé,
  `map-sources` privé).
- `0003_rls_policies.sql` — RLS sur **toutes** les tables, policies par rôle
  (owner/editor/viewer), policies storage extrayant le `trip_id` depuis le path
  d'objet.
- `seed.sql` — 2 utilisateurs (demo + amie), voyage Bali réalisé avec dépenses + review,
  voyage Japon planning, wish Patagonie, notification de bienvenue.

### Vague 3 — Auth & permissions ✅

- `src/lib/env.ts` — validation Zod du `.env`, scission public/server.
- `src/lib/supabase/{server,browser,middleware,admin}.ts` — clients par contexte.
- `src/middleware.ts` — refresh session + redirection si non authentifié + CSP.
- `src/app/auth/callback/route.ts` — exchange OAuth, sanitize next-redirect, détection
  premier login → `/auth/onboarding`.
- `src/app/auth/signout/route.ts`.
- `src/app/auth/onboarding/{page,OnboardingForm}.tsx` — formulaire 3 champs (nom, devise,
  fuseau) avec Zod + RHF.
- `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts` — `requireSession`,
  `assertTripAccess`, `assertTripAccessBySlug`, `AuthorizationError` typée.

### Vague 4 — UI primitives ✅

`button`, `card`, `input`, `label`, `textarea`, `select`, `dialog`, `dropdown-menu`,
`badge`, `avatar`, `separator`, `skeleton`, `tabs`, `toaster` (sonner), `empty-state`,
`google-icon`. `globals.css` avec variables HSL light + dark, root `layout.tsx`
configurant les fonts Inter+Fraunces + ThemeProvider + metadata Open Graph + Twitter.
Header & footer marketing + ThemeToggle.

### Vague 5 — Pages publiques (SEO) ✅

- Landing `/` : Hero ("Vos voyages, planifiés à plusieurs, sans le chaos d'Excel"),
  FeaturesGrid (10 cartes), ProductScreenshots (4 mockups), ExcelVsCapNomade (tableau),
  SeoContent (texte naturel), CtaSection, **JSON-LD WebSite + SoftwareApplication**.
- `/fonctionnalites`, `/pourquoi-quitter-excel`, `/confidentialite`, `/conditions`.
- `sitemap.ts`, `robots.ts` (disallow `/dashboard|/voyages|/envies|/invitations|/parametres|/auth|/api`).
- Metadata par page : title, description, canonical, OG, Twitter card.

### Vague 6 — Dashboard et voyages ✅

- Layout dashboard avec sidebar, topbar (notifs, nouveau voyage, user menu, theme toggle).
- `/dashboard` : hero "Quel sera le prochain voyage ?", bloc prochain voyage avec
  jours restants, **WorldMap MapLibre** interactive (style configurable via env, fallback
  OpenStreetMap), 11 tuiles de stats, 4 widgets (réalisés / planifiés / envies /
  invitations), récemment modifié, encart conseils.
- `/voyages`, `/voyages/planifies`, `/voyages/nouveau` (formulaire RHF+Zod).
- `/voyages/[slug]` : page détail avec **8 onglets** (Planning, Dépenses, Transports,
  Logements, Médias, Carte, Équipe, Notation) + **CompleteTripDialog** (modal de
  notation post-voyage avec 8 critères) + TripActions (copier lien, dupliquer,
  archiver, supprimer).
- `/invitations` (accept/decline avec deep-link `?token=...` côté composant).
- `/envies`, `/parametres` (ProfileForm).
- Server actions : `trips.ts` (5 actions + slug unique + audit log), `expenses.ts`
  (split intégré, audit log pour dépenses > 200 €), `invitations.ts` (idempotence,
  email Resend, RPC accept/decline), `reviews.ts` (auto-transition vers `completed`),
  `profile.ts`.

### Vague 7 — Services métier ✅

- `lib/stats/globalStats.ts` — pays visités, vols cumulés, km voiture, CO₂, dépenses
  par voyage / par jour / par personne, top pays, top catégories, timeline annuelle.
- `lib/stats/tripStats.ts` — totaux par catégorie d'un voyage + transport agrégé.
- `lib/stats/expenseSplit.ts` — pure fns : `computeSplit` (equal/percentage/fixed/custom
  avec gestion d'arrondi à 1 cent), `computeBalances`, `settleBalances` (greedy debt
  simplification).
- `lib/carbon/index.ts` — multi-source (Travel Impact Model en hook, distance_factor
  par défaut, RF aviation = 1.9, hauteur configurable via env), `haversineKm`.
- `lib/imports/` — `kml`, `kmz` (JSZip), `gpx`, `geojson`, `csv` (parser maison avec
  guillemets), **`excelWizard.ts`** (lecture xlsx, auto-détection zones planning et
  dépenses, mapping de colonnes).
- `lib/exports/` — `csv`, `geojson`, `ics`, `pdfTripSummary` (pdf-lib).
- `lib/email/{resend,sendInvitationEmail}.ts` — wrapper + template HTML invitations
  inline-styled, idempotent (header `X-Entity-Ref-ID`).
- `lib/google/{geocoding,routes}.ts` — server-only, dégradation propre si pas de clé.
- `lib/insights/provider.ts` — pattern provider (`disabled`, `openai`), payload typé,
  cache via table `destination_insights`.
- `lib/notifications/index.ts` — `pushNotification`, `markAllNotificationsRead`.
- Routes API : `/api/voyages/[slug]/export/expenses.csv`, `/api/voyages/[slug]/export/geojson`.

### Vague 8 — Tests ✅ (couverture initiale)

- `tests/setup.ts` — env de test.
- Vitest : `expenseSplit.test.ts` (equal, percentage, fixed, pipeline balances+settle),
  `carbon.test.ts` (Haversine CDG→HND, long-haul, fallback `other`, car>train),
  `imports.test.ts` (GeoJSON, CSV avec delimiter auto, KML Point, GPX track+waypoint),
  `utils.test.ts` (slugify accents, formatCurrency, formatDateRange).
- Playwright : `landing.spec.ts` (hero, features, headers privés), `auth.spec.ts`
  (gating dashboard, sitemap, robots).

---

## Reste à faire — prochaines vagues

| Pri | Item | Notes |
| --- | ---- | ----- |
| P1 | Page `/voyages/[slug]/parametres` | UI d'édition (l'action `updateTripAction` existe) |
| P1 | Page `/voyages/[slug]/depenses` CRUD complet | UI tableau filtrable + formulaire d'ajout |
| P2 | Page `/voyages/[slug]/carte` plein écran | Réutiliser `WorldMap` + segments + features |
| P2 | Page `/import` wizard 3 étapes | upload → preview Excel/map → confirm |
| P3 | UI Insights destination + bouton "Regénérer" | Provider et table prêts |
| P3 | `/api/account/export` + `/api/account/delete` | Référencés dans `parametres` |
| P3 | Page `/voyages/[slug]/transports` | UI d'ajout + auto-CO₂ via `carbon` |
| P3 | Drag & drop sur planning jour par jour | Activités déplaçables entre jours |
| P3 | Notifications dashboard popover | Liste + markAllRead |

---

## Comment installer & lancer

```bash
npm install
cp .env.example .env.local        # remplir Supabase + Google + Resend
npm run db:start                  # Docker Supabase local
npm run db:reset                  # migrations + seed
npm run db:types                  # regénère src/lib/types/database.ts
npm run dev
```

Tests :

```bash
npm run test       # Vitest
npm run test:e2e   # Playwright
```
